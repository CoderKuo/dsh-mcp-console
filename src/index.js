/**
 * dsh-mcp-console — manage the MCP servers of a DeepSeek Harness profile.
 *
 * The plugin reads the profile's `@deepseek-ai/dsh-mcp-client` rows and their
 * observable state, switches rows on and off through the Plugin Manager, and
 * opens ordinary Sessions for the two AI-assisted flows: installing an MCP
 * server from a repository, package, image, or page, and researching what
 * local software could be connected. It never edits the profile's own patch:
 * every server it adds (imported, added by hand, or installed by an agent
 * with the person's approval) arrives as a configuration-only bundle
 * installed through the Plugin Manager.
 *
 * @module dsh-mcp-console
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import z from '@deepseek-ai/schemastery'

import { CHANNEL, DEFAULT_AGENT_PRESET, DEFAULT_SCAN_TIMEOUT_MS, DEFAULT_TEST_TIMEOUT_MS, MCP_MODULE, PLUGIN_ID, PLUGIN_VERSION, REMOTE_TEST_TIMEOUT_MS } from './constants.js'
import { createChangeFeed } from './changes.js'
import { createRunner, inventoryText, scanLocal } from './discovery.js'
import { parsePatch, readServerForm, updateServer } from './editor.js'
import { exportServers } from './exporter.js'
import { importClientServer, installConfigBundle } from './importer.js'
import { manualConfig } from './manual.js'
import { checkEnvironment, detectRuntimes, probeServer } from './probe.js'
import { DEFAULT_REGISTRY_URL, searchRegistry } from './registry.js'
import { listModelChoices } from './models.js'
import { connectSettings, fieldValue, live } from './preferences.js'
import { discoveryPrompt, quickAddPrompt } from './prompts.js'
import { createConsoleRpc } from './rpc.js'
import { deleteServer, listServers, normalizeRepository, readMcpRows, setServerEnabled } from './servers.js'
import { openPromptSession, pickedModel } from './sessions.js'

export const name = PLUGIN_ID
/**
 * Nothing is mandatory: every service is looked up when an endpoint needs it,
 * so a profile without one (a headless run, a profile without the Plugin
 * Manager) still loads the plugin and its page says what is missing.
 */
export const inject = []

export const Config = z.object({
  /** Agent preset of the AI sessions; `cordis` (Creator mode) can install bundles. */
  agentPreset: live(z.string().default(DEFAULT_AGENT_PRESET)),
  /** Where the agent writes configuration bundles; empty means `<DSH_HOME>/mcp-bundles`. */
  bundleDirectory: z.string().default(''),
  /** Bound on one local discovery command, in milliseconds. */
  scanTimeoutMs: z.natural().min(1000).default(DEFAULT_SCAN_TIMEOUT_MS),
  /** Bound on trying a local server before it is added, in milliseconds. */
  testTimeoutMs: z.natural().min(5000).default(DEFAULT_TEST_TIMEOUT_MS),
  /** The MCP Registry searched from the page. */
  registryUrl: z.string().default(DEFAULT_REGISTRY_URL),
  /** Repository links the person set for rows, by row id. */
  repositories: live(z.dict(z.string()).default({})),
})

export function apply(ctx, config) {
  let source = () => ({
    agentPreset: fieldValue(config?.agentPreset),
    repositories: fieldValue(config?.repositories),
  })
  const preference = { writable: false, set: undefined }
  ctx.inject(['settings'], settingsCtx => connectSettings(settingsCtx, {
    ctx,
    Config,
    namespace: PLUGIN_ID,
    source: () => source(),
    setSource: next => { source = next },
    preference,
  }))

  const service = key => {
    try {
      return ctx.get(key)
    } catch {
      return undefined
    }
  }
  const profile = () => service('profileContext')
  const dshHome = () => profile()?.home
    ?? (typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME !== '' ? process.env.DSH_HOME : join(homedir(), '.dsh'))
  const bundleDir = () => (typeof config?.bundleDirectory === 'string' && config.bundleDirectory.trim() !== ''
    ? config.bundleDirectory.trim()
    : join(dshHome(), 'mcp-bundles'))
  const configValue = key => (typeof config?.[key] === 'string' || typeof config?.[key] === 'number' ? config[key] : undefined)
  const repositories = () => {
    const value = fieldValue((source() ?? {}).repositories)
    return value !== null && typeof value === 'object' ? value : {}
  }
  const existingNames = () => readMcpRows(service('loader'))
    .map(row => row.config?.serverName)
    .filter(item => typeof item === 'string')

  const openSession = (title, text, signal, model) => openPromptSession({
    sessionController: service('sessionController'),
    workspaceRegistry: service('workspaceRegistry'),
    agentDefaultModel: service('agentDefaultModel'),
    agentPreset: fieldValue((source() ?? {}).agentPreset) ?? DEFAULT_AGENT_PRESET,
    model: pickedModel(model),
    title,
    text,
    signal,
  })

  /**
   * What the page waits on: the tool registry and the Plugin Manager announce
   * the changes it shows, so the page refreshes on them instead of polling.
   */
  const changes = createChangeFeed()
  ctx.on?.('tools/change', () => changes.bump())
  ctx.on?.('plugin-manager/changed', () => changes.bump())
  ctx.effect(() => () => changes.close(), 'mcp-console: change feed')
  /** Run an action that changes the list, then announce it. */
  const changing = async action => {
    try {
      return await action()
    } finally {
      changes.bump()
    }
  }

  /**
   * The last local scan. It describes the machine, not the profile, so it is
   * kept in one file under DSH_HOME and survives leaving the page and
   * restarting; the AI analysis reuses it rather than scanning twice.
   */
  let lastScan
  const scanFile = () => join(dshHome(), 'storages', 'dsh-mcp-console', 'last-scan.json')
  const loadLastScan = async () => {
    if (lastScan !== undefined) return lastScan
    try {
      const saved = JSON.parse(await readFile(scanFile(), 'utf8'))
      if (saved !== null && typeof saved === 'object' && typeof saved.scannedAt === 'number') lastScan = saved
    } catch {
      // No scan yet, or an unreadable file: the page offers a fresh scan.
    }
    return lastScan
  }
  const saveLastScan = async scan => {
    const file = scanFile()
    try {
      await mkdir(dirname(file), { recursive: true })
      const temp = `${file}.${process.pid}.tmp`
      await writeFile(temp, JSON.stringify(scan), 'utf8')
      await rename(temp, file)
    } catch (error) {
      ctx.logger?.warn?.('mcp-console: could not save the scan result: %s', error.message)
    }
  }
  const withSize = scan => (scan === undefined ? null : { ...scan, inventoryChars: inventoryText(scan).length })

  /** The config of one row of an installed bundle, read from its patch (for a switched-off bundle). */
  const readBundleConfig = async (bundleName, rowId) => {
    const dir = profile()?.dir
    if (typeof dir !== 'string') return undefined
    const packageDir = join(dir, 'node_modules', ...bundleName.split('/'))
    const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8'))
    const patchName = manifest?.dsh?.bundle?.patch
    if (typeof patchName !== 'string') return undefined
    const patch = parsePatch(await readFile(join(packageDir, patchName), 'utf8'))
    for (const operation of Array.isArray(patch) ? patch : []) {
      for (const row of Array.isArray(operation?.insert) ? operation.insert : []) {
        if (row?.id === rowId && row?.name === MCP_MODULE) return row.config
      }
    }
    return undefined
  }

  /** Runtimes found on the host's PATH, kept for a minute. */
  let runtimeCache
  const runtimes = async refresh => {
    if (!refresh && runtimeCache !== undefined && Date.now() - runtimeCache.at < 60_000) return runtimeCache.value
    const value = await detectRuntimes(service('subprocess'), createRunner(service('subprocess'), { timeoutMs: 10_000 }))
    runtimeCache = { at: Date.now(), value }
    return value
  }

  /** A form's config for a test: the name may still be empty, and kept expressions are left out. */
  const testConfig = form => manualConfig({
    ...form,
    name: typeof form.name === 'string' && /^[A-Za-z0-9_-]{1,32}$/u.test(form.name.trim()) ? form.name : 'test',
    env: (form.env ?? []).filter(item => item?.expression !== true),
    headers: (form.headers ?? []).filter(item => item?.expression !== true),
  })

  const handler = createConsoleRpc({
    status: async () => ({
      ...(await listServers({
        loader: service('loader'),
        tools: service('tools'),
        pluginManager: service('pluginManager'),
        profileDir: profile()?.dir,
        repositories: repositories(),
        readBundleConfig,
      })),
      sessions: service('sessionController') !== undefined,
      writable: preference.writable === true,
      bundleDir: bundleDir(),
      version: PLUGIN_VERSION,
      revision: changes.current(),
    }),
    toggle: (entryId, enabled) => changing(() => setServerEnabled(service('pluginManager'), entryId, enabled)),
    remove: entryId => changing(() => deleteServer({ pluginManager: service('pluginManager'), entryId, profileDir: profile()?.dir, bundleDir: bundleDir() })),
    importServer: ({ client, name }) => changing(() => importClientServer({ pluginManager: service('pluginManager'), client, name, existingNames: existingNames(), bundleDir: bundleDir() })),
    addServer: request => changing(() => {
      const config = manualConfig(request, existingNames())
      const what = config.transport === 'stdio' ? config.command : config.url
      return installConfigBundle({ pluginManager: service('pluginManager'), config, bundleDir: bundleDir(), description: `MCP server "${config.serverName}" (${what}) added by hand`, origin: 'Added by hand' })
    }),
    testServer: (form, signal) => {
      const config = testConfig(form)
      const local = configValue('testTimeoutMs') ?? DEFAULT_TEST_TIMEOUT_MS
      // mcp-remote may wait for an OAuth sign-in in the browser.
      const timeoutMs = config.transport !== 'stdio' ? REMOTE_TEST_TIMEOUT_MS : config.args?.[1] === 'mcp-remote' ? Math.max(local, 120_000) : local
      return probeServer(config, { subprocess: service('subprocess'), timeoutMs, signal })
    },
    serverForm: entryId => readServerForm({ pluginManager: service('pluginManager'), entryId, profileDir: profile()?.dir, bundleDir: bundleDir() }),
    updateServer: (entryId, form) => changing(() => updateServer({
      pluginManager: service('pluginManager'),
      entryId,
      request: form,
      existingNames: existingNames(),
      profileDir: profile()?.dir,
      bundleDir: bundleDir(),
    })),
    exportServers: async () => exportServers(readMcpRows(service('loader'))),
    checkEnv: names => checkEnvironment(names),
    runtimes,
    searchRegistry: ({ query, cursor }, signal) => searchRegistry({ query, cursor, baseUrl: configValue('registryUrl') || DEFAULT_REGISTRY_URL, signal }),
    wait: ({ revision }, signal) => changes.wait(revision, { signal }),
    setRepository: async (rowId, url) => {
      if (rowId === '') throw new Error('MCP console: unknown server')
      if (preference.writable !== true) throw new Error('MCP console: settings are not writable in this profile')
      const normalized = url.trim() === '' ? undefined : normalizeRepository(url)
      if (url.trim() !== '' && normalized === undefined) throw new Error('MCP console: enter an http(s) repository URL')
      const next = { ...repositories() }
      if (normalized === undefined) delete next[rowId]
      else next[rowId] = normalized
      await preference.set({ repositories: next })
      return { rowId, ...(normalized === undefined ? {} : { repository: normalized }) }
    },
    models: () => listModelChoices({ llm: service('llm'), agentDefaultModel: service('agentDefaultModel') }),
    quickAdd: ({ source, notes, locale, model }, signal) => openSession(
      locale === 'en' ? `Install MCP: ${source.label}` : `安装 MCP：${source.label}`,
      quickAddPrompt({ source, notes, existingNames: existingNames(), bundleDir: bundleDir(), locale }),
      signal,
      model,
    ),
    scan: async signal => {
      const run = createRunner(service('subprocess'), { timeoutMs: config?.scanTimeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS })
      signal?.throwIfAborted?.()
      lastScan = { ...(await scanLocal({ run })), runtimes: await runtimes(true).catch(() => undefined) }
      await saveLastScan(lastScan)
      return withSize(lastScan)
    },
    lastScan: async () => withSize(await loadLastScan()),
    analyze: async ({ locale, model }, signal) => {
      if ((await loadLastScan()) === undefined) throw new Error('MCP console: scan this computer first')
      return openSession(
        locale === 'en' ? 'Find MCP-capable software' : '检索可接入 MCP 的本机软件',
        discoveryPrompt({ inventory: inventoryText(lastScan), existingNames: existingNames(), bundleDir: bundleDir(), locale }),
        signal,
        model,
      )
    },
  })

  ctx.inject(['connection', 'webServer'], connectionCtx => {
    const connection = connectionCtx.connection
    // Register with this plugin's own injected scope, like other profile plugins
    // does, so a first hot install mounts the channel; fall back to the
    // public `rpc.handle` on Connection implementations without it.
    connectionCtx.effect(
      () => typeof connection.register === 'function'
        ? connection.register(connectionCtx, CHANNEL, handler)
        : connection.rpc.handle(CHANNEL, handler),
      'mcp-console: loopback RPC',
    )
  })
}

export { acceptRepositoryUrl, createConsoleRpc } from './rpc.js'
export { clientConfigPaths, createRunner, inventoryText, parseClientServers, readClientServers, scanLocal } from './discovery.js'
export { discoveryPrompt, quickAddPrompt } from './prompts.js'
export { MASK, redactArgs, redactConfig, redactMap } from './redact.js'
export { bundleSourceDir, deleteServer, isInside, listServers, normalizeRepository, readMcpRows, serverStatus, setServerEnabled, toolPrefix, toolsByServer } from './servers.js'
export { createChangeFeed } from './changes.js'
export { bundleFiles, flowYaml, importClientServer, installConfigBundle, readClientServer, serverNameFor, toMcpClientConfig } from './importer.js'
export { environmentExpression, joinCommandLine, manualConfig, splitCommandLine } from './manual.js'
export { configToForm, parsePatch, readServerForm, updateServer, valueToPair } from './editor.js'
export { exportServers } from './exporter.js'
export { checkEnvironment, detectRuntimes, probeHttp, probeServer, probeStdio, resolveValue, runtimeOf } from './probe.js'
export { registryOptions, registryResult, searchRegistry, suggestName } from './registry.js'
export { classifySource } from './sources.js'
export { listModelChoices } from './models.js'
export { openPromptSession, pickedModel, resolveDefaultWorkspace, selectSessionModel } from './sessions.js'

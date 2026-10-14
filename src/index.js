/**
 * dsh-mcp-console — manage the MCP servers of a DeepSeek Harness profile.
 *
 * The plugin reads the profile's `@deepseek-ai/dsh-mcp-client` rows and their
 * observable state, switches rows on and off through the Plugin Manager, and
 * opens ordinary Sessions for the two AI-assisted flows: installing an MCP
 * server from a repository, and researching what local software could be
 * connected. It never inserts MCP rows itself; an agent does that by
 * installing a configuration-only bundle with the person's approval.
 *
 * @module dsh-mcp-console
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import z from '@deepseek-ai/schemastery'

import { CHANNEL, DEFAULT_AGENT_PRESET, DEFAULT_SCAN_TIMEOUT_MS, PLUGIN_ID, PLUGIN_VERSION } from './constants.js'
import { createRunner, inventoryText, scanLocal } from './discovery.js'
import { listModelChoices } from './models.js'
import { connectSettings, fieldValue, live } from './preferences.js'
import { discoveryPrompt, quickAddPrompt } from './prompts.js'
import { createConsoleRpc } from './rpc.js'
import { listServers, normalizeRepository, readMcpRows, setServerEnabled } from './servers.js'
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

  const handler = createConsoleRpc({
    status: async () => ({
      ...(await listServers({
        loader: service('loader'),
        tools: service('tools'),
        pluginManager: service('pluginManager'),
        profileDir: profile()?.dir,
        repositories: repositories(),
      })),
      sessions: service('sessionController') !== undefined,
      writable: preference.writable === true,
      bundleDir: bundleDir(),
      version: PLUGIN_VERSION,
    }),
    toggle: (entryId, enabled) => setServerEnabled(service('pluginManager'), entryId, enabled),
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
    quickAdd: ({ repositoryUrl, notes, locale, model }, signal) => {
      const short = repositoryUrl.replace(/^https:\/\/(?:www\.)?github\.com\//u, '')
      return openSession(
        locale === 'en' ? `Install MCP: ${short}` : `安装 MCP：${short}`,
        quickAddPrompt({ repositoryUrl, notes, existingNames: existingNames(), bundleDir: bundleDir(), locale }),
        signal,
        model,
      )
    },
    scan: async signal => {
      const run = createRunner(service('subprocess'), { timeoutMs: config?.scanTimeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS })
      signal?.throwIfAborted?.()
      lastScan = await scanLocal({ run })
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
export { listServers, normalizeRepository, readMcpRows, serverStatus, setServerEnabled, toolPrefix, toolsByServer } from './servers.js'
export { listModelChoices } from './models.js'
export { openPromptSession, pickedModel, resolveDefaultWorkspace, selectSessionModel } from './sessions.js'

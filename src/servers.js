/**
 * The MCP servers of the running profile and their state.
 *
 * Every server is a Loader row naming `@deepseek-ai/dsh-mcp-client`; disabled
 * rows keep their entry, without a fiber. dsh-mcp-client publishes no status,
 * so the state is read from what is observable:
 * - `disabled`  — the row is switched off;
 * - `failed`    — its fiber failed (only with `failOnStartupError: true`);
 * - `connected` — active, with at least one `mcp__<serverName>__*` tool;
 * - `starting`  — loading, or active with no tools yet (a server that failed
 *   its first connection without `failOnStartupError` looks the same, as does
 *   one that offers no tools).
 * Enablement goes through the Plugin Manager, which writes the profile's
 * patch and applies the change in place; rows it cannot address (built into a
 * bundle, duplicated, or outside the profile) are reported read-only with its
 * reason.
 *
 * @module dsh-mcp-console/servers
 */

import { readFile, rm } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

import { FIBER_STATE, MAX_TOOLS_PER_SERVER, MCP_MODULE } from './constants.js'
import { jsExpression, redactConfig } from './redact.js'
import { normalizeRepository } from './repository.js'

export { normalizeRepository }

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The tool-name prefix dsh-mcp-client registers a server's tools under. */
export const toolPrefix = serverName => `mcp__${serverName}__`

/**
 * The state of one row, from its entry and the tools it registered.
 * @param entry - `{ disabled, fiberState }`.
 * @param toolCount - tools registered under the server's prefix.
 * @returns `disabled | failed | connected | starting | stopped`.
 */
export function serverStatus({ disabled, fiberState }, toolCount) {
  if (disabled) return 'disabled'
  if (fiberState === FIBER_STATE.FAILED) return 'failed'
  if (fiberState === FIBER_STATE.ACTIVE) return toolCount > 0 ? 'connected' : 'starting'
  if (fiberState === FIBER_STATE.PENDING || fiberState === FIBER_STATE.LOADING) return 'starting'
  return 'stopped'
}

/**
 * Read the MCP rows of the Loader, disabled ones included.
 * @param loader - `ctx.loader`.
 * @returns `[{ entryId, rowId, config, disabled, fiberState, error? }]`.
 */
export function readMcpRows(loader) {
  const rows = []
  for (const entry of loader?.entries?.() ?? []) {
    if (entry?.options?.name !== MCP_MODULE) continue
    const fiber = entry.fiber
    rows.push({
      entryId: entry.id,
      rowId: entry.options.id,
      config: entry.options.config,
      disabled: entry.disabled === true,
      fiberState: typeof fiber?.state === 'number' ? fiber.state : undefined,
      ...(fiber?.error === undefined ? {} : { error: String(fiber.error?.message ?? fiber.error).slice(0, 400) }),
    })
  }
  return rows
}

/** Group registered tool names by MCP server name. */
export function toolsByServer(schemas) {
  const byServer = new Map()
  for (const schema of Array.isArray(schemas) ? schemas : []) {
    const name = typeof schema?.name === 'string' ? schema.name : undefined
    const match = name === undefined ? null : /^mcp__([A-Za-z0-9_-]{1,32})__(.+)$/u.exec(name)
    if (match === null) continue
    const list = byServer.get(match[1]) ?? []
    list.push(match[2])
    byServer.set(match[1], list)
  }
  return byServer
}

/** The repository a bundle's manifest names, read from the profile's install. */
async function bundleRepository(profileDir, bundleName) {
  if (typeof profileDir !== 'string' || typeof bundleName !== 'string') return undefined
  try {
    const manifest = JSON.parse(await readFile(join(profileDir, 'node_modules', ...bundleName.split('/'), 'package.json'), 'utf8'))
    return normalizeRepository(manifest.repository) ?? normalizeRepository(manifest.homepage)
  } catch {
    return undefined
  }
}

/**
 * The server list the page shows.
 * @param options - the services it reads; any may be absent in a headless profile.
 * @returns `{ servers, manageable }`.
 */
export async function listServers({ loader, tools, pluginManager, profileDir, repositories = {} }) {
  const rows = readMcpRows(loader)
  const byServer = toolsByServer(typeof tools?.schemas === 'function' ? tools.schemas() : [])
  let plugins = []
  let bundles = []
  if (pluginManager !== undefined) {
    ;[plugins, bundles] = await Promise.all([
      pluginManager.listPlugins().catch(() => []),
      pluginManager.listBundles().catch(() => []),
    ])
  }
  const bundleOf = new Map()
  for (const bundle of bundles) {
    for (const row of bundle?.rows ?? []) {
      if (typeof row?.entryId === 'string') bundleOf.set(row.entryId, bundle)
    }
  }

  const servers = await Promise.all(rows.map(async row => {
    const config = redactConfig(row.config)
    const serverName = typeof row.config?.serverName === 'string' ? row.config.serverName : undefined
    const toolNames = serverName === undefined ? [] : byServer.get(serverName) ?? []
    const plugin = plugins.find(item => item?.entryId === row.entryId)
    const bundle = bundleOf.get(row.entryId)
    const repository = normalizeRepository(repositories[row.rowId]) ?? (bundle === undefined ? undefined : await bundleRepository(profileDir, bundle.name))
    return {
      entryId: row.entryId,
      rowId: row.rowId,
      name: serverName ?? (jsExpression(row.config?.serverName) === undefined ? row.rowId : `${row.rowId}`),
      status: serverStatus(row, toolNames.length),
      enabled: !row.disabled,
      config,
      toolCount: toolNames.length,
      tools: toolNames.slice(0, MAX_TOOLS_PER_SERVER),
      ...(row.error === undefined ? {} : { error: row.error }),
      ...(repository === undefined ? {} : { repository }),
      ...(bundle === undefined ? {} : {
        bundle: {
          name: bundle.name,
          ...(bundle.version === undefined ? {} : { version: bundle.version }),
          // How many servers go when the bundle is removed.
          mcpRows: (bundle.rows ?? []).filter(item => item?.moduleName === MCP_MODULE).length,
        },
      }),
      removable: pluginManager !== undefined && bundle?.removable === true,
      ...(plugin?.readOnlyReason === undefined ? {} : { readOnlyReason: plugin.readOnlyReason }),
      toggleable: pluginManager !== undefined && plugin !== undefined && plugin.readOnlyReason === undefined,
    }
  }))
  servers.sort((a, b) => a.name.localeCompare(b.name))
  return { servers, manageable: pluginManager !== undefined }
}

/**
 * Switch one server row on or off through the Plugin Manager.
 * @param pluginManager - `ctx.pluginManager`.
 * @param entryId - the row's Loader entry id.
 * @param enabled - whether it should run.
 * @returns `{ application, warnings? }` from the manager.
 */
export async function setServerEnabled(pluginManager, entryId, enabled) {
  if (pluginManager === undefined) throw new Error('MCP console: the Plugin Manager is not available in this profile')
  if (typeof entryId !== 'string' || entryId === '') throw new Error('MCP console: unknown server')
  const result = await pluginManager.setPluginEnabled(entryId, enabled === true)
  return {
    application: typeof result?.application === 'string' ? result.application : 'applied',
    ...(Array.isArray(result?.warnings) && result.warnings.length > 0 ? { warnings: result.warnings.map(String).slice(0, 5) } : {}),
  }
}

/** Whether `child` lies strictly inside `parent`. */
export function isInside(parent, child) {
  if (typeof parent !== 'string' || typeof child !== 'string' || parent === '' || child === '') return false
  const rel = relative(resolve(parent), resolve(child))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/**
 * The local directory a bundle was installed from, when the profile names one
 * (`file:` or `link:` dependency), resolved against the profile directory.
 */
export async function bundleSourceDir(profileDir, bundleName) {
  try {
    const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
    const spec = manifest?.dependencies?.[bundleName]
    const match = typeof spec === 'string' ? /^(?:file|link):(.+)$/u.exec(spec) : null
    if (match === null || match[1].endsWith('.tgz')) return undefined
    return resolve(profileDir, match[1])
  } catch {
    return undefined
  }
}

/**
 * Remove the bundle a server row comes from, through the Plugin Manager, and
 * delete its source directory when it lies inside the plugin's own bundle
 * directory (where AI quick add and import write). Nothing outside it is
 * ever deleted.
 * @param options - the Plugin Manager, the row's entry id, the profile
 *   directory, and the bundle directory.
 * @returns `{ bundle, application, removedDirectory? }`.
 */
export async function deleteServer({ pluginManager, entryId, profileDir, bundleDir }) {
  if (pluginManager === undefined) throw new Error('MCP console: the Plugin Manager is not available in this profile')
  const bundles = await pluginManager.listBundles()
  const bundle = bundles.find(item => (item?.rows ?? []).some(row => row?.entryId === entryId))
  if (bundle === undefined) throw new Error('MCP console: this server is not provided by a removable bundle; switch it off instead')
  if (bundle.removable !== true) throw new Error('MCP console: this bundle comes with DSH and cannot be removed; switch it off instead')
  // Read before removal: pnpm drops the dependency from the manifest.
  const source = typeof profileDir === 'string' ? await bundleSourceDir(profileDir, bundle.name) : undefined
  const result = await pluginManager.removeBundle(bundle.name)
  let removedDirectory
  if (source !== undefined && isInside(bundleDir, source)) {
    await rm(source, { recursive: true, force: true })
    removedDirectory = source
  }
  return {
    bundle: bundle.name,
    application: typeof result?.application === 'string' ? result.application : 'applied',
    ...(removedDirectory === undefined ? {} : { removedDirectory }),
  }
}

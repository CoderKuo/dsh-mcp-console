/**
 * Import an MCP server another AI client already runs (Claude Desktop, Claude
 * Code, Cursor, Windsurf, VS Code, Codex) into this profile.
 *
 * The page names a client and a server; the host re-reads that client's own
 * file from the fixed list of known locations (never a path from the
 * browser), turns the entry into a `@deepseek-ai/dsh-mcp-client` config, and
 * installs it the documented way: a configuration-only bundle under the
 * plugin's bundle directory, installed with the Plugin Manager's
 * `installBundle`. Environment values and headers are copied as the other
 * client stores them, into a local file of the same machine.
 *
 * @module dsh-mcp-console/importer
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { MCP_MODULE } from './constants.js'
import { clientConfigPaths } from './discovery.js'

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const strings = value => (Array.isArray(value) ? value.filter(item => typeof item === 'string') : [])
const stringMap = value => (record(value) ? Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string')) : {})

/** One full server entry from a JSON client file. */
function jsonEntry(text, name) {
  const parsed = JSON.parse(text)
  const maps = [parsed?.mcpServers, parsed?.servers, parsed?.mcp?.servers]
  if (record(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers)
  for (const map of maps) {
    if (record(map) && record(map[name])) return map[name]
  }
  return undefined
}

/** One full server entry from Codex's `config.toml` (strings, string arrays, and the env table). */
function tomlEntry(text, name) {
  const value = raw => {
    const trimmed = raw.trim()
    if (trimmed.startsWith('"')) return JSON.parse(trimmed)
    if (trimmed.startsWith("'")) return trimmed.slice(1, trimmed.lastIndexOf("'"))
    if (trimmed.startsWith('[')) return [...trimmed.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/gu)].map(match => (match[1] === undefined ? match[2] : JSON.parse(`"${match[1]}"`)))
    return undefined
  }
  const entry = {}
  let target
  for (const line of text.split(/\r?\n/u)) {
    const header = /^\s*\[(.+)\]\s*$/u.exec(line)
    if (header !== null) {
      const key = header[1].trim()
      const own = [`mcp_servers.${name}`, `mcp_servers."${name}"`]
      target = own.includes(key) ? entry : own.some(prefix => key === `${prefix}.env`) ? (entry.env = entry.env ?? {}) : undefined
      continue
    }
    if (target === undefined) continue
    const pair = /^\s*("?)([A-Za-z0-9_.-]+)\1\s*=\s*(.+)$/u.exec(line)
    if (pair === null) continue
    const parsed = value(pair[3])
    if (parsed !== undefined) target[pair[2]] = parsed
  }
  return Object.keys(entry).length === 0 ? undefined : entry
}

/**
 * Read one server of one client in full.
 * @param options - the client name, the server name, and the known locations.
 * @returns the raw entry.
 */
export async function readClientServer({ client, name, paths = clientConfigPaths() }) {
  const location = paths.find(item => item.client === client)
  if (location === undefined) throw new Error('MCP console: unknown client')
  let text
  try {
    text = await readFile(location.path, 'utf8')
  } catch {
    throw new Error(`MCP console: ${client} has no configuration file any more`)
  }
  let entry
  try {
    entry = location.format === 'toml' ? tomlEntry(text, name) : jsonEntry(text, name)
  } catch {
    entry = undefined
  }
  if (!record(entry)) throw new Error(`MCP console: ${client} no longer configures "${name}"`)
  return entry
}

/**
 * Turn another client's entry into a `@deepseek-ai/dsh-mcp-client` config.
 * @param entry - the raw entry.
 * @param serverName - the DSH server name to use.
 * @returns the config.
 */
export function toMcpClientConfig(entry, serverName) {
  const type = typeof entry.type === 'string' ? entry.type.toLowerCase() : typeof entry.transport === 'string' ? entry.transport.toLowerCase() : ''
  const url = typeof entry.url === 'string' ? entry.url : typeof entry.serverUrl === 'string' ? entry.serverUrl : undefined
  if (type === 'sse') throw new Error('MCP console: this server uses SSE, which DSH does not support (stdio and streamable-http only)')
  if (typeof entry.command === 'string' && entry.command !== '') {
    const cwd = typeof entry.cwd === 'string' && entry.cwd !== '' ? entry.cwd : undefined
    return {
      serverName,
      transport: 'stdio',
      command: entry.command,
      args: strings(entry.args),
      env: stringMap(entry.env),
      ...(cwd === undefined ? {} : { cwd }),
    }
  }
  if (url !== undefined) {
    return { serverName, transport: 'streamable-http', url, headers: { ...stringMap(entry.headers), ...stringMap(entry.http_headers) } }
  }
  throw new Error('MCP console: this entry has neither a command nor a URL')
}

/** A valid, unused DSH server name derived from the client's name. */
export function serverNameFor(name, existing) {
  let base = String(name).replace(/[^A-Za-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 28)
  if (base === '') base = 'imported'
  let candidate = base
  for (let n = 2; existing.includes(candidate); n += 1) candidate = `${base}-${n}`
  if (!SERVER_NAME.test(candidate)) throw new Error('MCP console: could not derive a server name')
  return candidate
}

/**
 * A value as flow-style YAML: JSON for plain data (JSON is YAML and every
 * string is quoted), and a Loader `!!js` node as a tagged quoted scalar.
 */
export function flowYaml(value, indent = '') {
  if (record(value) && typeof value.__jsExpr === 'string') return `!!js ${JSON.stringify(value.__jsExpr)}`
  const inner = `${indent}  `
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[\n${value.map(item => `${inner}${flowYaml(item, inner)}`).join(',\n')}\n${indent}]`
  }
  if (record(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined)
    if (entries.length === 0) return '{}'
    return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${flowYaml(item, inner)}`).join(',\n')}\n${indent}}`
  }
  return JSON.stringify(value)
}

/** The files of a configuration-only bundle carrying one MCP row. */
export function bundleFiles({ serverName, config, description, homepage, origin = 'Imported' }) {
  const manifest = {
    name: `@local/mcp-${serverName.toLowerCase()}`,
    version: '0.1.0',
    private: true,
    description,
    ...(typeof homepage === 'string' && homepage !== '' ? { homepage } : {}),
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }
  const patch = [{ insert: [{ id: `mcp-${serverName}`, name: MCP_MODULE, config }] }]
  return {
    'package.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'cordis.patch.yml': `# ${origin} by dsh-mcp-console. Generated; remove it in the MCP page and add it again to change it.\n${flowYaml(patch)}\n`,
    name: manifest.name,
  }
}

/**
 * Write a configuration-only bundle for one config and install it. A bundle
 * that fails to install leaves no directory behind.
 * @param options - the Plugin Manager, the config, the bundle directory, and
 *   the manifest's description, homepage, and origin line.
 * @returns `{ serverName, bundle, application, directory }`.
 */
export async function installConfigBundle({ pluginManager, config, bundleDir, description, homepage, origin }) {
  if (pluginManager === undefined) throw new Error('MCP console: the Plugin Manager is not available in this profile')
  const serverName = config.serverName
  const files = bundleFiles({ serverName, config, description, homepage, origin })
  const directory = join(bundleDir, serverName)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), files['package.json'], 'utf8')
  await writeFile(join(directory, 'cordis.patch.yml'), files['cordis.patch.yml'], 'utf8')
  let result
  try {
    result = await pluginManager.installBundle(directory, { enabled: true })
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined)
    throw error
  }
  return {
    serverName,
    bundle: files.name,
    application: typeof result?.application === 'string' ? result.application : 'applied',
    directory,
  }
}

/**
 * Import one server: write the bundle, then install it.
 * @param options - the Plugin Manager, the client and server names, the
 *   configured server names, the bundle directory, and the known locations.
 * @returns `{ serverName, bundle, application, directory }`.
 */
export async function importClientServer({ pluginManager, client, name, existingNames, bundleDir, paths }) {
  if (pluginManager === undefined) throw new Error('MCP console: the Plugin Manager is not available in this profile')
  const entry = await readClientServer({ client, name, paths })
  const config = toMcpClientConfig(entry, serverNameFor(name, existingNames))
  return installConfigBundle({ pluginManager, config, bundleDir, description: `MCP server "${name}" imported from ${client}` })
}

/**
 * Edit a server whose configuration bundle lives in this plugin's bundle
 * directory (what import, Add manually, and AI quick add write).
 *
 * The bundle's patch is read with the Loader's YAML dialect, its single MCP
 * row is turned back into the Add manually form, and a save rewrites the
 * patch and reinstalls the bundle through the Plugin Manager (it has no
 * update operation: remove, then install). A failed reinstall puts the old
 * patch back and installs it again. Expressions the form cannot show (an
 * agent's own `!!js`) are kept exactly as they were; the page can keep or
 * drop them but never write a new one.
 *
 * @module dsh-mcp-console/editor
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { parse } from 'yaml'

import { MCP_MODULE } from './constants.js'
import { flowYaml } from './importer.js'
import { bridgeHeaderVariable, joinCommandLine, manualConfig } from './manual.js'
import { bundleSourceDir, isInside } from './servers.js'

const KNOWN_KEYS = new Set(['serverName', 'transport', 'command', 'args', 'env', 'cwd', 'url', 'headers'])
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const isExpression = value => record(value) && typeof value.__jsExpr === 'string'
const fail = message => {
  throw new Error(`MCP console: ${message}`)
}

/** Parse a patch in the Loader's dialect: `!!js` scalars become expression nodes. */
export function parsePatch(text) {
  return parse(text, { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => ({ __jsExpr: String(value) }) }] })
}

const ENV_READ = /^process\.env\.([A-Za-z_][A-Za-z0-9_]*)(?: \?\? '')?$/u
const PART = /"(?:[^"\\]|\\.)*"|\(process\.env\.([A-Za-z_][A-Za-z0-9_]*) \?\? ''\)/gu

/** The form row for one stored value: literal, environment read, template, or a kept expression. */
export function valueToPair(name, value) {
  if (typeof value === 'string') return { name, value, fromEnv: false }
  if (!isExpression(value)) return { name, value: String(value ?? ''), fromEnv: false }
  const expr = value.__jsExpr.trim()
  const read = ENV_READ.exec(expr)
  if (read !== null) return { name, value: read[1], fromEnv: true }
  // A template this plugin wrote: "literal" + (process.env.X ?? '') + …
  const parts = [...expr.matchAll(PART)]
  if (parts.length > 0 && parts.map(part => part[0]).join(' + ') === expr && parts.some(part => part[1] !== undefined)) {
    return { name, value: parts.map(part => (part[1] === undefined ? JSON.parse(part[0]) : `\${${part[1]}}`)).join(''), fromEnv: true }
  }
  // A template literal an agent wrote: `Bearer ${process.env.X}`.
  const literal = /^`([^`\\]*)`$/u.exec(expr)
  if (literal !== null) {
    const body = literal[1]
    const replaced = body.replace(/\$\{process\.env\.([A-Za-z_][A-Za-z0-9_]*)\}/gu, '${$1}')
    if (replaced !== body && !/\$\{(?![A-Za-z_][A-Za-z0-9_]*\})/u.test(replaced)) return { name, value: replaced, fromEnv: true }
  }
  return { name, value: expr, fromEnv: false, expression: true }
}

const pairsOf = map => Object.entries(record(map) ? map : {}).map(([name, value]) => valueToPair(name, value))

/**
 * The Add manually form for a stored config.
 * @param config - the row's config.
 * @returns `{ form }` or `{ reason }` when the form cannot show it.
 */
export function configToForm(config) {
  if (!record(config) || typeof config.serverName !== 'string') return { reason: 'the row has no plain server name' }
  const base = { name: config.serverName, transport: 'stdio', commandLine: '', cwd: '', env: [], url: '', headers: [], bridge: false }
  if (config.transport === 'streamable-http') {
    if (typeof config.url !== 'string') return { reason: 'the URL is an expression' }
    return { form: { ...base, transport: 'streamable-http', url: config.url, headers: pairsOf(config.headers) } }
  }
  if (typeof config.command !== 'string') return { reason: 'the command is an expression' }
  const args = Array.isArray(config.args) ? config.args : []
  if (args.some(arg => typeof arg !== 'string')) return { reason: 'an argument is an expression' }
  // A remote server reached through mcp-remote, as Add manually writes it.
  if (config.command === 'npx' && args[0] === '-y' && args[1] === 'mcp-remote' && typeof args[2] === 'string') {
    const headers = []
    let understood = true
    for (let i = 3; i < args.length; i += 1) {
      if (args[i] === '--allow-http') continue
      const header = args[i] === '--header' ? /^([^:]+):\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/u.exec(args[i + 1] ?? '') : null
      if (header === null) {
        understood = false
        break
      }
      headers.push(valueToPair(header[1], config.env?.[header[2]] ?? ''))
      i += 1
    }
    if (understood) return { form: { ...base, transport: 'streamable-http', url: args[2], headers, bridge: true } }
  }
  const commandLine = joinCommandLine([config.command, ...args])
  if (commandLine === undefined) return { reason: 'an argument holds both kinds of quotes' }
  return { form: { ...base, commandLine, cwd: typeof config.cwd === 'string' ? config.cwd : '', env: pairsOf(config.env) } }
}

/**
 * The bundle behind a server row, when this plugin may edit it: a removable
 * bundle installed from a directory inside the bundle directory, whose patch
 * holds exactly one insert of one MCP row.
 */
export async function locateEditable({ pluginManager, entryId, profileDir, bundleDir }) {
  if (pluginManager === undefined) fail('the Plugin Manager is not available in this profile')
  const bundles = await pluginManager.listBundles()
  const bundle = bundles.find(item => (item?.rows ?? []).some(row => row?.entryId === entryId))
  if (bundle === undefined || bundle.removable !== true) fail('only servers added as a bundle (import, Add manually, AI quick add) can be edited here')
  const directory = typeof profileDir === 'string' ? await bundleSourceDir(profileDir, bundle.name) : undefined
  if (directory === undefined || !isInside(bundleDir, directory)) fail('only bundles in the plugin\'s mcp-bundles directory can be edited here')
  let manifest
  try {
    manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  } catch {
    fail('the bundle\'s package.json cannot be read')
  }
  const patchName = typeof manifest?.dsh?.bundle?.patch === 'string' ? manifest.dsh.bundle.patch : undefined
  if (patchName === undefined) fail('the bundle declares no single patch file')
  const patchFile = join(directory, patchName)
  if (!isInside(directory, patchFile)) fail('the bundle\'s patch lies outside its directory')
  const text = await readFile(patchFile, 'utf8').catch(() => fail('the bundle\'s patch cannot be read'))
  let patch
  try {
    patch = parsePatch(text)
  } catch {
    fail('the bundle\'s patch is not valid YAML')
  }
  const operations = Array.isArray(patch) ? patch : []
  const rows = operations.length === 1 && Array.isArray(operations[0]?.insert) && Object.keys(operations[0]).length === 1 ? operations[0].insert : undefined
  if (rows === undefined || rows.length !== 1 || rows[0]?.name !== MCP_MODULE || !record(rows[0].config)) fail('the bundle does more than add one MCP server, so edit its files instead')
  return { bundle, directory, patchFile, text, row: rows[0] }
}

/**
 * Read the form for a server.
 * @returns `{ editable: true, form }` or `{ editable: false, reason }`.
 */
export async function readServerForm(options) {
  try {
    const { row } = await locateEditable(options)
    const { form, reason } = configToForm(row.config)
    return form === undefined ? { editable: false, reason } : { editable: true, form }
  } catch (error) {
    return { editable: false, reason: String(error?.message ?? error).replace(/^MCP console:\s*/u, '') }
  }
}

/** Put back the kept expressions: only a name that held exactly that expression before. */
function restoreExpressions(rows, previous, what) {
  const kept = {}
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.expression !== true) continue
    const name = String(row.name ?? '')
    const before = previous?.[name]
    if (!isExpression(before) || before.__jsExpr.trim() !== String(row.value ?? '').trim()) fail(`the ${what} "${name.slice(0, 40)}" cannot be set to a new expression here`)
    kept[name] = before
  }
  return kept
}

/**
 * Save an edited server and reinstall its bundle.
 * @param options - the Plugin Manager, the row's entry id, the form, the
 *   configured server names, the profile and bundle directories.
 * @returns `{ serverName, bundle, application }`.
 */
export async function updateServer({ pluginManager, entryId, request, existingNames = [], profileDir, bundleDir }) {
  const { bundle, directory, patchFile, text, row } = await locateEditable({ pluginManager, entryId, profileDir, bundleDir })
  const old = row.config
  const strip = rows => (Array.isArray(rows) ? rows.filter(item => item?.expression !== true) : [])
  if (request?.bridge === true && (request.headers ?? []).some(item => item?.expression === true)) fail('a header kept as an expression cannot go through mcp-remote')
  const keptEnv = restoreExpressions(request?.env, old.env, 'environment variable')
  const keptHeaders = restoreExpressions(request?.headers, old.headers, 'header')
  const config = manualConfig(
    { ...request, name: old.serverName, env: strip(request?.env), headers: strip(request?.headers) },
    existingNames.filter(name => name !== old.serverName),
  )
  if (config.transport === 'stdio') config.env = { ...config.env, ...keptEnv }
  else config.headers = { ...config.headers, ...keptHeaders }
  // Settings the form does not show (timeouts, reconnect) stay when the transport does.
  if (config.transport === old.transport) {
    for (const [key, value] of Object.entries(old)) if (!KNOWN_KEYS.has(key)) config[key] = value
  }
  const next = `# Edited by dsh-mcp-console. Generated; edit it again in the MCP page.\n${flowYaml([{ insert: [{ ...row, config }] }])}\n`
  await pluginManager.removeBundle(bundle.name)
  await writeFile(patchFile, next, 'utf8')
  try {
    const result = await pluginManager.installBundle(directory, { enabled: true })
    return { serverName: config.serverName, bundle: bundle.name, application: typeof result?.application === 'string' ? result.application : 'applied' }
  } catch (error) {
    // Put the server back as it was.
    await writeFile(patchFile, text, 'utf8')
    await pluginManager.installBundle(directory, { enabled: true }).catch(() => undefined)
    throw error
  }
}

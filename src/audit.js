/**
 * What the log records for each endpoint: a summary of the request (names,
 * not values), a summary of the outcome, and the raw error when it fails.
 * Polling and lookups the page makes on its own are not logged unless they
 * fail.
 *
 * @module dsh-mcp-console/audit
 */

import { splitCommandLine } from './manual.js'
import { redactArgs } from './redact.js'

/** Endpoints the page calls by itself all the time; only their failures are logged. */
export const QUIET = new Set(['status', 'status/wait', 'env/check', 'scan/last', 'models', 'runtimes', 'diagnostics', 'servers/config', 'log/client'])

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const short = (value, limit = 200) => (typeof value === 'string' ? value.slice(0, limit) : undefined)

/** A URL without its query and fragment, which may carry a key. */
export function safeUrl(value) {
  try {
    const url = new URL(String(value))
    return `${url.origin}${url.pathname}${url.search === '' ? '' : '?…'}`
  } catch {
    return short(value, 100)
  }
}

/** A command line with credential-looking arguments masked. */
function safeCommand(line) {
  try {
    const [command, ...args] = splitCommandLine(String(line ?? ''))
    return command === undefined ? '' : [command, ...redactArgs(args)].join(' ')
  } catch {
    return '(unparsable command)'
  }
}

/** Name/value rows as names and where each value comes from. */
const rows = list => (Array.isArray(list)
  ? list.filter(item => record(item) && String(item.name ?? '') !== '').map(item => `${item.name}${item.expression ? '(expression)' : item.fromEnv ? '(env)' : '(literal)'}`)
  : undefined)

/** The literal values a form carries, to register with the log's mask. */
export function formSecrets(form) {
  const values = []
  for (const item of [...(Array.isArray(form?.env) ? form.env : []), ...(Array.isArray(form?.headers) ? form.headers : [])]) {
    if (record(item) && item.fromEnv !== true && typeof item.value === 'string') values.push(item.value)
  }
  return values
}

function formSummary(form) {
  if (!record(form)) return {}
  const remote = form.transport === 'streamable-http'
  return {
    name: short(form.name, 40),
    transport: short(form.transport, 20),
    ...(remote ? { url: safeUrl(form.url), headers: rows(form.headers), bridge: form.bridge === true } : { command: safeCommand(form.commandLine), env: rows(form.env), cwd: form.cwd ? 'set' : undefined }),
  }
}

const REQUEST = {
  'servers/toggle': p => ({ entryId: p?.entryId, enabled: p?.enabled === true }),
  'servers/remove': p => ({ entryId: p?.entryId }),
  'servers/import': p => ({ client: short(p?.client, 40), name: short(p?.name, 60) }),
  'servers/add': formSummary,
  'servers/test': formSummary,
  'servers/update': p => ({ entryId: p?.entryId, ...formSummary(p) }),
  'servers/config': p => ({ entryId: p?.entryId }),
  'servers/repository': p => ({ rowId: p?.rowId, url: p?.url ? safeUrl(p.url) : '(cleared)' }),
  'quick-add': p => ({ source: short(p?.source ?? p?.repositoryUrl, 300), notes: typeof p?.notes === 'string' && p.notes.trim() !== '' ? `${p.notes.length} chars` : undefined, locale: p?.locale, model: record(p?.model) ? `${p.model.provider}/${p.model.model}` : 'default' }),
  'registry/search': p => ({ query: short(p?.query, 100), page: p?.cursor ? 'next' : 'first' }),
  'scan/analyze': p => ({ locale: p?.locale, model: record(p?.model) ? `${p.model.provider}/${p.model.model}` : 'default' }),
  runtimes: p => ({ refresh: p?.refresh === true }),
}

const RESULT = {
  'servers/toggle': v => ({ application: v?.application, warnings: v?.warnings }),
  'servers/remove': v => ({ bundle: v?.bundle, application: v?.application, removedDirectory: v?.removedDirectory }),
  'servers/import': v => ({ serverName: v?.serverName, bundle: v?.bundle, application: v?.application }),
  'servers/add': v => ({ serverName: v?.serverName, bundle: v?.bundle, application: v?.application }),
  'servers/update': v => ({ serverName: v?.serverName, bundle: v?.bundle, application: v?.application }),
  'servers/test': v => (v?.ok
    ? { ok: true, server: v.server, toolCount: v.toolCount, ms: v.ms }
    : { ok: false, reason: v?.reason, message: v?.message, output: v?.output }),
  'servers/config': v => ({ editable: v?.editable, reason: v?.reason }),
  'servers/export': v => ({ count: v?.count, notes: v?.notes?.length }),
  'quick-add': v => ({ sessionId: v?.sessionId, workspaceId: v?.workspaceId }),
  'scan/analyze': v => ({ sessionId: v?.sessionId }),
  'registry/search': v => ({ results: v?.results?.length, more: v?.nextCursor !== undefined }),
  scan: v => ({ apps: v?.apps?.length, services: v?.services?.length, ports: v?.ports?.length, containers: v?.containers?.length, clients: v?.clients?.length }),
}

export const summarizeRequest = (endpoint, payload) => (REQUEST[endpoint] ?? (() => ({})))(payload)
export const summarizeResult = (endpoint, value) => (RESULT[endpoint] ?? (() => ({})))(value)

/** The raw failure: its message, code, and what the Plugin Manager attached. */
export function failureFields(error) {
  const fields = {
    message: String(error instanceof Error ? error.message : error),
    ...(typeof error?.code === 'string' ? { code: error.code } : {}),
  }
  if (record(error?.details) && Object.keys(error.details).length > 0) fields.details = error.details
  if (error instanceof Error && !/^MCP console:/u.test(error.message) && typeof error.stack === 'string') {
    fields.stack = error.stack.split('\n').slice(1, 5).map(line => line.trim()).join(' | ')
  }
  return fields
}

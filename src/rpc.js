/**
 * The loopback RPC surface behind the MCP Console page.
 *
 * Replies carry only projections built here: redacted server configuration,
 * states, tool names, the local inventory the person asked for, and the ids
 * of Sessions this plugin opened. Environment values and header values never
 * cross this boundary.
 *
 * @module dsh-mcp-console/rpc
 */

import { normalizeRepository } from './repository.js'
import { QUIET, failureFields, formSecrets, summarizeRequest, summarizeResult } from './audit.js'
import { classifySource } from './sources.js'

const ok = value => ({ ok: true, value })
// Connection 0.2 validates all three error fields, even on plugin channels.
const failed = message => ({ ok: false, error: { code: 'mcp-console/request-failed', message, details: {} } })

/** Only sentences this plugin authored, or the Plugin Manager's own codes, reach the browser. */
const SAFE_MESSAGE = /^(?:MCP console:|unknown-plugin|management-required|unaddressable|operation-error|not-removable|bundle-in-use|stop-profile|invalid-spec|incompatible-version)[\s\S]{0,300}$/u

/** A repository URL the quick-add flow accepts: an https link to a code host page. */
export function acceptRepositoryUrl(value) {
  const url = normalizeRepository(value)
  if (url === undefined || !url.startsWith('https://')) throw new Error('MCP console: enter an https repository URL, for example https://github.com/owner/project')
  return url
}

/**
 * Build the RPC handler.
 * @param options - the operations the page may call.
 * @returns a handler for `connection.rpc.handle(CHANNEL, handler)`.
 */
/** The Add manually form fields the page may send; anything else is dropped. */
export function pickForm(payload) {
  return {
    name: payload?.name,
    transport: payload?.transport,
    commandLine: payload?.commandLine,
    cwd: payload?.cwd,
    env: payload?.env,
    url: payload?.url,
    headers: payload?.headers,
    bridge: payload?.bridge === true,
  }
}

/** Page events the log accepts, and how many per minute. */
const CLIENT_EVENTS = new Set(['version-mismatch', 'page-error'])
const CLIENT_EVENTS_PER_MINUTE = 20

export function createConsoleRpc({ log, diagnostics, revealLog, status, toggle, remove, importServer, addServer, testServer, serverForm, updateServer, exportServers, checkEnv, runtimes, searchRegistry, wait, setRepository, models, quickAdd, scan, lastScan, analyze }) {
  const endpoints = {
    status: () => status(),
    'servers/toggle': payload => toggle(String(payload?.entryId ?? ''), payload?.enabled === true),
    'servers/remove': payload => remove(String(payload?.entryId ?? '')),
    'servers/import': payload => importServer({ client: String(payload?.client ?? ''), name: String(payload?.name ?? '') }),
    'status/wait': (payload, signal) => wait({ revision: Number(payload?.revision) }, signal),
    'servers/repository': payload => setRepository(String(payload?.rowId ?? ''), typeof payload?.url === 'string' ? payload.url : ''),
    'servers/add': payload => addServer(pickForm(payload)),
    'servers/test': (payload, signal) => testServer(pickForm(payload), signal),
    'servers/config': payload => serverForm(String(payload?.entryId ?? '')),
    'servers/update': payload => updateServer(String(payload?.entryId ?? ''), pickForm(payload)),
    'servers/export': () => exportServers(),
    'env/check': payload => checkEnv(Array.isArray(payload?.names) ? payload.names.filter(name => typeof name === 'string') : []),
    runtimes: payload => runtimes(payload?.refresh === true),
    diagnostics: payload => (typeof diagnostics === 'function' ? diagnostics({ pageVersion: typeof payload?.pageVersion === 'string' ? payload.pageVersion.slice(0, 40) : undefined }) : { text: '' }),
    'diagnostics/reveal': (_payload, signal) => revealLog(signal),
    'log/client': payload => {
      const event = String(payload?.event ?? '')
      if (!CLIENT_EVENTS.has(event)) throw new Error('MCP console: unknown page event')
      const minute = Math.floor(Date.now() / 60_000)
      if (clientEvents.minute !== minute) { clientEvents.minute = minute; clientEvents.count = 0 }
      clientEvents.count += 1
      if (clientEvents.count <= CLIENT_EVENTS_PER_MINUTE) log?.warn(`page/${event}`, { detail: String(payload?.detail ?? '').slice(0, 2000) })
      return { logged: clientEvents.count <= CLIENT_EVENTS_PER_MINUTE }
    },
    'registry/search': (payload, signal) => searchRegistry({ query: typeof payload?.query === 'string' ? payload.query : '', cursor: typeof payload?.cursor === 'string' ? payload.cursor : undefined }, signal),
    'quick-add': (payload, signal) => quickAdd({
      source: classifySource(typeof payload?.source === 'string' ? payload.source : payload?.repositoryUrl),
      notes: typeof payload?.notes === 'string' ? payload.notes : '',
      locale: payload?.locale === 'en' ? 'en' : 'zh',
      model: payload?.model,
    }, signal),
    models: () => (typeof models === 'function' ? models() : { providers: [] }),
    scan: (_payload, signal) => scan(signal),
    'scan/last': () => (typeof lastScan === 'function' ? lastScan() : null),
    'scan/analyze': (payload, signal) => analyze({ locale: payload?.locale === 'en' ? 'en' : 'zh', model: payload?.model }, signal),
  }
  const clientEvents = { minute: 0, count: 0 }
  return async (endpoint, payload, signal) => {
    const startedAt = Date.now()
    const quiet = QUIET.has(endpoint)
    try {
      const handle = Object.hasOwn(endpoints, endpoint) ? endpoints[endpoint] : undefined
      if (handle === undefined) return failed('MCP console: unknown endpoint')
      // Literal values a form carries never reach the log, whatever happens next.
      if (log !== undefined) log.mask(formSecrets(payload))
      const value = await handle(payload, signal)
      if (log !== undefined && !quiet) {
        const failedTest = endpoint === 'servers/test' && value?.ok === false
        log.write(failedTest ? 'warn' : 'info', endpoint, { request: summarizeRequest(endpoint, payload), result: summarizeResult(endpoint, value), ms: Date.now() - startedAt })
      }
      return ok(value)
    } catch (error) {
      if (log !== undefined && !(signal?.aborted && endpoint === 'status/wait')) {
        log.error(endpoint, { request: summarizeRequest(endpoint, payload), error: failureFields(error), ms: Date.now() - startedAt })
      }
      const message = error instanceof Error ? error.message : String(error)
      const code = typeof error?.code === 'string' ? error.code : ''
      if (SAFE_MESSAGE.test(message)) return failed(message)
      if (SAFE_MESSAGE.test(code)) return failed(code)
      return failed('MCP console: the request failed')
    }
  }
}

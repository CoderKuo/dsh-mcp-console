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

import { normalizeRepository } from './servers.js'

const ok = value => ({ ok: true, value })
// Connection 0.2 validates all three error fields, even on plugin channels.
const failed = message => ({ ok: false, error: { code: 'mcp-console/request-failed', message, details: {} } })

/** Only sentences this plugin authored, or the Plugin Manager's own codes, reach the browser. */
const SAFE_MESSAGE = /^(?:MCP console:|unknown-plugin|management-required|unaddressable|operation-error)[\s\S]{0,300}$/u

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
export function createConsoleRpc({ status, toggle, setRepository, quickAdd, scan, analyze }) {
  const endpoints = {
    status: () => status(),
    'servers/toggle': payload => toggle(String(payload?.entryId ?? ''), payload?.enabled === true),
    'servers/repository': payload => setRepository(String(payload?.rowId ?? ''), typeof payload?.url === 'string' ? payload.url : ''),
    'quick-add': (payload, signal) => quickAdd({
      repositoryUrl: acceptRepositoryUrl(payload?.repositoryUrl),
      notes: typeof payload?.notes === 'string' ? payload.notes : '',
      locale: payload?.locale === 'en' ? 'en' : 'zh',
    }, signal),
    scan: (_payload, signal) => scan(signal),
    'scan/analyze': (payload, signal) => analyze({ locale: payload?.locale === 'en' ? 'en' : 'zh' }, signal),
  }
  return async (endpoint, payload, signal) => {
    try {
      const handle = Object.hasOwn(endpoints, endpoint) ? endpoints[endpoint] : undefined
      if (handle === undefined) return failed('MCP console: unknown endpoint')
      return ok(await handle(payload, signal))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const code = typeof error?.code === 'string' ? error.code : ''
      if (SAFE_MESSAGE.test(message)) return failed(message)
      if (SAFE_MESSAGE.test(code)) return failed(code)
      return failed('MCP console: the request failed')
    }
  }
}

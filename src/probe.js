/**
 * Try a server before it is installed: start it (or call its endpoint), run
 * the MCP handshake, list its tools, and stop. What DSH would see is what the
 * person sees: a local server runs through `ctx.subprocess` with the same
 * explicit environment the row would get, and a remote one gets the same
 * headers.
 *
 * Also answers which environment variables the DSH host can see, and which
 * runtimes (`node`, `uvx`, `docker`, …) are on its PATH. Values never leave
 * the host: an environment check answers yes or no, and any configured value
 * that shows up in a server's output is masked.
 *
 * @module dsh-mcp-console/probe
 */

import { homedir } from 'node:os'

import { PLUGIN_ID, PLUGIN_VERSION } from './constants.js'
import { MASK } from './redact.js'

export const PROTOCOL_VERSION = '2025-06-18'
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u
const MAX_OUTPUT_CHARS = 2000
const MAX_TOOLS = 100

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * One configured value as the Loader would evaluate it. Only expressions this
 * plugin generated reach here (`process.env` reads and string literals).
 */
export function resolveValue(value, env = process.env) {
  if (record(value) && typeof value.__jsExpr === 'string') {
    // eslint-disable-next-line no-new-func
    const result = new Function('process', `return (${value.__jsExpr})`)({ env })
    return result === undefined || result === null ? '' : String(result)
  }
  return typeof value === 'string' ? value : ''
}

const resolveMap = (map, env) => Object.fromEntries(Object.entries(record(map) ? map : {}).map(([name, value]) => [name, resolveValue(value, env)]))

/** Replace every configured value of six characters or more in a text. */
function masker(values) {
  const secrets = values.filter(value => typeof value === 'string' && value.length >= 6).sort((a, b) => b.length - a.length)
  return text => secrets.reduce((out, secret) => out.split(secret).join(MASK), String(text ?? '')).slice(-MAX_OUTPUT_CHARS)
}

const request = (id, method, params) => ({ jsonrpc: '2.0', id, method, params })
const initialize = () => request(1, 'initialize', {
  protocolVersion: PROTOCOL_VERSION,
  capabilities: {},
  clientInfo: { name: PLUGIN_ID, version: PLUGIN_VERSION },
})
const initialized = { jsonrpc: '2.0', method: 'notifications/initialized' }

/** The success projection: server identity and tool names. */
function success(init, list, startedAt) {
  const tools = Array.isArray(list?.tools) ? list.tools.map(tool => String(tool?.name ?? '')).filter(Boolean) : []
  return {
    ok: true,
    server: {
      name: String(init?.serverInfo?.name ?? ''),
      version: String(init?.serverInfo?.version ?? ''),
    },
    protocolVersion: String(init?.protocolVersion ?? ''),
    toolCount: tools.length,
    tools: tools.slice(0, MAX_TOOLS),
    ms: Date.now() - startedAt,
  }
}

const failure = (reason, message, extra = {}) => ({ ok: false, reason, message, ...extra })

// ── streamable-http ─────────────────────────────────────────────────────────

/** The JSON-RPC reply with `id` from a JSON or an event-stream body. */
async function readReply(response, id) {
  const type = response.headers.get('content-type') ?? ''
  const text = await response.text()
  const candidates = type.includes('text/event-stream')
    ? text.split(/\r?\n/u).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim())
    : [text]
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
        if (message?.id === id) return message
      }
    } catch {
      // Not JSON: keep looking.
    }
  }
  return undefined
}

/**
 * Handshake with a streamable-http endpoint.
 * @param config - a streamable-http config.
 * @param options - `fetch`, the bound, the environment, cancellation.
 * @returns the result projection.
 */
export async function probeHttp(config, { fetchImpl = fetch, timeoutMs = 20_000, env = process.env, signal } = {}) {
  const startedAt = Date.now()
  let headers
  try {
    headers = resolveMap(config.headers, env)
  } catch {
    return failure('config', 'a header value could not be evaluated')
  }
  const mask = masker(Object.values(headers))
  const bound = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal === undefined ? [] : [signal])])
  let session
  const post = async body => {
    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': PROTOCOL_VERSION,
        ...(session === undefined ? {} : { 'mcp-session-id': session }),
      },
      body: JSON.stringify(body),
      signal: bound,
      redirect: 'follow',
    })
    return response
  }
  try {
    const first = await post(initialize())
    if (first.status === 401 || first.status === 403) {
      const oauth = /bearer/iu.test(first.headers.get('www-authenticate') ?? '') && Object.keys(headers).every(name => name.toLowerCase() !== 'authorization')
      return failure(oauth ? 'oauth' : 'auth', `the server answered ${first.status}${oauth ? ' and asks for an OAuth sign-in' : ''}`)
    }
    if (first.status === 404 || first.status === 405) return failure('not-streamable', `the server answered ${first.status} to a streamable-http request; it may offer SSE only`)
    if (!first.ok) return failure('http', `the server answered ${first.status}`, { output: mask(await first.text().catch(() => '')) })
    session = first.headers.get('mcp-session-id') ?? undefined
    const init = await readReply(first, 1)
    if (init === undefined) return failure('protocol', 'the reply is not an MCP initialize result')
    if (init.error !== undefined) return failure('protocol', mask(`initialize failed: ${init.error?.message ?? 'error'}`))
    await post(initialized).then(response => response.body?.cancel?.()).catch(() => undefined)
    const listed = await post(request(2, 'tools/list', {}))
    const list = listed.ok ? await readReply(listed, 2) : undefined
    if (session !== undefined) {
      fetchImpl(config.url, { method: 'DELETE', headers: { ...headers, 'mcp-session-id': session }, signal: AbortSignal.timeout(3_000) }).catch(() => undefined)
    }
    return success(init.result, list?.result, startedAt)
  } catch (error) {
    if (bound.aborted) return failure('timeout', `no answer within ${Math.round(timeoutMs / 1000)} s`)
    return failure('unreachable', mask(`could not reach the server (${error?.cause?.code ?? error?.message ?? 'network error'})`))
  }
}

// ── stdio ───────────────────────────────────────────────────────────────────

/**
 * Start a stdio server, handshake over newline-delimited JSON-RPC, and stop it.
 * @param config - a stdio config.
 * @param options - `ctx.subprocess`, the bound, the environment, cancellation.
 * @returns the result projection.
 */
export async function probeStdio(config, { subprocess, timeoutMs = 60_000, env = process.env, signal } = {}) {
  const startedAt = Date.now()
  if (subprocess === undefined) return failure('unavailable', 'this profile cannot start processes')
  let childEnv
  try {
    childEnv = resolveMap(config.env, env)
  } catch {
    return failure('config', 'an environment value could not be evaluated')
  }
  const mask = masker(Object.values(childEnv))
  let executable
  try {
    executable = await subprocess.resolveExecutable(config.command, childEnv)
  } catch {
    return failure('no-executable', `"${config.command}" was not found on the PATH DSH sees`)
  }
  const bound = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal === undefined ? [] : [signal])])
  let handle
  try {
    handle = subprocess.spawn({
      argv: [executable, ...(config.args ?? [])],
      cwd: typeof config.cwd === 'string' && config.cwd !== '' ? config.cwd : homedir(),
      stdio: { stdin: 'pipe', stdout: 'pipe', stderr: { maxBytes: 16 * 1024 } },
      graceMs: 2_000,
      signal: bound,
      env: childEnv,
    })
  } catch (error) {
    return failure('spawn', mask(`could not start it (${error?.code ?? error?.message ?? 'error'})`))
  }
  const stderr = () => mask(handle.collected?.stderr?.readFrom(0).text ?? '')
  const replies = new Map()
  let wake
  let buffer = ''
  handle.stdout?.setEncoding?.('utf8')
  handle.stdout?.on('data', chunk => {
    buffer += chunk
    let index
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (buffer.length > 1024 * 1024) buffer = ''
      try {
        const message = JSON.parse(line)
        if (message?.id !== undefined) replies.set(message.id, message)
      } catch {
        // A log line on stdout: ignore.
      }
    }
    wake?.()
  })
  let exited = false
  void handle.done.then(() => { exited = true; wake?.() }, () => { exited = true; wake?.() })
  const send = message => new Promise(resolve => { handle.stdin.write(`${JSON.stringify(message)}\n`, () => resolve()) })
  const reply = async id => {
    while (!replies.has(id)) {
      if (exited || bound.aborted) return undefined
      await new Promise(resolve => {
        wake = resolve
        bound.addEventListener('abort', resolve, { once: true })
      })
    }
    return replies.get(id)
  }
  try {
    await send(initialize())
    const init = await reply(1)
    if (init === undefined) {
      if (bound.aborted) return failure('timeout', `no MCP answer within ${Math.round(timeoutMs / 1000)} s (a first run may still be downloading)`, { output: stderr() })
      return failure('exited', 'the process ended before answering', { output: stderr() })
    }
    if (init.error !== undefined) return failure('protocol', mask(`initialize failed: ${init.error?.message ?? 'error'}`), { output: stderr() })
    await send(initialized)
    await send(request(2, 'tools/list', {}))
    const list = await reply(2)
    return success(init.result, list?.result, startedAt)
  } catch (error) {
    return failure('exited', mask(`the process stopped (${error?.code ?? error?.message ?? 'error'})`), { output: stderr() })
  } finally {
    try { handle.stdin?.end() } catch { /* already closed */ }
    handle.terminate()
    await handle.waitForExit(AbortSignal.timeout(5_000)).catch(() => false)
  }
}

/**
 * Try a config with the transport it names.
 * @param config - a dsh-mcp-client config.
 * @param options - see `probeStdio` and `probeHttp`.
 * @returns the result projection.
 */
export function probeServer(config, options = {}) {
  return config.transport === 'streamable-http' ? probeHttp(config, options) : probeStdio(config, options)
}

// ── environment and runtimes ────────────────────────────────────────────────

/**
 * Which of the named environment variables the DSH host has (non-empty).
 * @param names - variable names.
 * @returns `{ NAME: boolean }`.
 */
export function checkEnvironment(names, env = process.env) {
  const out = {}
  for (const name of (Array.isArray(names) ? names : []).slice(0, 100)) {
    if (typeof name === 'string' && ENV_NAME.test(name)) out[name] = typeof env[name] === 'string' && env[name] !== ''
  }
  return out
}

/** The launchers commands commonly start with, and what provides them. */
export const RUNTIMES = ['node', 'npx', 'uv', 'uvx', 'python', 'docker', 'bun', 'deno']

/**
 * Which runtimes the DSH host finds on its PATH, and their versions.
 * @param subprocess - `ctx.subprocess`.
 * @param run - a runner (from `createRunner`) for the version commands.
 * @returns `{ name: { found, version? } }`.
 */
export async function detectRuntimes(subprocess, run) {
  const entries = await Promise.all(RUNTIMES.map(async name => {
    if (subprocess === undefined) return [name, { found: false }]
    try {
      await subprocess.resolveExecutable(name)
    } catch {
      return [name, { found: false }]
    }
    const output = name === 'npx' || name === 'uvx' ? '' : await run([name, '--version']).catch(() => '')
    const version = /\d+\.\d+(?:\.\d+)?/u.exec(output)?.[0]
    return [name, { found: true, ...(version === undefined ? {} : { version }) }]
  }))
  return Object.fromEntries(entries)
}

/** The runtime a command needs, when it is one of the known launchers. */
export function runtimeOf(command) {
  const base = String(command ?? '').replace(/^.*[\\/]/u, '').replace(/\.(?:exe|cmd|bat)$/iu, '').toLowerCase()
  if (base === 'python3' || base === 'py') return 'python'
  return RUNTIMES.includes(base) ? base : undefined
}

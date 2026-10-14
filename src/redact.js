/**
 * What of an MCP row's configuration may reach the browser.
 *
 * The row's raw `config` is read, never the fiber's resolved one: `!!js`
 * expressions such as `process.env.GITHUB_TOKEN` stay expressions instead of
 * becoming the secret they evaluate to. Environment variables and HTTP
 * headers show their names only, and an argument that is, or follows a flag
 * that names, a credential is masked.
 *
 * @module dsh-mcp-console/redact
 */

export const MASK = '••••••'

const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu
/** A long opaque run that reads as a credential rather than a word or path. */
const OPAQUE = /^(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA|eyJ)[-_A-Za-z0-9.]{8,}$|^[A-Za-z0-9+/_=-]{32,}$/u

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** A `!!js` node as the loader keeps it in raw rows. */
export function jsExpression(value) {
  if (record(value) && typeof value.__jsExpr === 'string') return value.__jsExpr
  return undefined
}

/** One scalar for display: a `!!js` node as its source, anything else as text. */
function show(value) {
  const expression = jsExpression(value)
  if (expression !== undefined) return `!!js ${expression}`
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''
  return JSON.stringify(value)
}

/**
 * Mask credential-looking arguments: a value after `--api-key`-style flags,
 * a `--token=…` pair, or an opaque token on its own.
 * @param args - the row's `args`.
 * @returns display strings.
 */
export function redactArgs(args) {
  if (!Array.isArray(args)) return []
  const out = []
  let maskNext = false
  for (const raw of args) {
    const text = show(raw)
    if (jsExpression(raw) !== undefined) {
      out.push(text)
      maskNext = false
      continue
    }
    if (maskNext) {
      out.push(MASK)
      maskNext = false
      continue
    }
    const pair = /^(--?[^=\s]+)=(.*)$/u.exec(text)
    if (pair !== null && SECRET_NAME.test(pair[1])) {
      out.push(`${pair[1]}=${MASK}`)
      continue
    }
    if (/^--?[A-Za-z]/u.test(text) && SECRET_NAME.test(text)) {
      out.push(text)
      maskNext = true
      continue
    }
    out.push(OPAQUE.test(text) ? MASK : text)
  }
  return out
}

/**
 * Keep the names of a map and say where each value comes from, never what it is.
 * @param map - `env` or `headers`.
 * @returns `[{ name, source }]`, source `expression` (a `!!js` value) or `literal`.
 */
export function redactMap(map) {
  if (!record(map)) return []
  return Object.entries(map).map(([name, value]) => ({
    name,
    source: jsExpression(value) !== undefined ? 'expression' : 'literal',
  }))
}

/**
 * The browser-safe projection of one `@deepseek-ai/dsh-mcp-client` config.
 * @param config - the row's raw config.
 * @returns transport, command or URL, masked arguments, and map names.
 */
export function redactConfig(config) {
  const value = record(config) ? config : {}
  const transport = value.transport === 'streamable-http' ? 'streamable-http' : value.transport === 'stdio' ? 'stdio' : show(value.transport)
  const base = {
    serverName: show(value.serverName),
    transport,
    ...(value.toolCallTimeoutMs === undefined ? {} : { toolCallTimeoutMs: value.toolCallTimeoutMs }),
    ...(value.failOnStartupError === true ? { failOnStartupError: true } : {}),
  }
  if (transport === 'streamable-http') {
    let url = show(value.url)
    try {
      // Credentials in the URL itself never leave the host.
      const parsed = new URL(url)
      if (parsed.username !== '' || parsed.password !== '') {
        parsed.username = parsed.username === '' ? '' : MASK
        parsed.password = parsed.password === '' ? '' : MASK
      }
      for (const key of [...parsed.searchParams.keys()]) {
        if (SECRET_NAME.test(key)) parsed.searchParams.set(key, MASK)
      }
      url = parsed.toString()
    } catch {
      // A `!!js` URL or an unparsable one is shown as written.
    }
    return { ...base, url, headers: redactMap(value.headers) }
  }
  return {
    ...base,
    command: show(value.command),
    args: redactArgs(value.args),
    env: redactMap(value.env),
    ...(value.cwd === undefined || value.cwd === '' ? {} : { cwd: show(value.cwd) }),
  }
}

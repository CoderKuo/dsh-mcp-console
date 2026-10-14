/**
 * Manual add: connect an MCP server the person already knows how to run,
 * without the AI. The page sends a name and either a launch command or an
 * endpoint URL; the host builds the `@deepseek-ai/dsh-mcp-client` config and
 * installs it the same way import does.
 *
 * A value marked as coming from the environment is written as a Loader `!!js`
 * expression (`process.env.NAME`), so the secret itself never lands in the
 * bundle; the Loader evaluates it in the DSH host when the row starts.
 *
 * @module dsh-mcp-console/manual
 */

const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u
const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu
const MAX_PAIRS = 50
const MAX_TEXT = 4000

const text = value => (typeof value === 'string' ? value.trim() : '')
const fail = message => {
  throw new Error(`MCP console: ${message}`)
}

/**
 * Split a command line into the executable and its arguments. Double and
 * single quotes group; a backslash is an ordinary character, so Windows paths
 * survive. No shell runs the result.
 * @param line - the command line.
 * @returns the tokens.
 */
export function splitCommandLine(line) {
  const tokens = []
  let current = ''
  let started = false
  let quote
  for (const ch of String(line)) {
    if (quote !== undefined) {
      if (ch === quote) quote = undefined
      else current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      started = true
    } else if (/\s/u.test(ch)) {
      if (started) tokens.push(current)
      current = ''
      started = false
    } else {
      current += ch
      started = true
    }
  }
  if (quote !== undefined) fail('the command has an unclosed quote')
  if (started) tokens.push(current)
  return tokens
}

/**
 * The expression for a value read from the environment: a bare variable name,
 * or a template where each `${NAME}` is replaced, e.g. `Bearer ${API_TOKEN}`.
 * A variable that is not set reads as an empty string.
 * @param template - what the person typed.
 * @returns a `!!js` node.
 */
export function environmentExpression(template) {
  const value = text(template)
  if (ENV_NAME.test(value)) return { __jsExpr: `process.env.${value} ?? ''` }
  const parts = []
  let last = 0
  for (const match of value.matchAll(PLACEHOLDER)) {
    if (match.index > last) parts.push(JSON.stringify(value.slice(last, match.index)))
    parts.push(`(process.env.${match[1]} ?? '')`)
    last = match.index + match[0].length
  }
  if (parts.length === 0) fail(`"${value.slice(0, 40)}" names no environment variable; enter a name such as API_TOKEN, or a template such as Bearer \${API_TOKEN}`)
  if (last < value.length) parts.push(JSON.stringify(value.slice(last)))
  return { __jsExpr: parts.join(' + ') }
}

/** Name/value pairs from the page as a config map; `fromEnv` pairs become expressions. */
function pairs(list, { pattern, what }) {
  const out = {}
  if (!Array.isArray(list)) return out
  const filled = list.filter(item => text(item?.name) !== '' || text(item?.value) !== '')
  if (filled.length > MAX_PAIRS) fail(`at most ${MAX_PAIRS} ${what}`)
  for (const item of filled) {
    const name = text(item.name)
    if (!pattern.test(name)) fail(`"${name.slice(0, 40)}" is not a valid ${what.replace(/s$/u, '')} name`)
    if (Object.hasOwn(out, name)) fail(`${what.replace(/s$/u, '')} "${name}" is given twice`)
    const value = typeof item.value === 'string' ? item.value : ''
    if (value.length > MAX_TEXT) fail(`the value of "${name}" is too long`)
    out[name] = item.fromEnv === true ? environmentExpression(value) : value
  }
  return out
}

/**
 * Build the dsh-mcp-client config the person described.
 * @param request - `{ name, transport, commandLine, cwd, env, url, headers }`
 *   where `env` and `headers` are `{ name, value, fromEnv }` lists.
 * @param existingNames - the configured server names.
 * @returns the config.
 */
export function manualConfig(request, existingNames = []) {
  const serverName = text(request?.name)
  if (!SERVER_NAME.test(serverName)) fail('the name must be 1-32 letters, digits, "-" or "_"')
  if (existingNames.includes(serverName)) fail(`a server named "${serverName}" already exists`)
  if (request?.transport === 'streamable-http') {
    const url = text(request.url)
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      fail('enter the endpoint as an http(s) URL')
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') fail('enter the endpoint as an http(s) URL')
    return { serverName, transport: 'streamable-http', url: parsed.toString(), headers: pairs(request.headers, { pattern: HEADER_NAME, what: 'headers' }) }
  }
  if (request?.transport !== 'stdio') fail('choose a local command or a remote endpoint')
  const line = typeof request.commandLine === 'string' ? request.commandLine : ''
  if (line.length > MAX_TEXT) fail('the command is too long')
  const [command, ...args] = splitCommandLine(line)
  if (command === undefined || command === '') fail('enter the command that starts the server')
  const cwd = text(request.cwd)
  return {
    serverName,
    transport: 'stdio',
    command,
    args,
    env: pairs(request.env, { pattern: ENV_NAME, what: 'environment variables' }),
    ...(cwd === '' ? {} : { cwd }),
  }
}

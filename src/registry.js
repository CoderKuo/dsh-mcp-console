/**
 * Search the official MCP Registry and turn an entry into manual-add forms.
 *
 * Each entry (`server.json`) lists packages (npm, PyPI, OCI images) with the
 * environment variables they need, and remote endpoints with their headers.
 * Every runnable option becomes a form the page fills into Add manually, for
 * the person to review, complete, test, and add; nothing is installed here.
 * Secrets are filled as environment references, never as values.
 *
 * @module dsh-mcp-console/registry
 */

export const DEFAULT_REGISTRY_URL = 'https://registry.modelcontextprotocol.io'
const MAX_RESULTS = 30
const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const str = value => (typeof value === 'string' ? value : '')
const list = value => (Array.isArray(value) ? value : [])

/** A token for a command line: quoted when it holds spaces. */
const token = text => (/[\s"]/u.test(text) || text === '' ? `"${text.replace(/"/gu, '')}"` : text)

/** A variable name for a `{placeholder}`: `smithery_api_key` → `SMITHERY_API_KEY`. */
const variableFor = placeholder => placeholder.replace(/[^A-Za-z0-9_]+/gu, '_').replace(/^(\d)/u, '_$1').toUpperCase()

/** The server name a form starts with: the entry's last segment without MCP words. */
export function suggestName(entryName) {
  const last = str(entryName).split('/').pop() ?? ''
  const base = last
    .replace(/^(?:mcp[-_]server[-_]|server[-_]|mcp[-_])/iu, '')
    .replace(/[-_](?:mcp[-_]server|mcp|server)$/iu, '')
    .replace(/[^A-Za-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
  return (base === '' ? 'mcp' : base).slice(0, 32)
}

/** Arguments the registry declares, as command-line tokens; optional ones without a value are left out. */
function argumentTokens(args) {
  const out = []
  for (const arg of list(args)) {
    if (!record(arg)) continue
    const value = str(arg.value) || str(arg.default)
    const filled = value !== '' ? value : arg.isRequired === true ? `<${str(arg.valueHint) || str(arg.name) || 'value'}>` : ''
    if (arg.type === 'named') {
      if (filled === '' && arg.isRequired !== true) continue
      out.push(token(str(arg.name)))
      if (filled !== '') out.push(token(filled))
    } else if (filled !== '') {
      out.push(token(filled))
    }
  }
  return out
}

/** Environment rows: secrets as references to a variable of the same name. */
function environmentRows(variables) {
  return list(variables).filter(item => record(item) && str(item.name) !== '').map(item => {
    const name = str(item.name)
    const secret = item.isSecret === true || (str(item.value) === '' && str(item.default) === '' && SECRET_NAME.test(name))
    return {
      name,
      value: secret ? name : str(item.value) || str(item.default),
      fromEnv: secret,
      ...(str(item.description) === '' ? {} : { description: str(item.description).slice(0, 200) }),
      ...(item.isRequired === true ? { required: true } : {}),
    }
  })
}

/** Header rows: `{placeholder}` values become environment templates. */
function headerRows(headers) {
  return list(headers).filter(item => record(item) && str(item.name) !== '').map(item => {
    const raw = str(item.value)
    const templated = raw.replace(/\{([A-Za-z0-9_.-]+)\}/gu, (_m, name) => `\${${variableFor(name)}}`)
    const fromEnv = templated !== raw
    return {
      name: str(item.name),
      value: fromEnv ? templated : item.isSecret === true ? '' : raw,
      fromEnv,
      ...(str(item.description) === '' ? {} : { description: str(item.description).slice(0, 200) }),
      ...(item.isRequired === true ? { required: true } : {}),
    }
  })
}

/** An OCI reference with the entry's version when the identifier has no tag. */
function imageRef(pkg) {
  const id = str(pkg.identifier)
  const tagged = /:[^/]+$/u.test(id) || id.includes('@sha256:')
  return tagged || str(pkg.version) === '' ? id : `${id}:${pkg.version}`
}

/**
 * The runnable options of one registry entry.
 * @param server - the entry's `server` object.
 * @returns `[{ kind, label, form, runtime? }]` and the options left out with why.
 */
export function registryOptions(server) {
  const name = suggestName(server?.name)
  const options = []
  const skipped = []
  for (const pkg of list(server?.packages)) {
    if (!record(pkg)) continue
    const transport = str(pkg.transport?.type) || 'stdio'
    const type = str(pkg.registryType)
    if (transport !== 'stdio') {
      skipped.push(`${type} ${str(pkg.identifier)}: ${transport} package (start it yourself, then add its URL)`)
      continue
    }
    const env = environmentRows(pkg.environmentVariables)
    const runtimeArgs = argumentTokens(pkg.runtimeArguments)
    const packageArgs = argumentTokens(pkg.packageArguments)
    let tokens
    let runtime
    if (type === 'npm') {
      runtime = 'npx'
      tokens = ['npx', '-y', ...runtimeArgs, `${str(pkg.identifier)}${str(pkg.version) === '' ? '' : `@${pkg.version}`}`, ...packageArgs]
    } else if (type === 'pypi') {
      runtime = 'uvx'
      tokens = ['uvx', ...runtimeArgs, `${str(pkg.identifier)}${str(pkg.version) === '' ? '' : `==${pkg.version}`}`, ...packageArgs]
    } else if (type === 'oci') {
      runtime = 'docker'
      const image = imageRef(pkg)
      // Some entries spell the whole `docker run` line as package arguments.
      if (packageArgs[0] === 'run' && packageArgs.includes(token(image))) {
        tokens = ['docker', ...packageArgs]
      } else {
        const declared = runtimeArgs.length > 0 ? runtimeArgs : ['-i', '--rm']
        tokens = ['docker', 'run', ...declared, ...env.flatMap(row => ['-e', row.name]), image, ...packageArgs]
      }
    } else {
      skipped.push(`${type || 'unknown'} ${str(pkg.identifier)}: this package type is not supported here`)
      continue
    }
    options.push({
      kind: type,
      label: `${type} · ${str(pkg.identifier)}${str(pkg.version) === '' ? '' : ` ${pkg.version}`}`,
      runtime,
      form: { name, transport: 'stdio', commandLine: tokens.join(' '), cwd: '', env, url: '', headers: [], bridge: false },
    })
  }
  for (const remote of list(server?.remotes)) {
    if (!record(remote) || str(remote.url) === '') continue
    const type = str(remote.type)
    if (type !== 'streamable-http' && type !== 'sse') continue
    const url = str(remote.url).replace(/\{([A-Za-z0-9_.-]+)\}/gu, (match, variable) => str(remote.variables?.[variable]?.default) || match)
    const bridge = type === 'sse'
    options.push({
      kind: type,
      label: `${type} · ${url}`,
      ...(bridge ? { runtime: 'npx' } : {}),
      form: { name, transport: 'streamable-http', commandLine: '', cwd: '', env: [], url, headers: headerRows(remote.headers), bridge },
    })
  }
  return { options, skipped }
}

/** The projection of one result the page shows. */
export function registryResult(entry) {
  const server = record(entry?.server) ? entry.server : entry
  const { options, skipped } = registryOptions(server)
  const repository = str(server?.repository?.url)
  return {
    name: str(server?.name),
    title: str(server?.title),
    description: str(server?.description).slice(0, 300),
    version: str(server?.version),
    ...(repository.startsWith('https://') ? { repository } : {}),
    ...(str(server?.websiteUrl).startsWith('https://') ? { website: str(server.websiteUrl) } : {}),
    options,
    skipped,
  }
}

/**
 * Search the registry.
 * @param options - the query, a cursor from a previous page, the registry
 *   base URL, `fetch`, and cancellation.
 * @returns `{ results, nextCursor? }`.
 */
export async function searchRegistry({ query, cursor, baseUrl = DEFAULT_REGISTRY_URL, fetchImpl = fetch, signal, timeoutMs = 15_000 }) {
  const search = typeof query === 'string' ? query.trim().slice(0, 100) : ''
  const url = new URL('/v0.1/servers', baseUrl)
  url.searchParams.set('version', 'latest')
  url.searchParams.set('limit', String(MAX_RESULTS))
  if (search !== '') url.searchParams.set('search', search)
  if (typeof cursor === 'string' && cursor !== '') url.searchParams.set('cursor', cursor.slice(0, 300))
  let response
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal === undefined ? [] : [signal])]) })
  } catch (error) {
    throw new Error(`MCP console: the MCP Registry could not be reached (${error?.cause?.code ?? error?.name ?? 'network error'}); check the network or proxy, or use AI quick add`)
  }
  if (!response.ok) throw new Error(`MCP console: the MCP Registry answered ${response.status}`)
  let body
  try {
    body = await response.json()
  } catch {
    throw new Error('MCP console: the MCP Registry sent an unreadable reply')
  }
  const results = list(body?.servers).map(registryResult).filter(result => result.name !== '')
  const next = str(body?.metadata?.nextCursor)
  return { results, ...(next === '' || results.length < MAX_RESULTS ? {} : { nextCursor: next }) }
}

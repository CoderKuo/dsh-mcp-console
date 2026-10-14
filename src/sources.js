/**
 * What AI quick add accepts: where an MCP server comes from.
 *
 * The person may paste a repository page, a package name, a Docker image, a
 * launch command copied from a README, or any web page (a registry entry, a
 * remote endpoint). Each input is classified so the prompt can tell the agent
 * what it is looking at and which way to run it first. The text only ever
 * reaches the prompt; nothing here runs it.
 *
 * @module dsh-mcp-console/sources
 */

import { normalizeRepository } from './repository.js'

const MAX_SOURCE_CHARS = 500
const CODE_HOST = /^(?:www\.)?(?:github\.com|gitlab\.com|gitee\.com|codeberg\.org|bitbucket\.org)$/u
const NPM_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(?:@[\w.^~<>=*-]+)?$/iu
const PYPI_NAME = /^[a-z0-9][\w.-]*(?:\[[\w,.-]+\])?(?:[=<>~!]=?[\w.*]+)?$/iu
const IMAGE_WITH_REGISTRY = /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/[\w./-]+(?::[\w.-]+)?(?:@sha256:[a-f0-9]{64})?$/iu
const IMAGE_WITH_TAG = /^[a-z0-9][\w.-]*\/[\w.-]+:[\w.-]+$/iu
const IMAGE_MCP_HUB = /^mcp\/[\w.-]+(?::[\w.-]+)?$/iu
const OWNER_REPO = /^[A-Za-z0-9][\w.-]*\/[\w.-]+$/u

const fail = () => {
  throw new Error('MCP console: enter a repository or web page link, an npm or PyPI package name, a Docker image, or a launch command such as npx -y <package>')
}

/** The package name without a version, for its registry page. */
const npmBase = name => name.replace(/^(@[^/]+\/[^@]+|[^@]+)@.*$/u, '$1')
const pypiBase = name => name.replace(/[[=<>~!].*$/u, '')

const npm = name => {
  if (!NPM_NAME.test(name)) fail()
  return { kind: 'npm', value: name, label: name, link: `https://www.npmjs.com/package/${npmBase(name)}` }
}
const pypi = name => {
  if (!PYPI_NAME.test(name)) fail()
  return { kind: 'pypi', value: name, label: name, link: `https://pypi.org/project/${pypiBase(name)}/` }
}
const docker = (value, image) => ({ kind: 'docker', value, label: image ?? value })
const repository = url => ({ kind: 'repository', value: url, label: url.replace(/^https?:\/\/(?:www\.)?github\.com\//u, ''), link: url })

/** The image of a `docker run` command: the first token that is neither an option nor an option's value. */
function dockerImage(tokens) {
  const valued = new Set(['-e', '--env', '-v', '--volume', '-p', '--publish', '--name', '--network', '--env-file', '-w', '--workdir', '-u', '--user', '--mount', '--entrypoint', '--platform', '-l', '--label'])
  for (let i = 2; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (valued.has(token)) i += 1
    else if (!token.startsWith('-')) return token
  }
  return undefined
}

/** A link: a code host repository, a registry package page, or any other page. */
function fromUrl(text) {
  let url
  try {
    url = new URL(text)
  } catch {
    fail()
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') fail()
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (CODE_HOST.test(host) && parts.length >= 2) return repository(normalizeRepository(text) ?? text)
  if (/(?:^|\.)npmjs\.(?:com|org)$/u.test(host) && parts[0] === 'package' && parts.length >= 2) {
    return npm(parts[1].startsWith('@') ? `${parts[1]}/${parts[2] ?? ''}` : parts[1])
  }
  if (/^(?:www\.)?pypi\.org$/u.test(host) && parts[0] === 'project' && parts.length >= 2) return pypi(parts[1])
  if (host === 'hub.docker.com' && parts[0] === 'r' && parts.length >= 3) return docker(`${parts[1]}/${parts[2]}`)
  if (host === 'hub.docker.com' && parts[0] === '_' && parts.length >= 2) return docker(parts[1])
  return { kind: 'url', value: url.toString(), label: `${host}${url.pathname === '/' ? '' : url.pathname}`, link: url.toString() }
}

/**
 * Classify what the person entered.
 * @param input - the text from the quick-add field.
 * @returns `{ kind, value, label, link? }` where `kind` is `repository`,
 *   `npm`, `pypi`, `package` (npm or PyPI, unknown which), `docker`, or `url`.
 */
export function classifySource(input) {
  const text = typeof input === 'string' ? input.trim() : ''
  if (text === '' || text.length > MAX_SOURCE_CHARS || /[\r\n]/u.test(text)) fail()
  const tokens = text.split(/\s+/u)
  const [first, second] = tokens

  if (first === 'npx' || (first === 'pnpm' && second === 'dlx') || (first === 'bunx')) {
    const name = tokens.slice(first === 'pnpm' ? 2 : 1).find(token => !token.startsWith('-'))
    return name === undefined ? fail() : npm(name)
  }
  if (first === 'uvx' || (first === 'pipx' && second === 'run')) {
    const name = tokens.slice(first === 'pipx' ? 2 : 1).find(token => !token.startsWith('-'))
    return name === undefined ? fail() : pypi(name)
  }
  if (/^(?:pip3?|uv)$/u.test(first) && tokens.includes('install')) {
    const name = tokens.slice(tokens.indexOf('install') + 1).find(token => !token.startsWith('-'))
    return name === undefined ? fail() : pypi(name)
  }
  if (first === 'docker' && (second === 'run' || second === 'pull')) {
    const image = second === 'pull' ? tokens.slice(2).find(token => !token.startsWith('-')) : dockerImage(tokens)
    return image === undefined ? fail() : docker(text, image)
  }
  if (tokens.length > 1) fail()

  if (/^https?:\/\//iu.test(text)) return fromUrl(text)
  if (/^(?:git@|github:|git\+https:)/u.test(text)) {
    const url = normalizeRepository(text)
    return url === undefined ? fail() : repository(url)
  }
  if (text.startsWith('npm:')) return npm(text.slice(4))
  if (text.startsWith('pypi:')) return pypi(text.slice(5))
  if (text.startsWith('docker:')) return docker(text.slice(7))
  if (text.startsWith('@')) return npm(text)
  if (IMAGE_WITH_REGISTRY.test(text) || IMAGE_WITH_TAG.test(text) || IMAGE_MCP_HUB.test(text)) return docker(text)
  if (OWNER_REPO.test(text)) return repository(`https://github.com/${text}`)
  if (NPM_NAME.test(text)) return { kind: 'package', value: text, label: text }
  return fail()
}

/**
 * Repository links, shared by the host and the page (no Node imports).
 *
 * @module dsh-mcp-console/repository
 */

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** A repository URL a person may follow: http(s) only. */
export function normalizeRepository(value) {
  let text = typeof value === 'string' ? value.trim() : record(value) && typeof value.url === 'string' ? value.url.trim() : ''
  if (text === '') return undefined
  text = text.replace(/^git\+/u, '').replace(/\.git$/u, '')
  if (/^github:/u.test(text)) text = `https://github.com/${text.slice('github:'.length)}`
  if (/^git@github\.com:/u.test(text)) text = `https://github.com/${text.slice('git@github.com:'.length)}`
  try {
    const url = new URL(text)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString().replace(/\/$/u, '') : undefined
  } catch {
    return undefined
  }
}

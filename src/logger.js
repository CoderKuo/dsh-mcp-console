/**
 * The plugin's own log: what each operation asked, how it ended, and how long
 * it took, so a problem in someone's DSH can be found afterwards. DSH sends a
 * plugin's `ctx.logger` to the console only, which a desktop user never sees.
 *
 * One JSON line per entry in `<DSH_HOME>/storages/dsh-mcp-console/logs/
 * YYYY-MM-DD.log`; files older than seven days and anything beyond 5 MB in
 * all are deleted. Every entry is also kept in memory (the last 300) for the
 * page's diagnostics, and mirrored to `ctx.logger`.
 *
 * Nothing secret is written: callers log names, not values; every value the
 * plugin has seen configured is registered with `mask()` and replaced, and
 * anything that reads like a token is masked too.
 *
 * @module dsh-mcp-console/logger
 */

import { appendFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

import { MASK } from './redact.js'

export const RETENTION_DAYS = 7
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024
const MAX_FIELD_CHARS = 4_000
const MEMORY_ENTRIES = 300
const MAX_SECRETS = 500
const FILE_NAME = /^\d{4}-\d{2}-\d{2}\.log$/u
/** Credentials in free text: bearer values, `key=value` pairs with a credential name, and opaque tokens. */
const TEXT_SECRETS = [
  /(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu,
  /(\b[\w-]*(?:key|token|secret|password|passwd|auth|credential|cookie)[\w-]*["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/giu,
  /()\b(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA)[-_A-Za-z0-9]{12,}/gu,
  /()\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/gu,
]

const day = date => date.toISOString().slice(0, 10)

/**
 * Create the log.
 * @param options - the log directory (a function, so it follows DSH_HOME),
 *   the console logger to mirror to, and a clock for tests.
 * @returns `{ write, info, warn, error, mask, clean, recent, prune, directory, file }`.
 */
export function createLog({ directory, mirror, now = () => new Date(), retentionDays = RETENTION_DAYS, maxBytes = MAX_TOTAL_BYTES } = {}) {
  const secrets = new Set()
  const memory = []
  let queue = Promise.resolve()
  let pruned
  let full = false

  /** Remember configured values so they never appear in the log. */
  const mask = values => {
    for (const value of Array.isArray(values) ? values : [values]) {
      if (typeof value !== 'string' || value.length < 6 || secrets.has(value)) continue
      if (secrets.size >= MAX_SECRETS) secrets.delete(secrets.values().next().value)
      secrets.add(value)
    }
  }

  /** A text with every registered value and every credential-looking run masked, and bounded. */
  const clean = (text, limit = MAX_FIELD_CHARS) => {
    let out = String(text ?? '')
    for (const secret of [...secrets].sort((x, y) => y.length - x.length)) out = out.split(secret).join(MASK)
    for (const pattern of TEXT_SECRETS) out = out.replace(pattern, (_match, prefix) => `${prefix}${MASK}`)
    return out.length > limit ? `${out.slice(0, limit)}… (${out.length - limit} more)` : out
  }

  const cleanValue = value => {
    if (typeof value === 'string') return clean(value)
    if (Array.isArray(value)) return value.slice(0, 50).map(cleanValue)
    if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, cleanValue(item)]))
    return value
  }

  /** Delete files past the retention, then the oldest until the total fits. */
  const prune = async () => {
    const dir = directory()
    let names
    try {
      names = (await readdir(dir)).filter(name => FILE_NAME.test(name)).sort()
    } catch {
      return
    }
    const oldest = day(new Date(now().getTime() - (retentionDays - 1) * 86_400_000))
    const kept = []
    for (const name of names) {
      if (name.slice(0, 10) < oldest) await unlink(join(dir, name)).catch(() => undefined)
      else kept.push(name)
    }
    const sizes = await Promise.all(kept.map(name => stat(join(dir, name)).then(info => info.size, () => 0)))
    let total = sizes.reduce((sum, size) => sum + size, 0)
    for (let i = 0; i < kept.length - 1 && total > maxBytes; i += 1) {
      await unlink(join(dir, kept[i])).catch(() => undefined)
      total -= sizes[i]
    }
    full = total > maxBytes
  }

  const file = () => join(directory(), `${day(now())}.log`)

  /**
   * Write one entry.
   * @param level - `info` | `warn` | `error`.
   * @param event - a short dotted name, e.g. `servers/add`.
   * @param fields - what to record (cleaned before it is kept).
   */
  const write = (level, event, fields = {}) => {
    const entry = { time: now().toISOString(), level, event, ...cleanValue(fields) }
    memory.push(entry)
    if (memory.length > MEMORY_ENTRIES) memory.shift()
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'
    try {
      mirror?.[method]?.('mcp-console: %s %s', event, JSON.stringify(fields).slice(0, 500))
    } catch {
      // The console is a convenience.
    }
    const line = `${JSON.stringify(entry)}\n`
    queue = queue.then(async () => {
      const today = day(now())
      if (pruned !== today) {
        pruned = today
        await mkdir(directory(), { recursive: true }).catch(() => undefined)
        await prune()
      }
      if (full) return
      await appendFile(file(), line, 'utf8')
    }).catch(() => undefined)
    return entry
  }

  return {
    write,
    info: (event, fields) => write('info', event, fields),
    warn: (event, fields) => write('warn', event, fields),
    error: (event, fields) => write('error', event, fields),
    mask,
    clean,
    prune,
    /** The last entries in memory, newest last; `errors` keeps only warnings and errors. */
    recent: ({ limit = 50, errors = false } = {}) => memory.filter(entry => !errors || entry.level !== 'info').slice(-limit),
    directory,
    file,
    /** Resolves once every queued write reached the file (for tests and shutdown). */
    flush: () => queue,
  }
}

/** The environment and header values of a config, to register with `mask()`. */
export function configValues(config) {
  const values = []
  const collect = map => {
    if (map === null || typeof map !== 'object') return
    for (const value of Object.values(map)) if (typeof value === 'string') values.push(value)
  }
  collect(config?.env)
  collect(config?.headers)
  return values
}

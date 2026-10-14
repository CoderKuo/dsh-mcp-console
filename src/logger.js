/**
 * The plugin's own log: what each operation asked, how it ended, and how long
 * it took, so a problem in someone's DSH can be found afterwards. DSH sends a
 * plugin's `ctx.logger` to the console only, which a desktop user never sees.
 *
 * One JSON line per entry in `<DSH_HOME>/storages/dsh-mcp-console/logs/`,
 * written to segments of at most 1 MB named `YYYY-MM-DD-NNN.log`. The log
 * rolls: on every write, segments older than seven days go, and while the
 * whole log is over 5 MB the oldest segment goes, so the newest entries are
 * always kept and the log never grows past the cap by more than one segment.
 * Every entry is also kept in memory (the last 300) for the page's
 * diagnostics, and mirrored to `ctx.logger`.
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
export const SEGMENT_BYTES = 1024 * 1024
const MAX_FIELD_CHARS = 4_000
const MEMORY_ENTRIES = 300
const MAX_SECRETS = 500
/** A segment (`2026-10-14-001.log`), or a single-file day from before segments (`2026-10-14.log`). */
const FILE_NAME = /^(\d{4}-\d{2}-\d{2})(?:-(\d{3}))?\.log$/u
/** Credentials in free text: bearer values, `key=value` pairs with a credential name, and opaque tokens. */
const TEXT_SECRETS = [
  /(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu,
  /(\b[\w-]*(?:key|token|secret|password|passwd|auth|credential|cookie)[\w-]*["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/giu,
  /()\b(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA)[-_A-Za-z0-9]{12,}/gu,
  /()\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/gu,
]

const day = date => date.toISOString().slice(0, 10)
const segmentName = (date, index) => `${date}-${String(index).padStart(3, '0')}.log`
/** Order segments oldest first; a single-file day counts as its first segment. */
const segmentKey = name => {
  const match = FILE_NAME.exec(name)
  return `${match[1]}-${match[2] ?? '000'}`
}

/**
 * Create the log.
 * @param options - the log directory (a function, so it follows DSH_HOME),
 *   the console logger to mirror to, a clock, and the limits (for tests).
 * @returns `{ write, info, warn, error, mask, clean, recent, directory, file, flush }`.
 */
export function createLog({ directory, mirror, now = () => new Date(), retentionDays = RETENTION_DAYS, maxBytes = MAX_TOTAL_BYTES, segmentBytes = SEGMENT_BYTES } = {}) {
  const secrets = new Set()
  const memory = []
  let queue = Promise.resolve()
  /** The segments on disk, oldest first, with their sizes; read once, then kept up to date. */
  let segments
  let segmentsDir

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

  /** Read the segments once: names and sizes, oldest first. */
  const load = async dir => {
    await mkdir(dir, { recursive: true }).catch(() => undefined)
    let names = []
    try {
      names = (await readdir(dir)).filter(name => FILE_NAME.test(name))
    } catch {
      // An unreadable directory: start empty; appends fail quietly.
    }
    names.sort((x, y) => (segmentKey(x) < segmentKey(y) ? -1 : 1))
    return Promise.all(names.map(async name => ({ name, bytes: await stat(join(dir, name)).then(info => info.size, () => 0) })))
  }

  /** Delete segments past the retention, then the oldest while the log is over the cap. */
  const roll = async dir => {
    const oldest = day(new Date(now().getTime() - (retentionDays - 1) * 86_400_000))
    while (segments.length > 1 && segments[0].name.slice(0, 10) < oldest) {
      await unlink(join(dir, segments.shift().name)).catch(() => undefined)
    }
    let total = segments.reduce((sum, item) => sum + item.bytes, 0)
    // The segment being written stays, so the newest entries are never lost.
    while (segments.length > 1 && total > maxBytes) {
      const gone = segments.shift()
      total -= gone.bytes
      await unlink(join(dir, gone.name)).catch(() => undefined)
    }
  }

  /** The segment the next line goes to: today's last one, or a new one when it is full or from another day. */
  const target = lineBytes => {
    const today = day(now())
    const last = segments.at(-1)
    const sameDay = last !== undefined && last.name.startsWith(today)
    if (sameDay && last.bytes + lineBytes <= segmentBytes) return last
    const index = sameDay ? Number(FILE_NAME.exec(last.name)[2] ?? '0') + 1 : 1
    const fresh = { name: segmentName(today, index), bytes: 0 }
    segments.push(fresh)
    return fresh
  }

  /** The segment being written, for the diagnostics and "open folder". */
  const file = () => join(directory(), segments?.at(-1)?.name ?? segmentName(day(now()), 1))

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
    const lineBytes = Buffer.byteLength(line, 'utf8')
    queue = queue.then(async () => {
      const dir = directory()
      if (segments === undefined || segmentsDir !== dir) {
        segments = await load(dir)
        segmentsDir = dir
      }
      const segment = target(lineBytes)
      await appendFile(join(dir, segment.name), line, 'utf8')
      segment.bytes += lineBytes
      await roll(dir)
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

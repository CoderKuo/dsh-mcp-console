/**
 * A change counter the page waits on instead of polling.
 *
 * The host bumps it on the events that change what the page shows — the tool
 * registry changed (an MCP server connected, synced, or dropped its tools),
 * the Plugin Manager changed the profile — and on this plugin's own actions.
 * The page asks to wait for a revision newer than the one it has; the answer
 * comes as soon as one exists, or after a bound so the request never hangs.
 *
 * @module dsh-mcp-console/changes
 */

/** Longest a wait is held before answering with the unchanged revision. */
export const MAX_WAIT_MS = 25_000

export function createChangeFeed({ now = Date.now } = {}) {
  let revision = 1
  const waiters = new Set()

  const bump = () => {
    revision += 1
    for (const waiter of [...waiters]) waiter()
  }

  /**
   * Resolve with the current revision once it differs from `known`, or after
   * `timeoutMs`, or when `signal` aborts.
   * @param known - the revision the page has.
   * @param options - the bound and the request's signal.
   * @returns `{ revision, changed }`.
   */
  const wait = (known, { timeoutMs = MAX_WAIT_MS, signal } = {}) => {
    if (known !== revision) return Promise.resolve({ revision, changed: true })
    return new Promise(resolve => {
      let timer
      const done = changed => {
        clearTimeout(timer)
        waiters.delete(onChange)
        signal?.removeEventListener?.('abort', onAbort)
        resolve({ revision, changed })
      }
      const onChange = () => done(true)
      const onAbort = () => done(false)
      waiters.add(onChange)
      timer = setTimeout(() => done(false), Math.max(0, Math.min(timeoutMs, MAX_WAIT_MS)))
      signal?.addEventListener?.('abort', onAbort, { once: true })
    })
  }

  return Object.freeze({
    bump,
    wait,
    current: () => revision,
    /** Answer every pending wait, for unload. */
    close: () => {
      for (const waiter of [...waiters]) waiter()
    },
    startedAt: now(),
  })
}

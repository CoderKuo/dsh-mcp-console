/**
 * The diagnostics text the page offers to copy: versions, the environment,
 * every server's state, and the recent problems from the log. It is meant to
 * be pasted to whoever helps; it carries no configured value (servers appear
 * as their redacted projection, and the text goes through the log's mask).
 *
 * @module dsh-mcp-console/diagnostics
 */

import { safeUrl } from './audit.js'

const line = (label, value) => `${label}: ${value === undefined || value === null || value === '' ? '—' : value}`

/**
 * Build the text.
 * @param facts - versions, platform, the listing from `listServers`, the
 *   runtimes, the recent log entries, and the log location.
 * @returns the diagnostics text.
 */
export function buildDiagnostics({ pluginVersion, pageVersion, dshVersion, platform, arch, nodeVersion, manageable, sessions, servers = [], runtimes, recent = [], logFile, bundleDir, time = new Date() }) {
  const out = [
    '## dsh-mcp-console diagnostics',
    line('time', time.toISOString()),
    line('plugin (host)', pluginVersion),
    line('plugin (page)', pageVersion),
    line('DSH', dshVersion),
    line('system', `${platform} ${arch}, node ${nodeVersion}`),
    line('plugin manager', manageable ? 'available' : 'missing'),
    line('sessions', sessions ? 'available' : 'missing'),
    line('bundle directory', bundleDir),
    line('log file', logFile),
  ]
  if (runtimes !== undefined && runtimes !== null) {
    out.push(line('runtimes', Object.entries(runtimes).map(([name, item]) => `${name}=${item.found ? item.version ?? 'yes' : 'no'}`).join(' ')))
  }
  out.push('', `## servers (${servers.length})`)
  for (const server of servers) {
    const config = server.config ?? {}
    const target = config.transport === 'streamable-http' ? safeUrl(config.url) : [config.command, ...(config.args ?? [])].filter(Boolean).join(' ')
    const facts = [
      server.status,
      config.transport,
      `${server.toolCount ?? 0} tools`,
      server.enabled ? 'on' : 'off',
      server.toggleable ? `switch:${server.toggleVia ?? 'row'}` : `read-only${server.readOnlyReason ? `(${server.readOnlyReason})` : ''}`,
      server.bundle ? `bundle ${server.bundle.name}${server.bundle.version ? `@${server.bundle.version}` : ''}${server.bundle.disabled ? ' (off)' : ''}` : 'profile row',
    ]
    out.push(`- ${server.name}: ${facts.join(' · ')}`)
    if (target) out.push(`    ${target}`)
    if (config.env?.length) out.push(`    env: ${config.env.map(item => `${item.name}(${item.source})`).join(' ')}`)
    if (config.headers?.length) out.push(`    headers: ${config.headers.map(item => `${item.name}(${item.source})`).join(' ')}`)
    if (server.error) out.push(`    error: ${String(server.error).split('\n').slice(0, 3).join(' / ')}`)
  }
  out.push('', `## recent problems (${recent.length})`)
  if (recent.length === 0) out.push('none')
  for (const entry of recent) {
    const detail = entry.error?.message ?? entry.result?.message ?? entry.result?.reason ?? entry.detail ?? ''
    const code = entry.error?.code ? ` [${entry.error.code}]` : ''
    out.push(`- ${entry.time} ${entry.level} ${entry.event}${code}: ${String(detail).split('\n').slice(0, 4).join(' / ').slice(0, 600)}`)
    if (entry.request && Object.keys(entry.request).length > 0) out.push(`    request: ${JSON.stringify(entry.request).slice(0, 400)}`)
    if (entry.result?.output) out.push(`    output: ${String(entry.result.output).split('\n').slice(-6).join(' / ').slice(0, 600)}`)
  }
  return `${out.join('\n')}\n`
}

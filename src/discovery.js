/**
 * Find local software that may be reachable over MCP.
 *
 * Three read-only sources, gathered host-side:
 * - running processes, background services, listening ports, and installed
 *   applications, from the platform's own tools (PowerShell on Windows;
 *   `ps`, `lsof`/`ss`, `systemctl`, `/Applications` elsewhere), with system
 *   components filtered out;
 * - MCP servers already configured in other AI clients (Claude Desktop,
 *   Claude Code, Cursor, VS Code, Windsurf, Codex): names and commands only,
 *   with credential-looking arguments masked and no environment values;
 * - running Docker containers, when Docker answers.
 * Commands run through `ctx.subprocess` with its scrubbed environment and a
 * timeout. Nothing is sent anywhere from here: the page shows the result and
 * the person decides whether an AI session gets it.
 *
 * @module dsh-mcp-console/discovery
 */

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { DEFAULT_SCAN_TIMEOUT_MS } from './constants.js'
import { redactArgs } from './redact.js'

const MAX_ITEMS = 200

const WINDOWS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
# Windows PowerShell writes stdout in the console code page (GBK on Chinese
# Windows); the host decodes UTF-8, so non-ASCII names would arrive garbled.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$sys = @('C:\Windows', 'C:\Program Files\WindowsApps', 'C:\Program Files\Windows')
function IsSystem($path) { if (-not $path) { return $true }; foreach ($p in $sys) { if ($path -like "$p*") { return $true } }; return $false }
$procs = Get-Process | Where-Object { $_.Path -and -not (IsSystem $_.Path) } | ForEach-Object {
  $info = $_.MainModule.FileVersionInfo
  [pscustomobject]@{ name = $_.ProcessName; path = $_.Path; company = $info.CompanyName; product = $info.ProductName; id = $_.Id }
} | Where-Object { $_.company -notlike 'Microsoft*' } | Sort-Object name -Unique
$byPid = @{}; foreach ($p in $procs) { $byPid[[int]$p.id] = $p.name }
$ports = Get-NetTCPConnection -State Listen | Where-Object { $byPid.ContainsKey([int]$_.OwningProcess) } | ForEach-Object {
  [pscustomobject]@{ port = $_.LocalPort; address = $_.LocalAddress; process = $byPid[[int]$_.OwningProcess] }
} | Sort-Object port -Unique
$services = Get-CimInstance Win32_Service -Filter "State='Running'" | Where-Object { $_.PathName -and $_.PathName -notmatch '\\Windows\\' } | ForEach-Object {
  [pscustomobject]@{ name = $_.Name; display = $_.DisplayName; path = ($_.PathName -replace '"', '') }
}
$keys = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
$apps = Get-ItemProperty $keys | Where-Object { $_.DisplayName -and -not $_.SystemComponent -and $_.Publisher -notlike 'Microsoft*' } | ForEach-Object {
  [pscustomobject]@{ name = $_.DisplayName; publisher = $_.Publisher; version = $_.DisplayVersion }
} | Sort-Object name -Unique
[pscustomobject]@{ processes = @($procs | Select-Object name, path, company, product); services = @($services); ports = @($ports); apps = @($apps) } | ConvertTo-Json -Depth 3 -Compress
`

/** Where other AI clients keep their MCP server lists. */
export function clientConfigPaths({ home = homedir(), appData = process.env.APPDATA, platform = process.platform } = {}) {
  const roaming = appData ?? (platform === 'darwin' ? join(home, 'Library', 'Application Support') : join(home, '.config'))
  return [
    { client: 'Claude Desktop', path: join(roaming, 'Claude', 'claude_desktop_config.json'), format: 'json' },
    { client: 'Claude Code', path: join(home, '.claude.json'), format: 'json' },
    { client: 'Cursor', path: join(home, '.cursor', 'mcp.json'), format: 'json' },
    { client: 'Windsurf', path: join(home, '.codeium', 'windsurf', 'mcp_config.json'), format: 'json' },
    { client: 'VS Code', path: join(roaming, 'Code', 'User', 'mcp.json'), format: 'json' },
    { client: 'Codex', path: join(home, '.codex', 'config.toml'), format: 'toml' },
  ]
}

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * The MCP servers one client file declares: name, command or URL, masked args.
 * @param text - the file's content.
 * @param format - `json` or `toml`.
 * @returns `[{ name, command?, args?, url? }]`.
 */
export function parseClientServers(text, format) {
  if (format === 'toml') {
    const servers = []
    const sections = text.split(/^\s*\[/mu)
    // TOML strings: "basic" or 'literal'.
    const string = (section, key) => {
      const match = new RegExp(`^\\s*${key}\\s*=\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)')`, 'mu').exec(section)
      return match === null ? undefined : match[1] ?? match[2]
    }
    for (const section of sections) {
      // `[mcp_servers.name]` is a server; `[mcp_servers.name.env]` is one of its sub-tables.
      const header = /^mcp_servers\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\]/u.exec(section)
      if (header === null) continue
      const command = string(section, 'command')
      const argsText = /^\s*args\s*=\s*\[([^\]]*)\]/mu.exec(section)?.[1]
      const args = argsText === undefined ? [] : [...argsText.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/gu)].map(match => match[1] ?? match[2])
      const url = string(section, 'url')
      servers.push({ name: header[1] ?? header[2], ...(command === undefined ? {} : { command }), ...(args.length === 0 ? {} : { args: redactArgs(args) }), ...(url === undefined ? {} : { url }) })
    }
    return servers
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  const maps = [parsed?.mcpServers, parsed?.servers, parsed?.mcp?.servers]
  // Claude Code also keeps per-project servers.
  if (record(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers)
  const servers = new Map()
  for (const map of maps) {
    if (!record(map)) continue
    for (const [name, value] of Object.entries(map)) {
      if (!record(value) || servers.has(name)) continue
      const url = typeof value.url === 'string' ? value.url : typeof value.serverUrl === 'string' ? value.serverUrl : undefined
      servers.set(name, {
        name,
        ...(typeof value.command === 'string' ? { command: value.command } : {}),
        ...(Array.isArray(value.args) && value.args.length > 0 ? { args: redactArgs(value.args) } : {}),
        ...(url === undefined ? {} : { url: url.replace(/([?&][^=]*(?:key|token|secret)[^=]*=)[^&]*/giu, '$1••••••') }),
      })
    }
  }
  return [...servers.values()]
}

/** Read every known client file that exists. */
export async function readClientServers(paths = clientConfigPaths()) {
  const found = []
  for (const { client, path, format } of paths) {
    let text
    try {
      text = await readFile(path, 'utf8')
    } catch {
      continue
    }
    const servers = parseClientServers(text, format)
    if (servers.length > 0) found.push({ client, path, servers })
  }
  return found
}

/**
 * A command runner over `ctx.subprocess`: argv in, stdout text out, bounded.
 * @param subprocess - `ctx.subprocess`.
 * @param options - working directory and timeout.
 * @returns `(argv) => Promise<string>`; a failing or missing command yields ''.
 */
export function createRunner(subprocess, { cwd = homedir(), timeoutMs = DEFAULT_SCAN_TIMEOUT_MS } = {}) {
  return async argv => {
    if (subprocess === undefined) return ''
    let executable
    try {
      executable = await subprocess.resolveExecutable(argv[0])
    } catch {
      return ''
    }
    const signal = AbortSignal.timeout(timeoutMs)
    let handle
    try {
      handle = subprocess.spawn({
        argv: [executable, ...argv.slice(1)],
        cwd,
        stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' },
        graceMs: 2_000,
        signal,
      })
    } catch {
      return ''
    }
    const chunks = []
    let size = 0
    handle.stdout?.on('data', chunk => {
      if (size > 4 * 1024 * 1024) return
      size += chunk.length
      chunks.push(chunk)
    })
    try {
      await handle.done
      await handle.waitForExit(AbortSignal.timeout(5_000)).catch(() => false)
    } catch {
      return ''
    }
    return Buffer.concat(chunks).toString('utf8')
  }
}

const take = (list, limit = MAX_ITEMS) => (Array.isArray(list) ? list.slice(0, limit) : [])
const lines = text => text.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
const unique = list => [...new Set(list)]

/** Windows inventory from one PowerShell run. */
async function windowsInventory(run) {
  const raw = await run(['powershell', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WINDOWS_SCRIPT])
  let parsed = {}
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/u, '').trim() || '{}')
  } catch {
    parsed = {}
  }
  const asList = value => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])
  return {
    processes: take(asList(parsed.processes).map(item => ({ name: item.name, company: item.company ?? undefined, product: item.product ?? undefined, path: item.path }))),
    services: take(asList(parsed.services).map(item => ({ name: item.name, display: item.display, path: item.path }))),
    ports: take(asList(parsed.ports).map(item => ({ port: item.port, address: item.address, process: item.process }))),
    apps: take(asList(parsed.apps).map(item => ({ name: item.name, publisher: item.publisher ?? undefined, version: item.version ?? undefined }))),
  }
}

/** macOS and Linux inventory from the usual tools. */
async function unixInventory(run, platform) {
  const ps = await run(['ps', '-axo', 'comm='])
  const systemPrefix = platform === 'darwin' ? /^\/(?:System|usr\/(?:libexec|sbin)|sbin)\//u : /^(?:\[|\/(?:usr\/)?(?:s?bin|lib)\/(?:systemd|kworker))/u
  const processes = unique(lines(ps).filter(line => !systemPrefix.test(line)).map(line => line.split('/').pop())).map(name => ({ name }))
  const ports = []
  const lsof = await run(['lsof', '-nP', '-iTCP', '-sTCP:LISTEN'])
  for (const line of lines(lsof).slice(1)) {
    const cols = line.split(/\s+/u)
    const port = Number(/:(\d+)$/u.exec(cols[8] ?? '')?.[1])
    if (Number.isFinite(port)) ports.push({ port, process: cols[0] })
  }
  if (ports.length === 0 && platform === 'linux') {
    const ss = await run(['ss', '-ltnpH'])
    for (const line of lines(ss)) {
      const port = Number(/:(\d+)\s/u.exec(line)?.[1])
      const process = /users:\(\("([^"]+)"/u.exec(line)?.[1]
      if (Number.isFinite(port)) ports.push({ port, ...(process === undefined ? {} : { process }) })
    }
  }
  const services = []
  if (platform === 'linux') {
    const units = await run(['systemctl', 'list-units', '--type=service', '--state=running', '--no-legend', '--plain'])
    for (const line of lines(units)) services.push({ name: line.split(/\s+/u)[0] })
  } else if (platform === 'darwin') {
    const brew = await run(['brew', 'services', 'list'])
    for (const line of lines(brew).slice(1)) {
      const [name, status] = line.split(/\s+/u)
      if (status === 'started') services.push({ name })
    }
  }
  const apps = []
  if (platform === 'darwin') {
    const listing = await run(['ls', '/Applications'])
    for (const line of lines(listing)) if (line.endsWith('.app')) apps.push({ name: line.slice(0, -4) })
  }
  const byPort = new Map()
  for (const item of ports) if (!byPort.has(item.port)) byPort.set(item.port, item)
  return { processes: take(processes), services: take(services), ports: take([...byPort.values()]), apps: take(apps) }
}

/** Running Docker containers, when Docker answers. */
async function dockerContainers(run) {
  const out = await run(['docker', 'ps', '--format', '{{.Names}}\t{{.Image}}\t{{.Ports}}'])
  return take(lines(out).map(line => {
    const [name, image, ports] = line.split('\t')
    return { name, image, ...(ports ? { ports } : {}) }
  }), 50)
}

/**
 * Gather the whole inventory.
 * @param options - the command runner, the platform, and the client config paths.
 * @returns `{ platform, processes, services, ports, apps, containers, clients, scannedAt }`.
 */
export async function scanLocal({ run, platform = process.platform, clientPaths, now = Date.now } = {}) {
  const [system, containers, clients] = await Promise.all([
    platform === 'win32' ? windowsInventory(run) : unixInventory(run, platform),
    dockerContainers(run),
    readClientServers(clientPaths),
  ])
  return { platform, ...system, containers, clients, scannedAt: now() }
}

/**
 * The inventory as compact text for an AI session.
 * @param scan - the result of {@link scanLocal}.
 * @returns plain text, one item per line, grouped by source.
 */
export function inventoryText(scan) {
  const out = [`platform: ${scan.platform}`]
  const section = (title, items, format) => {
    if (!Array.isArray(items) || items.length === 0) return
    out.push('', `## ${title} (${items.length})`)
    for (const item of items) out.push(`- ${format(item)}`)
  }
  section('installed applications', scan.apps, item => [item.name, item.publisher && `by ${item.publisher}`, item.version && `v${item.version}`].filter(Boolean).join(' '))
  section('background services', scan.services, item => [item.name, item.display && item.display !== item.name && `(${item.display})`].filter(Boolean).join(' '))
  section('running processes', scan.processes, item => [item.name, item.product && `[${item.product}]`, item.company && `by ${item.company}`].filter(Boolean).join(' '))
  section('listening TCP ports', scan.ports, item => `${item.port}${item.process ? ` ← ${item.process}` : ''}`)
  section('docker containers', scan.containers, item => `${item.name} (${item.image})${item.ports ? ` ${item.ports}` : ''}`)
  for (const client of scan.clients ?? []) {
    section(`MCP servers configured in ${client.client}`, client.servers, item => [item.name, item.command && `command: ${[item.command, ...(item.args ?? [])].join(' ')}`, item.url && `url: ${item.url}`].filter(Boolean).join(' — '))
  }
  return out.join('\n')
}

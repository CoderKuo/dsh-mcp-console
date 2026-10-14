import assert from 'node:assert/strict'
import test from 'node:test'

import { FIBER_STATE, MCP_MODULE } from '../src/constants.js'
import { clientConfigPaths, createRunner, inventoryText, parseClientServers, scanLocal } from '../src/discovery.js'
import { discoveryPrompt, quickAddPrompt } from '../src/prompts.js'
import { MASK, redactArgs, redactConfig } from '../src/redact.js'
import { acceptRepositoryUrl, createConsoleRpc } from '../src/rpc.js'
import { listServers, normalizeRepository, serverStatus, setServerEnabled, toolsByServer } from '../src/servers.js'
import { openPromptSession, resolveDefaultWorkspace } from '../src/sessions.js'

// ── redaction ───────────────────────────────────────────────────────────────

test('secrets never reach the browser projection', () => {
  const view = redactConfig({
    serverName: 'github',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github', '--api-key', 'sk-live-0123456789abcdef', '--token=abc', 'ghp_0123456789abcdefABCDEF'],
    env: { GITHUB_TOKEN: { __jsExpr: 'process.env.GITHUB_TOKEN' }, DEBUG: '1', PLAIN_SECRET: 'hunter2' },
  })
  assert.deepEqual(view.args, ['-y', '@modelcontextprotocol/server-github', '--api-key', MASK, `--token=${MASK}`, MASK])
  assert.deepEqual(view.env, [
    { name: 'GITHUB_TOKEN', source: 'expression' },
    { name: 'DEBUG', source: 'literal' },
    { name: 'PLAIN_SECRET', source: 'literal' },
  ])
  assert.equal(JSON.stringify(view).includes('hunter2'), false)
  assert.equal(JSON.stringify(view).includes('sk-live'), false)
})

test('http servers show their URL without credentials and header names only', () => {
  const view = redactConfig({
    serverName: 'web',
    transport: 'streamable-http',
    url: 'https://user:pass@mcp.example/mcp?api_key=secret&mode=x',
    headers: { Authorization: { __jsExpr: '`Bearer ${process.env.T}`' } },
  })
  assert.equal(view.url.includes('pass'), false)
  assert.equal(view.url.includes('secret'), false)
  assert.match(view.url, /mode=x/u)
  assert.deepEqual(view.headers, [{ name: 'Authorization', source: 'expression' }])
})

test('expressions are shown as written, plain paths are kept', () => {
  assert.deepEqual(redactArgs([{ __jsExpr: 'process.cwd()' }, 'C:\\tools\\server.py', '--port', '8080']), ['!!js process.cwd()', 'C:\\tools\\server.py', '--port', '8080'])
})

// ── servers ─────────────────────────────────────────────────────────────────

test('status follows the row, the fiber, and the tools it registered', () => {
  assert.equal(serverStatus({ disabled: true, fiberState: FIBER_STATE.ACTIVE }, 3), 'disabled')
  assert.equal(serverStatus({ disabled: false, fiberState: FIBER_STATE.FAILED }, 0), 'failed')
  assert.equal(serverStatus({ disabled: false, fiberState: FIBER_STATE.ACTIVE }, 2), 'connected')
  assert.equal(serverStatus({ disabled: false, fiberState: FIBER_STATE.ACTIVE }, 0), 'starting')
  assert.equal(serverStatus({ disabled: false, fiberState: FIBER_STATE.LOADING }, 0), 'starting')
  assert.equal(serverStatus({ disabled: false, fiberState: undefined }, 0), 'stopped')
})

test('tools are grouped by the server prefix dsh-mcp-client registers', () => {
  const grouped = toolsByServer([{ name: 'mcp__github__create_issue' }, { name: 'mcp__github__search' }, { name: 'mcp__web__fetch' }, { name: 'bash' }])
  assert.deepEqual(grouped.get('github'), ['create_issue', 'search'])
  assert.deepEqual(grouped.get('web'), ['fetch'])
  assert.equal(grouped.has('bash'), false)
})

test('repository links are normalized to http(s) pages', () => {
  assert.equal(normalizeRepository('git+https://github.com/a/b.git'), 'https://github.com/a/b')
  assert.equal(normalizeRepository('github:a/b'), 'https://github.com/a/b')
  assert.equal(normalizeRepository({ type: 'git', url: 'git@github.com:a/b.git' }), 'https://github.com/a/b')
  assert.equal(normalizeRepository('javascript:alert(1)'), undefined)
  assert.equal(normalizeRepository(''), undefined)
})

function fakeLoader(rows) {
  return { entries: () => rows.map(row => ({ id: `include:${row.id}`, options: { id: row.id, name: row.name ?? MCP_MODULE, config: row.config }, disabled: row.disabled === true, fiber: row.fiber })) }
}

test('the list joins rows, tools, enablement and bundle repositories', async () => {
  const loader = fakeLoader([
    { id: 'mcp-github', config: { serverName: 'github', transport: 'stdio', command: 'npx', args: [] }, fiber: { state: FIBER_STATE.ACTIVE } },
    { id: 'mcp-web', config: { serverName: 'web', transport: 'streamable-http', url: 'http://localhost:3000/mcp' }, disabled: true },
    { id: 'other', name: 'something-else', config: {} },
  ])
  const tools = { schemas: () => [{ name: 'mcp__github__search' }] }
  const pluginManager = {
    listPlugins: async () => [{ entryId: 'include:mcp-github', patchId: 'mcp-github' }, { entryId: 'include:mcp-web', readOnlyReason: 'unaddressable' }],
    listBundles: async () => [],
  }
  const { servers, manageable } = await listServers({ loader, tools, pluginManager, repositories: { 'mcp-web': 'https://github.com/x/web-mcp' } })
  assert.equal(manageable, true)
  assert.deepEqual(servers.map(server => [server.name, server.status, server.toggleable, server.toolCount]), [
    ['github', 'connected', true, 1],
    ['web', 'disabled', false, 0],
  ])
  assert.equal(servers[1].readOnlyReason, 'unaddressable')
  assert.equal(servers[1].repository, 'https://github.com/x/web-mcp')
})

test('without the Plugin Manager the list is read-only', async () => {
  const { servers, manageable } = await listServers({ loader: fakeLoader([{ id: 'a', config: { serverName: 'a', transport: 'stdio', command: 'x' } }]) })
  assert.equal(manageable, false)
  assert.equal(servers[0].toggleable, false)
  await assert.rejects(() => setServerEnabled(undefined, 'include:a', true), /Plugin Manager is not available/u)
})

test('toggling goes through the Plugin Manager and reports its outcome', async () => {
  const calls = []
  const pluginManager = { setPluginEnabled: async (id, enabled) => { calls.push([id, enabled]); return { application: 'restart-required' } } }
  assert.deepEqual(await setServerEnabled(pluginManager, 'include:a', false), { application: 'restart-required' })
  assert.deepEqual(calls, [['include:a', false]])
})

// ── sessions ────────────────────────────────────────────────────────────────

test('the default workspace comes from the registry, else the newest one', async () => {
  const a = { id: 'w1', title: 'project', updatedAt: '2026-10-01T00:00:00Z' }
  const b = { id: 'w2', title: 'other', updatedAt: '2026-10-10T00:00:00Z' }
  assert.equal(await resolveDefaultWorkspace({ initializeDefault: async () => a, list: () => [a, b] }), a)
  const noDefault = { initializeDefault: async resolve => resolve(), list: () => [a, b] }
  assert.equal(await resolveDefaultWorkspace(noDefault), b)
  const named = { id: 'w3', title: 'default-workspace', updatedAt: '2026-01-01T00:00:00Z' }
  assert.equal(await resolveDefaultWorkspace({ initializeDefault: async () => undefined, list: () => [b, named] }), named)
  assert.equal(await resolveDefaultWorkspace({ list: () => [] }), undefined)
})

test('a prompt session is created in the workspace, titled, and sent the prompt as a user message', async () => {
  const calls = []
  const sessionController = {
    create: async request => { calls.push(['create', request]); return { sessionId: 'session-1' } },
    rename: async request => { calls.push(['rename', request]); return { title: request.title, seq: 1 } },
    prompt: async request => { calls.push(['prompt', request]); return { accepted: true } },
  }
  const result = await openPromptSession({
    sessionController,
    workspaceRegistry: { initializeDefault: async () => ({ id: 'w1' }), list: () => [] },
    agentPreset: 'cordis',
    title: '安装 MCP：a/b',
    text: 'install it',
  })
  assert.deepEqual(result, { sessionId: 'session-1', workspaceId: 'w1' })
  assert.deepEqual(calls[0], ['create', { workspaceId: 'w1', agentPreset: 'cordis' }])
  assert.equal(calls[1][1].title, '安装 MCP：a/b')
  assert.equal(calls[2][1].sessionId, 'session-1')
  assert.equal(calls[2][1].mode, 'queue')
  assert.deepEqual(calls[2][1].content, [{ type: 'text', text: 'install it' }])
  assert.match(calls[2][1].requestId, /^[0-9a-f-]{36}$/u)
})

test('a session cannot open without the controller or a prompt', async () => {
  await assert.rejects(() => openPromptSession({ text: 'x' }), /session controller is not available/u)
  await assert.rejects(() => openPromptSession({ sessionController: {}, text: ' ' }), /prompt is empty/u)
})

// ── prompts ─────────────────────────────────────────────────────────────────

test('the quick-add prompt follows the documented bundle procedure', () => {
  const text = quickAddPrompt({ repositoryUrl: 'https://github.com/upstash/context7', notes: '用 npx', existingNames: ['github'], bundleDir: 'C:\\dsh\\mcp-bundles', locale: 'zh' })
  assert.match(text, /https:\/\/github\.com\/upstash\/context7/u)
  assert.match(text, /plugin_manager/u)
  assert.match(text, /install_bundle/u)
  assert.match(text, /@deepseek-ai\/dsh-mcp-client/u)
  assert.match(text, /C:\\dsh\\mcp-bundles/u)
  assert.match(text, /"repository": "https:\/\/github\.com\/upstash\/context7"/u)
  assert.match(text, /不要重名）：github/u)
  assert.match(text, /用 npx/u)
  assert.match(text, /!!js process\.env/u)
  assert.match(quickAddPrompt({ repositoryUrl: 'https://github.com/a/b', bundleDir: '/b', locale: 'en' }), /Install the open-source MCP server/u)
})

test('the discovery prompt carries the inventory and asks before installing', () => {
  const text = discoveryPrompt({ inventory: 'platform: win32\n- Docker Desktop', existingNames: [], bundleDir: '/b', locale: 'zh' })
  assert.match(text, /Docker Desktop/u)
  assert.match(text, /先不要安装/u)
  const long = discoveryPrompt({ inventory: 'x'.repeat(30_000), bundleDir: '/b', locale: 'en' })
  assert.match(long, /Inventory \(truncated\)/u)
  assert.ok(long.length < 30_000)
})

// ── discovery ───────────────────────────────────────────────────────────────

test('MCP servers of other clients are read without secrets', () => {
  const json = JSON.stringify({
    mcpServers: { context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp', '--api-key', 'ctx7sk-0123456789abcdef0123'], env: { KEY: 'secret-value' } } },
    projects: { 'C:/p': { mcpServers: { local: { url: 'http://localhost:9000/mcp?token=abc' } } } },
  })
  const servers = parseClientServers(json, 'json')
  assert.deepEqual(servers.map(server => server.name), ['context7', 'local'])
  assert.deepEqual(servers[0].args, ['-y', '@upstash/context7-mcp', '--api-key', MASK])
  assert.equal(JSON.stringify(servers).includes('secret-value'), false)
  assert.equal(servers[1].url.includes('abc'), false)

  const toml = [
    '[mcp_servers]',
    '[mcp_servers.ida-pro-mcp]',
    "command = 'C:\\Python\\python.exe'",
    "args = ['C:\\ida\\server.py']",
    '[mcp_servers.node_repl]',
    'command = "node_repl.exe"',
    '[mcp_servers.node_repl.env]',
    'TOKEN = "x"',
    '[mcp_servers."quoted.name"]',
    'url = "http://localhost:1/mcp"',
  ].join('\n')
  assert.deepEqual(parseClientServers(toml, 'toml'), [
    { name: 'ida-pro-mcp', command: 'C:\\Python\\python.exe', args: ['C:\\ida\\server.py'] },
    { name: 'node_repl', command: 'node_repl.exe' },
    { name: 'quoted.name', url: 'http://localhost:1/mcp' },
  ])
  assert.deepEqual(parseClientServers('not json', 'json'), [])
})

test('client config locations cover the common clients', () => {
  const paths = clientConfigPaths({ home: '/home/u', appData: undefined, platform: 'linux' }).map(item => item.client)
  for (const client of ['Claude Desktop', 'Claude Code', 'Cursor', 'Windsurf', 'VS Code', 'Codex']) assert.ok(paths.includes(client), client)
})

test('the Windows scan parses one PowerShell run and Docker', async () => {
  const run = async argv => {
    if (argv[0] === 'powershell') {
      return JSON.stringify({
        processes: [{ name: 'Docker Desktop', company: 'Docker Inc.', product: 'Docker Desktop', path: 'C:\\Program Files\\Docker\\Docker Desktop.exe' }],
        services: { name: 'postgresql-x64-16', display: 'PostgreSQL 16', path: 'C:\\pg\\bin\\pg_ctl.exe' },
        ports: [{ port: 5432, address: '0.0.0.0', process: 'postgres' }],
        apps: [{ name: 'Obsidian', publisher: 'Obsidian', version: '1.6.0' }],
      })
    }
    if (argv[0] === 'docker') return 'redis\tredis:7\t0.0.0.0:6379->6379/tcp\n'
    return ''
  }
  const scan = await scanLocal({ run, platform: 'win32', clientPaths: [], now: () => 1 })
  assert.equal(scan.services.length, 1, 'a single object is a one-item list')
  assert.equal(scan.containers[0].image, 'redis:7')
  const text = inventoryText(scan)
  assert.match(text, /Obsidian by Obsidian v1\.6\.0/u)
  assert.match(text, /PostgreSQL 16/u)
  assert.match(text, /5432 ← postgres/u)
  assert.match(text, /redis \(redis:7\)/u)
  assert.equal(text.includes('C:\\Program Files'), false, 'paths stay out of the inventory text')
})

test('the Linux scan reads ps, ss and systemctl', async () => {
  const run = async argv => ({
    ps: '/usr/bin/ollama\n/usr/lib/systemd/systemd-journald\n[kworker/0:1]\n',
    lsof: '',
    ss: 'LISTEN 0 4096 127.0.0.1:11434 0.0.0.0:* users:(("ollama",pid=1,fd=3))\n',
    systemctl: 'ollama.service loaded active running Ollama\n',
  })[argv[0]] ?? ''
  const scan = await scanLocal({ run, platform: 'linux', clientPaths: [] })
  assert.deepEqual(scan.processes.map(item => item.name), ['ollama'])
  assert.deepEqual(scan.ports, [{ port: 11434, process: 'ollama' }])
  assert.deepEqual(scan.services, [{ name: 'ollama.service' }])
})

test('the runner uses ctx.subprocess and turns any failure into empty output', async () => {
  const { PassThrough } = await import('node:stream')
  const spawned = []
  const subprocess = {
    resolveExecutable: async name => {
      if (name === 'missing') throw new Error('not found')
      return `/bin/${name}`
    },
    spawn: spec => {
      spawned.push(spec)
      const stdout = new PassThrough()
      queueMicrotask(() => { stdout.end('hello') })
      return { stdout, done: new Promise(resolve => stdout.on('end', () => resolve({ code: 0 }))), waitForExit: async () => true }
    },
  }
  const run = createRunner(subprocess, { cwd: '/tmp', timeoutMs: 1000 })
  assert.equal(await run(['echo', 'x']), 'hello')
  assert.deepEqual(spawned[0].argv, ['/bin/echo', 'x'])
  assert.deepEqual(spawned[0].stdio, { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' })
  assert.equal(await run(['missing']), '')
  assert.equal(await createRunner(undefined)(['echo']), '')
})

// ── rpc ─────────────────────────────────────────────────────────────────────

test('the quick-add URL must be an https repository page', () => {
  assert.equal(acceptRepositoryUrl('https://github.com/a/b.git'), 'https://github.com/a/b')
  assert.throws(() => acceptRepositoryUrl('http://github.com/a/b'), /https repository URL/u)
  assert.throws(() => acceptRepositoryUrl('rm -rf /'), /https repository URL/u)
})

test('the RPC answers in envelopes and hides foreign error text', async () => {
  const handler = createConsoleRpc({
    status: async () => ({ servers: [] }),
    toggle: async () => { throw new Error('ECONNRESET at /internal/path with sk-secret') },
    setRepository: async () => ({}),
    quickAdd: async request => ({ sessionId: 's', request }),
    scan: async () => ({}),
    analyze: async () => { throw new Error('MCP console: scan this computer first') },
  })
  assert.deepEqual(await handler('status', {}), { ok: true, value: { servers: [] } })
  const toggled = await handler('servers/toggle', { entryId: 'x', enabled: true })
  assert.equal(toggled.ok, false)
  assert.equal(toggled.error.message, 'MCP console: the request failed')
  assert.equal((await handler('scan/analyze', {})).error.message, 'MCP console: scan this computer first')
  const added = await handler('quick-add', { repositoryUrl: 'https://github.com/a/b', notes: 'n', locale: 'en' })
  assert.deepEqual(added.value.request, { repositoryUrl: 'https://github.com/a/b', notes: 'n', locale: 'en' })
  assert.equal((await handler('nope', {})).error.message, 'MCP console: unknown endpoint')
  assert.deepEqual(Object.keys((await handler('nope', {})).error).sort(), ['code', 'details', 'message'])
})

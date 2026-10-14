import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir as osTmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { apply, Config } from '../src/index.js'
import { CHANNEL, FIBER_STATE, MCP_MODULE } from '../src/constants.js'

/** A throwaway DSH_HOME: the plugin writes its log there. */
const TEST_HOME = mkdtempSync(join(osTmpdir(), 'mcp-console-test-home-'))

/** A host context with just the services the plugin looks up. */
function fakeHost({ services = {}, settingsWrites = [] } = {}) {
  const handlers = new Map()
  const effects = []
  const connection = { rpc: { handle: (channel, handler) => { handlers.set(channel, handler); return () => handlers.delete(channel) } } }
  const settings = { writable: true, update: async (rowId, patch) => { settingsWrites.push([rowId, patch]) } }
  // Every host gets a throwaway DSH_HOME, so the plugin's log never lands in a real one.
  const all = { connection, webServer: {}, settings, profileContext: { dir: join(TEST_HOME, 'profile'), home: TEST_HOME }, ...services }
  const ctx = {
    fiber: { entry: { options: { id: 'mcp-console' } } },
    logger: { warn: () => undefined },
    get: key => all[key],
    effect: (fn) => { effects.push(fn()) },
    inject: (keys, fn) => {
      if (keys.every(key => all[key] !== undefined)) {
        const scoped = { ...ctx, ...Object.fromEntries(keys.map(key => [key, all[key]])) }
        fn(scoped)
      }
    },
  }
  return { ctx, handlers, call: (endpoint, payload = {}) => handlers.get(CHANNEL)(endpoint, payload, new AbortController().signal) }
}

const loaderWith = rows => ({
  entries: () => rows.map(row => ({ id: `include:${row.id}`, options: { id: row.id, name: MCP_MODULE, config: row.config }, disabled: row.disabled === true, fiber: { state: FIBER_STATE.ACTIVE } })),
})

test('the plugin registers its channel and serves the page end to end', async () => {
  const toggles = []
  const sessionCalls = []
  const settingsWrites = []
  const config = Config({})
  const host = fakeHost({
    settingsWrites,
    services: {
      loader: loaderWith([{ id: 'mcp-github', config: { serverName: 'github', transport: 'stdio', command: 'npx', env: { GITHUB_TOKEN: 'ghp_secretsecretsecret' } } }]),
      tools: { schemas: () => [{ name: 'mcp__github__search' }, { name: 'mcp__github__create_issue' }] },
      pluginManager: {
        listPlugins: async () => [{ entryId: 'include:mcp-github', patchId: 'mcp-github' }],
        listBundles: async () => [],
        setPluginEnabled: async (id, enabled) => { toggles.push([id, enabled]); return { application: 'applied' } },
      },
      profileContext: { dir: '/profile', home: TEST_HOME },
      sessionController: {
        create: async request => { sessionCalls.push(['create', request]); return { sessionId: 'session-9' } },
        rename: async () => ({}),
        prompt: async request => { sessionCalls.push(['prompt', request]); return { accepted: true } },
      },
      workspaceRegistry: { initializeDefault: async () => ({ id: 'ws-default' }), list: () => [] },
    },
  })
  apply(host.ctx, config)
  assert.ok(host.handlers.has(CHANNEL))

  const status = await host.call('status')
  assert.equal(status.ok, true)
  assert.equal(status.value.servers[0].status, 'connected')
  assert.equal(status.value.servers[0].toolCount, 2)
  assert.equal(JSON.stringify(status.value).includes('ghp_secret'), false, 'env values never cross the channel')
  assert.equal(status.value.bundleDir, join(TEST_HOME, 'mcp-bundles'))
  assert.equal(status.value.version, 'dev', 'the host reports its build for the restart check')

  assert.equal((await host.call('servers/toggle', { entryId: 'include:mcp-github', enabled: false })).ok, true)
  assert.deepEqual(toggles, [['include:mcp-github', false]])

  const added = await host.call('quick-add', { repositoryUrl: 'https://github.com/upstash/context7', notes: '', locale: 'zh' })
  assert.deepEqual(added.value, { sessionId: 'session-9', workspaceId: 'ws-default' })
  assert.deepEqual(sessionCalls[0], ['create', { workspaceId: 'ws-default', agentPreset: 'cordis' }])
  assert.match(sessionCalls[1][1].content[0].text, /不要重名）：github/u)

  const saved = await host.call('servers/repository', { rowId: 'mcp-github', url: 'git+https://github.com/github/github-mcp-server.git' })
  assert.equal(saved.ok, true)
  assert.deepEqual(settingsWrites.at(-1), ['mcp-console', { repositories: { 'mcp-github': 'https://github.com/github/github-mcp-server' } }])

  const analyze = await host.call('scan/analyze', { locale: 'zh' })
  assert.equal(analyze.error.message, 'MCP console: scan this computer first')

  const diagnostics = await host.call('diagnostics', { pageVersion: 'dev' })
  assert.match(diagnostics.value.text, /## servers \(1\)/u)
  assert.match(diagnostics.value.text, /scan\/analyze: MCP console: scan this computer first/u, 'recent problems come from the log')
  assert.equal(diagnostics.value.text.includes('ghp_secret'), false)
  assert.equal(diagnostics.value.logDir, join(TEST_HOME, 'storages', 'dsh-mcp-console', 'logs'))
})

test('a profile without the Plugin Manager or sessions still serves a read-only page', async () => {
  const host = fakeHost({ services: { loader: loaderWith([]) } })
  apply(host.ctx, Config({}))
  const status = await host.call('status')
  assert.deepEqual({ manageable: status.value.manageable, sessions: status.value.sessions }, { manageable: false, sessions: false })
  const added = await host.call('quick-add', { repositoryUrl: 'https://github.com/a/b' })
  assert.equal(added.error.message, 'MCP console: the session controller is not available in this profile')
})

test('a scan is kept on disk and served again after the plugin restarts', async () => {
  const { mkdtemp, readFile } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { PassThrough } = await import('node:stream')
  const home = await mkdtemp(join(tmpdir(), 'mcp-console-home-'))
  const scripts = []
  const subprocess = {
    resolveExecutable: async name => name,
    spawn: spec => {
      scripts.push(spec.argv)
      const stdout = new PassThrough()
      const reply = spec.argv[0] === 'powershell' ? JSON.stringify({ apps: [{ name: 'NVIDIA 图形驱动程序', publisher: 'NVIDIA' }] }) : ''
      queueMicrotask(() => stdout.end(Buffer.from(reply, 'utf8')))
      return { stdout, done: new Promise(resolve => stdout.on('end', () => resolve({ code: 0 }))), waitForExit: async () => true }
    },
  }
  const services = { loader: loaderWith([]), profileContext: { dir: join(home, 'profiles', 'desktop'), home }, subprocess }

  const first = fakeHost({ services })
  apply(first.ctx, Config({}))
  assert.equal((await first.call('scan/last')).value, null, 'nothing scanned yet')
  const scanned = await first.call('scan')
  assert.equal(scanned.ok, true)
  assert.ok(scanned.value.inventoryChars > 0)
  // Only the Windows scan runs PowerShell, which the fake answers with an application.
  if (process.platform === 'win32') {
    assert.equal(scanned.value.apps[0].name, 'NVIDIA 图形驱动程序')
    const powershell = scripts.find(argv => argv[0] === 'powershell')
    assert.match(powershell.at(-1), /\[Console\]::OutputEncoding = \[System\.Text\.Encoding\]::UTF8/u)
  }
  const saved = JSON.parse(await readFile(join(home, 'storages', 'dsh-mcp-console', 'last-scan.json'), 'utf8'))
  assert.equal(saved.scannedAt, scanned.value.scannedAt)

  // A new instance, as after a restart, serves the same scan and can analyze it.
  const second = fakeHost({ services })
  apply(second.ctx, Config({}))
  const last = await second.call('scan/last')
  assert.equal(last.value.scannedAt, scanned.value.scannedAt)
  assert.deepEqual(last.value.apps, JSON.parse(JSON.stringify(scanned.value.apps)), 'the same scan comes back')
  const analyzed = await second.call('scan/analyze', { locale: 'zh' })
  assert.equal(analyzed.error.message, 'MCP console: the session controller is not available in this profile', 'the saved scan is accepted; only the missing controller stops it')
})

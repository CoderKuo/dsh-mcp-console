import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, Config } from '../src/index.js'
import { CHANNEL, FIBER_STATE, MCP_MODULE } from '../src/constants.js'

/** A host context with just the services the plugin looks up. */
function fakeHost({ services = {}, settingsWrites = [] } = {}) {
  const handlers = new Map()
  const effects = []
  const connection = { rpc: { handle: (channel, handler) => { handlers.set(channel, handler); return () => handlers.delete(channel) } } }
  const settings = { writable: true, update: async (rowId, patch) => { settingsWrites.push([rowId, patch]) } }
  const all = { connection, webServer: {}, settings, ...services }
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
      profileContext: { dir: '/profile', home: '/dsh-home' },
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
  assert.equal(status.value.bundleDir.replace(/\\/gu, '/'), '/dsh-home/mcp-bundles')

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
})

test('a profile without the Plugin Manager or sessions still serves a read-only page', async () => {
  const host = fakeHost({ services: { loader: loaderWith([]) } })
  apply(host.ctx, Config({}))
  const status = await host.call('status')
  assert.deepEqual({ manageable: status.value.manageable, sessions: status.value.sessions }, { manageable: false, sessions: false })
  const added = await host.call('quick-add', { repositoryUrl: 'https://github.com/a/b' })
  assert.equal(added.error.message, 'MCP console: the session controller is not available in this profile')
})

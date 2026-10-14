import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { parse } from 'yaml'

import { createChangeFeed } from '../src/changes.js'
import { MCP_MODULE } from '../src/constants.js'
import { bundleFiles, importClientServer, readClientServer, serverNameFor, toMcpClientConfig } from '../src/importer.js'
import { createConsoleRpc } from '../src/rpc.js'
import { bundleSourceDir, deleteServer } from '../src/servers.js'

const exists = path => stat(path).then(() => true, () => false)

// ── change feed ─────────────────────────────────────────────────────────────

test('a wait answers at once for an old revision, on the next change, or at its bound', async () => {
  const feed = createChangeFeed()
  const first = feed.current()
  assert.deepEqual(await feed.wait(first - 1), { revision: first, changed: true })
  const pending = feed.wait(first)
  feed.bump()
  assert.deepEqual(await pending, { revision: first + 1, changed: true })
  assert.deepEqual(await feed.wait(first + 1, { timeoutMs: 10 }), { revision: first + 1, changed: false })
  const controller = new AbortController()
  const aborted = feed.wait(first + 1, { signal: controller.signal })
  controller.abort()
  assert.equal((await aborted).changed, false)
})

// ── import ──────────────────────────────────────────────────────────────────

test('entries of other clients become dsh-mcp-client configs', () => {
  assert.deepEqual(toMcpClientConfig({ command: 'npx', args: ['-y', 'x'], env: { TOKEN: 'abc', N: 1 }, cwd: 'C:\\w' }, 'ctx'), {
    serverName: 'ctx', transport: 'stdio', command: 'npx', args: ['-y', 'x'], env: { TOKEN: 'abc' }, cwd: 'C:\\w',
  })
  assert.deepEqual(toMcpClientConfig({ type: 'http', url: 'https://m.example/mcp', headers: { Authorization: 'Bearer t' } }, 'web'), {
    serverName: 'web', transport: 'streamable-http', url: 'https://m.example/mcp', headers: { Authorization: 'Bearer t' },
  })
  assert.throws(() => toMcpClientConfig({ type: 'sse', url: 'https://m.example/sse' }, 'x'), /SSE/u)
  assert.throws(() => toMcpClientConfig({}, 'x'), /neither a command nor a URL/u)
})

test('server names are valid and never clash', () => {
  assert.equal(serverNameFor('context7', []), 'context7')
  assert.equal(serverNameFor('context7', ['context7']), 'context7-2')
  assert.equal(serverNameFor('ida pro/mcp!', []), 'ida-pro-mcp')
  assert.equal(serverNameFor('记忆', []), 'imported')
})

test('the generated bundle is a valid configuration-only bundle', () => {
  const config = { serverName: 'ctx', transport: 'stdio', command: 'npx', args: ["it's", 'a: b'], env: {} }
  const files = bundleFiles({ serverName: 'ctx', config, description: 'x' })
  const manifest = JSON.parse(files['package.json'])
  assert.equal(manifest.name, '@local/mcp-ctx')
  assert.deepEqual(manifest.dsh, { bundle: { patch: './cordis.patch.yml' } })
  assert.deepEqual(parse(files['cordis.patch.yml']), [{ insert: [{ id: 'mcp-ctx', name: MCP_MODULE, config }] }])
})

async function clientFixtures() {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-import-'))
  const cursor = join(dir, 'mcp.json')
  await writeFile(cursor, JSON.stringify({ mcpServers: { context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp'], env: { CONTEXT7_API_KEY: 'k' } } } }))
  const codex = join(dir, 'config.toml')
  await writeFile(codex, [
    '[mcp_servers.ida-pro-mcp]',
    "command = 'C:\\Python\\python.exe'",
    "args = ['C:\\ida\\server.py', \"--port\"]",
    '[mcp_servers.ida-pro-mcp.env]',
    'IDA_HOME = "C:\\\\IDA"',
    '[mcp_servers.other]',
    'command = "other"',
  ].join('\n'))
  return {
    dir,
    paths: [
      { client: 'Cursor', path: cursor, format: 'json' },
      { client: 'Codex', path: codex, format: 'toml' },
      { client: 'Gone', path: join(dir, 'missing.json'), format: 'json' },
    ],
  }
}

test('a server is re-read in full from the known client file', async () => {
  const { paths } = await clientFixtures()
  assert.deepEqual(await readClientServer({ client: 'Cursor', name: 'context7', paths }), { command: 'npx', args: ['-y', '@upstash/context7-mcp'], env: { CONTEXT7_API_KEY: 'k' } })
  assert.deepEqual(await readClientServer({ client: 'Codex', name: 'ida-pro-mcp', paths }), { command: 'C:\\Python\\python.exe', args: ['C:\\ida\\server.py', '--port'], env: { IDA_HOME: 'C:\\IDA' } })
  await assert.rejects(() => readClientServer({ client: 'Nope', name: 'x', paths }), /unknown client/u)
  await assert.rejects(() => readClientServer({ client: 'Gone', name: 'x', paths }), /no configuration file/u)
  await assert.rejects(() => readClientServer({ client: 'Cursor', name: 'absent', paths }), /no longer configures "absent"/u)
})

test('import writes the bundle and installs it; a failed install leaves nothing behind', async () => {
  const { dir, paths } = await clientFixtures()
  const bundleDir = join(dir, 'bundles')
  const installs = []
  const pluginManager = { installBundle: async (spec, options) => { installs.push([spec, options]); return { application: 'applied' } } }
  const result = await importClientServer({ pluginManager, client: 'Cursor', name: 'context7', existingNames: ['context7'], bundleDir, paths })
  assert.equal(result.serverName, 'context7-2')
  assert.equal(result.bundle, '@local/mcp-context7-2')
  assert.deepEqual(installs, [[join(bundleDir, 'context7-2'), { enabled: true }]])
  const patch = parse(await readFile(join(bundleDir, 'context7-2', 'cordis.patch.yml'), 'utf8'))
  assert.equal(patch[0].insert[0].config.env.CONTEXT7_API_KEY, 'k', 'environment copied as the client stores it')

  const failing = { installBundle: async () => { throw Object.assign(new Error('pnpm failed'), { code: 'operation-error' }) } }
  await assert.rejects(() => importClientServer({ pluginManager: failing, client: 'Codex', name: 'other', existingNames: [], bundleDir, paths }), /pnpm failed/u)
  assert.equal(await exists(join(bundleDir, 'other')), false)
})

// ── delete ──────────────────────────────────────────────────────────────────

test('removing a server uninstalls its bundle and deletes only a directory inside the bundle directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-delete-'))
  const profileDir = join(dir, 'profile')
  const bundleDir = join(dir, 'bundles')
  const inside = join(bundleDir, 'ctx')
  const outside = join(dir, 'elsewhere', 'web')
  for (const path of [profileDir, inside, outside]) await mkdir(path, { recursive: true })
  await writeFile(join(profileDir, 'package.json'), JSON.stringify({ dependencies: { '@local/mcp-ctx': `file:${inside}`, '@local/mcp-web': `link:${outside}` } }))
  assert.equal(await bundleSourceDir(profileDir, '@local/mcp-ctx'), inside)

  const removed = []
  const pluginManager = {
    listBundles: async () => [
      { name: '@local/mcp-ctx', removable: true, rows: [{ entryId: 'include:mcp-ctx', moduleName: MCP_MODULE }] },
      { name: '@local/mcp-web', removable: true, rows: [{ entryId: 'include:mcp-web', moduleName: MCP_MODULE }] },
      { name: '@deepseek-ai/dsh-base', removable: false, rows: [{ entryId: 'include:builtin', moduleName: MCP_MODULE }] },
    ],
    removeBundle: async name => { removed.push(name); return { application: 'applied' } },
  }
  assert.deepEqual(await deleteServer({ pluginManager, entryId: 'include:mcp-ctx', profileDir, bundleDir }), { bundle: '@local/mcp-ctx', application: 'applied', removedDirectory: inside })
  assert.equal(await exists(inside), false)
  assert.deepEqual(await deleteServer({ pluginManager, entryId: 'include:mcp-web', profileDir, bundleDir }), { bundle: '@local/mcp-web', application: 'applied' })
  assert.equal(await exists(outside), true, 'a directory outside the bundle directory is never deleted')
  assert.deepEqual(removed, ['@local/mcp-ctx', '@local/mcp-web'])
  await assert.rejects(() => deleteServer({ pluginManager, entryId: 'include:builtin', profileDir, bundleDir }), /comes with DSH/u)
  await assert.rejects(() => deleteServer({ pluginManager, entryId: 'include:profile-row', profileDir, bundleDir }), /not provided by a removable bundle/u)
  await assert.rejects(() => deleteServer({ entryId: 'x' }), /Plugin Manager is not available/u)
})

test('the RPC routes remove, import and wait, and lets Plugin Manager codes through', async () => {
  const seen = []
  const handler = createConsoleRpc({
    status: async () => ({}),
    toggle: async () => ({}),
    remove: async entryId => { seen.push(['remove', entryId]); throw Object.assign(new Error('internal detail'), { code: 'bundle-in-use' }) },
    importServer: async request => { seen.push(['import', request]); return { serverName: 'x' } },
    wait: async request => { seen.push(['wait', request]); return { revision: 3, changed: true } },
    setRepository: async () => ({}),
  })
  assert.equal((await handler('servers/remove', { entryId: 'include:a' })).error.message, 'bundle-in-use')
  assert.deepEqual((await handler('servers/import', { client: 'Cursor', name: 'context7' })).value, { serverName: 'x' })
  assert.deepEqual((await handler('status/wait', { revision: '2' })).value, { revision: 3, changed: true })
  assert.deepEqual(seen, [['remove', 'include:a'], ['import', { client: 'Cursor', name: 'context7' }], ['wait', { revision: 2 }]])
})

test('identical servers from several clients fold into one row', async () => {
  const { groupClientServers, launchLine } = await import('../src/client-groups.js')
  const rows = groupClientServers([
    { client: 'Claude Code', name: 'ida-pro-mcp', command: 'python.exe', args: ['server.py'] },
    { client: 'Cursor', name: 'context7', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
    { client: 'Cursor', name: 'ida-pro-mcp', command: 'python.exe', args: ['server.py'] },
    { client: 'Windsurf', name: 'ida-pro-mcp', command: 'python.exe', args: ['server.py'] },
    { client: 'Codex', name: 'ida-pro-mcp', command: 'other.exe' },
  ])
  assert.deepEqual(rows.map(row => [row.name, row.clients]), [
    ['ida-pro-mcp', ['Claude Code', 'Cursor', 'Windsurf']],
    ['context7', ['Cursor']],
    ['ida-pro-mcp', ['Codex']],
  ])
  assert.equal(launchLine(rows[1]), 'npx -y @upstash/context7-mcp')
  assert.equal(launchLine({ url: 'http://x/mcp' }), 'http://x/mcp')
})

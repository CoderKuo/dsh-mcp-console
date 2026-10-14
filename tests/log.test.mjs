import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { formSecrets, safeUrl, summarizeRequest } from '../src/audit.js'
import { buildDiagnostics } from '../src/diagnostics.js'
import { configValues, createLog } from '../src/logger.js'
import { createConsoleRpc } from '../src/rpc.js'

const tempDir = () => mkdtemp(join(tmpdir(), 'mcp-log-'))
const lines = async file => (await readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line))

test('entries go to one file per day as JSON lines, with a copy in memory and on the console', async () => {
  const dir = await tempDir()
  const mirrored = []
  const log = createLog({ directory: () => dir, mirror: { info: (...args) => mirrored.push(args), error: (...args) => mirrored.push(args) }, now: () => new Date('2026-10-14T08:00:00Z') })
  log.info('servers/add', { request: { name: 'ctx' } })
  log.error('servers/import', { error: { message: 'pnpm failed' } })
  await log.flush()
  assert.deepEqual(await readdir(dir), ['2026-10-14.log'])
  const entries = await lines(join(dir, '2026-10-14.log'))
  assert.deepEqual(entries.map(entry => [entry.level, entry.event]), [['info', 'servers/add'], ['error', 'servers/import']])
  assert.equal(log.recent({ errors: true }).length, 1)
  assert.equal(mirrored.length, 2)
})

test('configured values and credential-looking text never reach the log', async () => {
  const dir = await tempDir()
  const log = createLog({ directory: () => dir })
  log.mask(['my-very-secret-value', 'abc'])
  log.error('servers/test', {
    message: 'server said my-very-secret-value is wrong',
    output: 'Authorization: Bearer abcdefghijklmnop\napi_key=zzzzzzzz token: "qqqqqqqqq" ghp_abcdefghijklmnopqrstu',
  })
  await log.flush()
  const text = await readFile(log.file(), 'utf8')
  for (const secret of ['my-very-secret-value', 'abcdefghijklmnop', 'zzzzzzzz', 'qqqqqqqqq', 'ghp_abcdefghijklmnopqrstu']) assert.equal(text.includes(secret), false, secret)
  assert.match(text, /server said •••••• is wrong/u)
  assert.equal(log.clean('x'.repeat(5000)).length < 4100, true, 'fields are bounded')
  assert.equal(log.clean('x'.repeat(5000), Number.POSITIVE_INFINITY).length, 5000)
})

test('old files and anything beyond the size cap are deleted', async () => {
  const dir = await tempDir()
  await writeFile(join(dir, '2026-10-01.log'), 'old\n')
  await writeFile(join(dir, '2026-10-12.log'), 'x'.repeat(600))
  await writeFile(join(dir, '2026-10-13.log'), 'y'.repeat(600))
  await writeFile(join(dir, 'notes.txt'), 'not a log')
  const log = createLog({ directory: () => dir, now: () => new Date('2026-10-14T08:00:00Z'), maxBytes: 1000 })
  log.info('plugin/start', {})
  await log.flush()
  assert.deepEqual((await readdir(dir)).sort(), ['2026-10-13.log', '2026-10-14.log', 'notes.txt'])
})

test('request summaries carry names and safe shapes, never values', () => {
  const form = { name: 'ctx', transport: 'stdio', commandLine: 'npx -y pkg --api-key sk-live-123456789', env: [{ name: 'TOKEN', value: 'literal-secret' }, { name: 'K', value: 'K', fromEnv: true }] }
  const summary = summarizeRequest('servers/add', form)
  assert.deepEqual(summary.env, ['TOKEN(literal)', 'K(env)'])
  assert.equal(summary.command.includes('sk-live'), false)
  assert.deepEqual(formSecrets(form), ['literal-secret'])
  assert.equal(safeUrl('https://m.example/mcp?key=abc#x'), 'https://m.example/mcp?…')
  assert.deepEqual(configValues({ env: { A: 'one', B: { __jsExpr: 'x' } }, headers: { H: 'two' } }), ['one', 'two'])
})

test('the RPC logs operations and raw failures, masks form values, and keeps polling quiet', async () => {
  const dir = await tempDir()
  const log = createLog({ directory: () => dir })
  const handler = createConsoleRpc({
    log,
    status: async () => ({}),
    addServer: async () => ({ serverName: 'ctx', application: 'applied' }),
    testServer: async () => ({ ok: false, reason: 'exited', output: 'boom literal-secret' }),
    importServer: async () => { throw Object.assign(new Error('ERR_PNPM_FETCH_404 something'), { code: 'operation-error' }) },
    wait: async () => ({ revision: 1, changed: false }),
  })
  const form = { name: 'ctx', transport: 'stdio', commandLine: 'npx -y a', env: [{ name: 'TOKEN', value: 'literal-secret' }] }
  await handler('status', {})
  await handler('status/wait', { revision: 0 })
  await handler('servers/add', form)
  await handler('servers/test', form)
  const failed = await handler('servers/import', { client: 'Cursor', name: 'x' })
  assert.equal(failed.error.message, 'operation-error', 'the page still gets only the safe code')
  await log.flush()
  const entries = await lines(log.file())
  assert.deepEqual(entries.map(entry => [entry.level, entry.event]), [['info', 'servers/add'], ['warn', 'servers/test'], ['error', 'servers/import']])
  assert.equal(entries[2].error.message, 'ERR_PNPM_FETCH_404 something', 'the log keeps the raw message')
  assert.equal(entries[2].error.code, 'operation-error')
  assert.equal(JSON.stringify(entries).includes('literal-secret'), false)
  assert.equal(typeof entries[0].ms, 'number')
})

test('page events are accepted from a fixed list and rate-limited', async () => {
  const dir = await tempDir()
  const log = createLog({ directory: () => dir })
  const handler = createConsoleRpc({ log, status: async () => ({}) })
  assert.equal((await handler('log/client', { event: 'version-mismatch', detail: 'page 0.1.9, host 0.1.8' })).ok, true)
  assert.equal((await handler('log/client', { event: 'anything' })).ok, false)
  for (let i = 0; i < 30; i += 1) await handler('log/client', { event: 'page-error', detail: 'x' })
  await log.flush()
  const entries = await lines(log.file())
  assert.equal(entries.filter(entry => entry.event.startsWith('page/')).length, 20)
})

test('the diagnostics text lists versions, servers, and recent problems', () => {
  const text = buildDiagnostics({
    pluginVersion: '0.1.10',
    pageVersion: '0.1.10',
    dshVersion: '0.2.0-rc.2',
    platform: 'win32',
    arch: 'x64',
    nodeVersion: 'v24.18.1',
    manageable: true,
    sessions: true,
    runtimes: { node: { found: true, version: '24.18.1' }, uvx: { found: false } },
    servers: [{ name: 'ctx', status: 'failed', enabled: true, toolCount: 0, toggleable: true, toggleVia: 'bundle', config: { transport: 'streamable-http', url: 'https://m.example/mcp?key=abc', headers: [{ name: 'Authorization', source: 'expression' }] }, bundle: { name: '@local/mcp-ctx', version: '0.1.0' }, error: 'ECONNREFUSED' }],
    recent: [{ time: '2026-10-14T08:00:00Z', level: 'error', event: 'servers/import', error: { message: 'pnpm failed', code: 'operation-error' }, request: { client: 'Cursor' } }],
    logFile: 'C:\\dsh\\logs\\2026-10-14.log',
  })
  assert.match(text, /plugin \(host\): 0\.1\.10/u)
  assert.match(text, /runtimes: node=24\.18\.1 uvx=no/u)
  assert.match(text, /- ctx: failed · streamable-http · 0 tools · on · switch:bundle · bundle @local\/mcp-ctx@0\.1\.0/u)
  assert.match(text, /https:\/\/m\.example\/mcp\?…/u)
  assert.equal(text.includes('key=abc'), false)
  assert.match(text, /servers\/import \[operation-error\]: pnpm failed/u)
})

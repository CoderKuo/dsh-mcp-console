import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { MCP_MODULE } from '../src/constants.js'
import { configToForm, parsePatch, readServerForm, updateServer, valueToPair } from '../src/editor.js'
import { exportServers } from '../src/exporter.js'
import { bundleFiles } from '../src/importer.js'
import { environmentExpression, joinCommandLine, manualConfig, splitCommandLine } from '../src/manual.js'
import { checkEnvironment, detectRuntimes, probeHttp, probeStdio, resolveValue, runtimeOf } from '../src/probe.js'
import { registryOptions, registryResult, searchRegistry, suggestName } from '../src/registry.js'
import { listServers, setServerEnabled } from '../src/servers.js'

// ── a subprocess service over node:child_process, shaped like ctx.subprocess ──

const localSubprocess = {
  resolveExecutable: async command => {
    if (command === 'missing-tool') throw new Error('not found')
    return command
  },
  spawn: ({ argv, cwd, env, signal }) => {
    const child = spawn(argv[0], argv.slice(1), { cwd, env: { ...process.env, ...env }, signal, stdio: ['pipe', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', () => undefined)
    const done = new Promise(resolve => child.on('close', (exitCode, sig) => resolve({ exitCode, signal: sig })))
    return {
      stdin: child.stdin,
      stdout: child.stdout,
      collected: { stderr: { readFrom: () => ({ text: stderr, nextOffset: stderr.length, lossy: false }) } },
      done,
      terminate: () => child.kill(),
      waitForExit: async () => { await done; return true },
    }
  },
}

const SERVER_SCRIPT = `
process.stderr.write('token is ' + (process.env.TOKEN || '') + '\\n')
process.stdout.write('starting up (a log line on stdout)\\n')
let buffer = ''
process.stdin.on('data', chunk => {
  buffer += chunk
  let i
  while ((i = buffer.indexOf('\\n')) >= 0) {
    const message = JSON.parse(buffer.slice(0, i)); buffer = buffer.slice(i + 1)
    if (message.method === 'initialize') process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'fake', version: '1.2.3' }, capabilities: { tools: {} } } }) + '\\n')
    if (message.method === 'tools/list') process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'echo' }, { name: 'add' }] } }) + '\\n')
  }
})
`

// ── 1. test connection ──────────────────────────────────────────────────────

test('a stdio server is started, handshaken, listed, and stopped; configured values are masked', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-probe-'))
  const script = join(dir, 'server.js')
  await writeFile(script, SERVER_SCRIPT)
  const config = manualConfig({ name: 'fake', transport: 'stdio', commandLine: `node "${script}"`, env: [{ name: 'TOKEN', value: 'MCP_PROBE_SECRET', fromEnv: true }] })
  const result = await probeStdio(config, { subprocess: localSubprocess, env: { MCP_PROBE_SECRET: 'super-secret-value' } })
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.deepEqual([result.server, result.toolCount, result.tools], [{ name: 'fake', version: '1.2.3' }, 2, ['echo', 'add']])

  const crash = await probeStdio({ command: 'node', args: ['-e', "console.error('boom super-secret-value'); process.exit(3)"], env: { X: 'super-secret-value' } }, { subprocess: localSubprocess })
  assert.equal(crash.reason, 'exited')
  assert.match(crash.output, /boom ••••••/u, 'a configured value never comes back in the output')
  assert.equal((await probeStdio({ command: 'missing-tool' }, { subprocess: localSubprocess })).reason, 'no-executable')
  const slow = await probeStdio({ command: 'node', args: ['-e', 'setTimeout(() => {}, 10000)'] }, { subprocess: localSubprocess, timeoutMs: 300 })
  assert.equal(slow.reason, 'timeout')
  assert.equal((await probeStdio({ command: 'x' }, {})).reason, 'unavailable')
})

async function withServer(handler, run) {
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    return await run(`http://127.0.0.1:${server.address().port}/mcp`)
  } finally {
    server.close()
  }
}

test('a streamable-http endpoint is handshaken (event-stream and JSON replies) and failures are classified', async () => {
  const seen = []
  const ok = await withServer((req, res) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      seen.push([req.method, req.headers.authorization, req.headers['mcp-session-id']])
      if (req.method === 'DELETE') return res.writeHead(200).end()
      const message = JSON.parse(body)
      if (message.method === 'initialize') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'mcp-session-id': 's-1' })
        return res.end(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'remote', version: '9' } } })}\n\n`)
      }
      if (message.id === undefined) return res.writeHead(202).end()
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'search' }] } }))
    })
  }, url => probeHttp(manualConfig({ name: 'r', transport: 'streamable-http', url, headers: [{ name: 'Authorization', value: 'Bearer ${T}', fromEnv: true }] }), { env: { T: 'tok' } }))
  assert.equal(ok.ok, true, JSON.stringify(ok))
  assert.deepEqual([ok.server.name, ok.tools], ['remote', ['search']])
  assert.deepEqual(seen[0], ['POST', 'Bearer tok', undefined])
  assert.equal(seen[1][2], 's-1', 'the session id is sent back')

  const oauth = await withServer((req, res) => res.writeHead(401, { 'www-authenticate': 'Bearer resource_metadata="x"' }).end(), url => probeHttp({ url, headers: {} }))
  assert.equal(oauth.reason, 'oauth')
  const auth = await withServer((req, res) => res.writeHead(401).end(), url => probeHttp({ url, headers: { Authorization: 'Bearer wrong' } }))
  assert.equal(auth.reason, 'auth')
  const sse = await withServer((req, res) => res.writeHead(405).end(), url => probeHttp({ url, headers: {} }))
  assert.equal(sse.reason, 'not-streamable')
  assert.equal((await probeHttp({ url: 'http://127.0.0.1:1/mcp', headers: {} })).reason, 'unreachable')
})

test('generated expressions evaluate the way the Loader would', () => {
  assert.equal(resolveValue(environmentExpression('Bearer ${T}'), { T: 'x' }), 'Bearer x')
  assert.equal(resolveValue(environmentExpression('MISSING'), {}), '')
  assert.equal(resolveValue('plain'), 'plain')
})

// ── 2. environment check, 4. runtimes ───────────────────────────────────────

test('the environment check answers yes or no for valid names only', () => {
  assert.deepEqual(checkEnvironment(['A', 'B', 'C', 'not valid'], { A: 'x', B: '' }), { A: true, B: false, C: false })
})

test('runtimes are found through the subprocess service', async () => {
  const subprocess = { resolveExecutable: async name => { if (!['node', 'npx'].includes(name)) throw new Error('no'); return name } }
  const found = await detectRuntimes(subprocess, async argv => (argv[0] === 'node' ? 'v24.18.1\n' : ''))
  assert.deepEqual(found.node, { found: true, version: '24.18.1' })
  assert.deepEqual(found.npx, { found: true })
  assert.deepEqual(found.uvx, { found: false })
  assert.equal(runtimeOf('C:\\Program Files\\nodejs\\npx.cmd'), 'npx')
  assert.equal(runtimeOf('python3'), 'python')
  assert.equal(runtimeOf('my-server'), undefined)
})

// ── 3. mcp-remote bridge ────────────────────────────────────────────────────

test('a remote server can go through mcp-remote, header values as explicit variables', () => {
  const config = manualConfig({ name: 'r', transport: 'streamable-http', bridge: true, url: 'http://mcp.example.com/sse', headers: [{ name: 'Authorization', value: 'Bearer ${T}', fromEnv: true }, { name: 'X-Team', value: 'a b' }] })
  assert.deepEqual(config, {
    serverName: 'r',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-remote', 'http://mcp.example.com/sse', '--header', 'Authorization:${MCP_REMOTE_HEADER_1}', '--header', 'X-Team:${MCP_REMOTE_HEADER_2}', '--allow-http'],
    env: { MCP_REMOTE_HEADER_1: { __jsExpr: `"Bearer " + (process.env.T ?? '')` }, MCP_REMOTE_HEADER_2: 'a b' },
  })
  assert.equal(manualConfig({ name: 'r', transport: 'streamable-http', bridge: true, url: 'http://localhost:3000/mcp' }).args.includes('--allow-http'), false)
  assert.deepEqual(configToForm(config).form, { name: 'r', transport: 'streamable-http', commandLine: '', cwd: '', env: [], url: 'http://mcp.example.com/sse', bridge: true, headers: [{ name: 'Authorization', value: 'Bearer ${T}', fromEnv: true }, { name: 'X-Team', value: 'a b', fromEnv: false }] })
})

// ── 5. registry ─────────────────────────────────────────────────────────────

test('registry entries become Add manually forms', () => {
  const npm = registryOptions({ name: 'io.github.upstash/context7', packages: [{ registryType: 'npm', identifier: '@upstash/context7-mcp', version: '1.0.25', transport: { type: 'stdio' }, environmentVariables: [{ name: 'CONTEXT7_API_KEY', isSecret: true, description: 'API key' }, { name: 'MODE', default: 'ro' }] }] })
  assert.deepEqual(npm.options[0].form, {
    name: 'context7', transport: 'stdio', commandLine: 'npx -y @upstash/context7-mcp@1.0.25', cwd: '', url: '', headers: [], bridge: false,
    env: [{ name: 'CONTEXT7_API_KEY', value: 'CONTEXT7_API_KEY', fromEnv: true, description: 'API key' }, { name: 'MODE', value: 'ro', fromEnv: false }],
  })
  const pypi = registryOptions({ name: 'x/mcp-server-time', packages: [{ registryType: 'pypi', identifier: 'mcp-server-time', version: '1.0', packageArguments: [{ type: 'named', name: '--local-timezone', valueHint: 'tz', isRequired: true }, { type: 'named', name: '--verbose' }] }] })
  assert.equal(pypi.options[0].form.commandLine, 'uvx mcp-server-time==1.0 --local-timezone <tz>')
  assert.equal(pypi.options[0].form.name, 'time')
  const oci = registryOptions({ name: 'io.github.github/github-mcp-server', packages: [{ registryType: 'oci', identifier: 'ghcr.io/github/github-mcp-server', version: '0.20.0', environmentVariables: [{ name: 'GITHUB_PERSONAL_ACCESS_TOKEN', isSecret: true }] }] })
  assert.equal(oci.options[0].form.commandLine, 'docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server:0.20.0')
  const spelled = registryOptions({ name: 'a/b', packages: [{ registryType: 'oci', identifier: 'docker.io/f/r:0.3.0', packageArguments: ['run', '-i', '--rm', 'docker.io/f/r:0.3.0'].map(value => ({ type: 'positional', value })) }] })
  assert.equal(spelled.options[0].form.commandLine, 'docker run -i --rm docker.io/f/r:0.3.0', 'a docker run line spelled as arguments is not doubled')
  const remote = registryOptions({ name: 'ai.smithery/x', remotes: [{ type: 'streamable-http', url: 'https://server.smithery.ai/x/mcp', headers: [{ name: 'Authorization', value: 'Bearer {smithery_api_key}', isSecret: true }] }, { type: 'sse', url: 'https://x/sse' }] })
  assert.deepEqual(remote.options[0].form.headers, [{ name: 'Authorization', value: 'Bearer ${SMITHERY_API_KEY}', fromEnv: true }])
  assert.equal(remote.options[1].form.bridge, true, 'an SSE remote goes through mcp-remote')
  const skipped = registryOptions({ name: 'a/b', packages: [{ registryType: 'nuget', identifier: 'X' }, { registryType: 'npm', identifier: 'y', transport: { type: 'streamable-http' } }] })
  assert.deepEqual([skipped.options.length, skipped.skipped.length], [0, 2])
  assert.equal(suggestName('io.github.x/github-mcp-server'), 'github')
  assert.equal(registryResult({ server: { name: 'a/b', repository: { url: 'javascript:alert(1)' } } }).repository, undefined)
})

test('a registry search asks for the latest versions and pages with the cursor', async () => {
  const asked = []
  const fetchImpl = async url => {
    asked.push(String(url))
    return new Response(JSON.stringify({ servers: Array.from({ length: 30 }, (_, i) => ({ server: { name: `n/s${i}` } })), metadata: { nextCursor: 'c2' } }), { headers: { 'content-type': 'application/json' } })
  }
  const page = await searchRegistry({ query: ' context7 ', fetchImpl, baseUrl: 'https://r.example' })
  assert.equal(asked[0], 'https://r.example/v0.1/servers?version=latest&limit=30&search=context7')
  assert.equal(page.nextCursor, 'c2')
  await searchRegistry({ query: 'x', cursor: 'c2', fetchImpl, baseUrl: 'https://r.example' })
  assert.match(asked[1], /cursor=c2/u)
  await assert.rejects(() => searchRegistry({ query: 'x', fetchImpl: async () => { throw new TypeError('fetch failed') } }), /could not be reached/u)
  await assert.rejects(() => searchRegistry({ query: 'x', fetchImpl: async () => new Response('', { status: 503 }) }), /answered 503/u)
})

// ── 6. edit ─────────────────────────────────────────────────────────────────

test('stored values map back to form rows; unknown expressions are kept', () => {
  assert.deepEqual(valueToPair('A', 'x'), { name: 'A', value: 'x', fromEnv: false })
  assert.deepEqual(valueToPair('A', { __jsExpr: 'process.env.TOKEN' }), { name: 'A', value: 'TOKEN', fromEnv: true })
  assert.deepEqual(valueToPair('A', environmentExpression('Bearer ${T}-${U}')), { name: 'A', value: 'Bearer ${T}-${U}', fromEnv: true })
  assert.deepEqual(valueToPair('A', { __jsExpr: '`Bearer ${process.env.MCP_TOKEN}`' }), { name: 'A', value: 'Bearer ${MCP_TOKEN}', fromEnv: true })
  assert.deepEqual(valueToPair('A', { __jsExpr: "require('fs')" }), { name: 'A', value: "require('fs')", fromEnv: false, expression: true })
  assert.equal(joinCommandLine(['C:\\Program Files\\x.exe', 'a b', '', 'say "hi"']), `"C:\\Program Files\\x.exe" "a b" "" 'say "hi"'`)
  assert.deepEqual(splitCommandLine(joinCommandLine(['C:\\Program Files\\x.exe', 'a b', '', 'say "hi"'])), ['C:\\Program Files\\x.exe', 'a b', '', 'say "hi"'])
  assert.equal(configToForm({ serverName: 's', command: 'x', args: [{ __jsExpr: 'a' }] }).reason, 'an argument is an expression')
})

async function editFixture(patchText) {
  const dir = await mkdtemp(join(tmpdir(), 'mcp-edit-'))
  const profileDir = join(dir, 'profile')
  const bundleDir = join(dir, 'bundles')
  const source = join(bundleDir, 'ctx')
  await mkdir(profileDir, { recursive: true })
  await mkdir(source, { recursive: true })
  await writeFile(join(profileDir, 'package.json'), JSON.stringify({ dependencies: { '@local/mcp-ctx': `file:${source}` } }))
  await writeFile(join(source, 'package.json'), JSON.stringify({ name: '@local/mcp-ctx', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
  await writeFile(join(source, 'cordis.patch.yml'), patchText)
  const calls = []
  let failInstall = false
  const pluginManager = {
    listBundles: async () => [{ name: '@local/mcp-ctx', removable: true, installed: true, enabled: true, rows: [{ rowId: 'mcp-ctx', moduleName: MCP_MODULE, entryId: 'include:mcp-ctx' }] }],
    removeBundle: async name => { calls.push(['remove', name]); return {} },
    installBundle: async spec => {
      calls.push(['install', spec, await readFile(join(spec, 'cordis.patch.yml'), 'utf8')])
      if (failInstall) { failInstall = false; throw Object.assign(new Error('pnpm failed'), { code: 'operation-error' }) }
      return { application: 'applied' }
    },
  }
  return { profileDir, bundleDir, source, calls, pluginManager, failNext: () => { failInstall = true } }
}

const AGENT_PATCH = `# written by an agent
- insert:
    - id: mcp-ctx
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: ctx
        transport: stdio
        command: npx
        args: [-y, '@upstash/context7-mcp']
        env:
          CONTEXT7_API_KEY: !!js process.env.CONTEXT7_API_KEY
          ODD: !!js "require('os').hostname()"
        toolCallTimeoutMs: 120000
`

test('an agent-written bundle opens in the form and saves back, keeping what the form cannot show', async () => {
  const fx = await editFixture(AGENT_PATCH)
  const opened = await readServerForm({ ...fx, entryId: 'include:mcp-ctx' })
  assert.equal(opened.editable, true)
  assert.deepEqual(opened.form.env, [
    { name: 'CONTEXT7_API_KEY', value: 'CONTEXT7_API_KEY', fromEnv: true },
    { name: 'ODD', value: "require('os').hostname()", fromEnv: false, expression: true },
  ])
  assert.equal(opened.form.commandLine, 'npx -y @upstash/context7-mcp')

  const form = { ...opened.form, commandLine: 'npx -y @upstash/context7-mcp@2', name: 'renamed-is-ignored' }
  const saved = await updateServer({ ...fx, entryId: 'include:mcp-ctx', request: form, existingNames: ['ctx'] })
  assert.deepEqual(saved, { serverName: 'ctx', bundle: '@local/mcp-ctx', application: 'applied' })
  assert.deepEqual(fx.calls.map(call => call.slice(0, 2)), [['remove', '@local/mcp-ctx'], ['install', fx.source]])
  const row = parsePatch(await readFile(join(fx.source, 'cordis.patch.yml'), 'utf8'))[0].insert[0]
  assert.equal(row.id, 'mcp-ctx')
  assert.deepEqual(row.config, {
    serverName: 'ctx', transport: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp@2'],
    env: { CONTEXT7_API_KEY: { __jsExpr: "process.env.CONTEXT7_API_KEY ?? ''" }, ODD: { __jsExpr: "require('os').hostname()" } },
    toolCallTimeoutMs: 120000,
  })

  // The page cannot write a new expression.
  const forged = { ...opened.form, env: [{ name: 'ODD', value: 'process.exit(1)', expression: true }] }
  await assert.rejects(() => updateServer({ ...fx, entryId: 'include:mcp-ctx', request: forged }), /cannot be set to a new expression/u)
})

test('a failed reinstall puts the old patch back and installs it again', async () => {
  const original = bundleFiles({ serverName: 'ctx', config: manualConfig({ name: 'ctx', transport: 'stdio', commandLine: 'npx -y a' }), description: 'd' })['cordis.patch.yml']
  const fx = await editFixture(original)
  fx.failNext()
  await assert.rejects(() => updateServer({ ...fx, entryId: 'include:mcp-ctx', request: { transport: 'stdio', commandLine: 'npx -y b' } }), /pnpm failed/u)
  assert.equal(await readFile(join(fx.source, 'cordis.patch.yml'), 'utf8'), original)
  assert.equal(fx.calls.at(-1)[2], original, 'the old patch was installed again')
})

test('bundles outside the bundle directory or doing more than one server are not editable', async () => {
  const fx = await editFixture('[{"insert":[{"id":"a","name":"x"}]}]')
  assert.match((await readServerForm({ ...fx, entryId: 'include:mcp-ctx' })).reason, /more than add one MCP server/u)
  const outside = await editFixture(AGENT_PATCH)
  assert.match((await readServerForm({ ...outside, bundleDir: join(outside.bundleDir, 'other'), entryId: 'include:mcp-ctx' })).reason, /mcp-bundles directory/u)
  assert.match((await readServerForm({ ...outside, entryId: 'include:nope' })).reason, /can be edited here/u)
})

// ── 8. export ───────────────────────────────────────────────────────────────

test('the export never carries a secret', () => {
  const { json, count, notes } = exportServers([
    { config: manualConfig({ name: 'ctx', transport: 'stdio', commandLine: 'npx -y a', env: [{ name: 'API_KEY', value: 'sk-live-1234567890abcdef' }, { name: 'TOKEN', value: 'TOKEN', fromEnv: true }, { name: 'MODE', value: 'ro' }] }) },
    { config: manualConfig({ name: 'web', transport: 'streamable-http', url: 'https://m/mcp', headers: [{ name: 'Authorization', value: 'Bearer ${T}', fromEnv: true }] }), disabled: true },
    { config: { serverName: 'odd', command: 'x', env: { V: { __jsExpr: "require('os').hostname()" }, P: 'ghp_abcdefghijklmnop' } } },
  ])
  const parsed = JSON.parse(json).mcpServers
  assert.equal(count, 3)
  assert.deepEqual(parsed.ctx.env, { API_KEY: '${API_KEY}', TOKEN: '${TOKEN}', MODE: 'ro' })
  assert.deepEqual(parsed.web, { type: 'http', url: 'https://m/mcp', headers: { Authorization: 'Bearer ${T}' } })
  assert.deepEqual(parsed.odd.env, { V: '${V}', P: '${P}' })
  assert.equal(json.includes('sk-live') || json.includes('ghp_'), false)
  assert.equal(notes.length, 4)
})

// ── 0. switching bundle-provided servers ────────────────────────────────────

test('a read-only row in an MCP-only bundle is switched through its bundle, and a switched-off bundle stays listed', async () => {
  const calls = []
  const bundle = { name: '@local/mcp-ctx', installed: true, removable: true, enabled: true, rows: [{ rowId: 'mcp-ctx', moduleName: MCP_MODULE, entryId: 'include:mcp-ctx' }] }
  const pluginManager = {
    listPlugins: async () => [{ entryId: 'include:mcp-ctx', readOnlyReason: 'bundle-row' }],
    listBundles: async () => [bundle, { name: '@local/mcp-off', installed: true, removable: true, enabled: false, rows: [{ rowId: 'mcp-off', moduleName: MCP_MODULE }] }],
    setPluginEnabled: async () => { throw new Error('read-only') },
    setBundleEnabled: async (name, enabled) => { calls.push([name, enabled]); return { application: 'applied' } },
  }
  assert.deepEqual(await setServerEnabled(pluginManager, 'include:mcp-ctx', false), { application: 'applied' })
  assert.deepEqual(await setServerEnabled(pluginManager, 'bundle:@local/mcp-off', true), { application: 'applied' })
  assert.deepEqual(calls, [['@local/mcp-ctx', false], ['@local/mcp-off', true]])

  const loader = { entries: () => [{ id: 'include:mcp-ctx', options: { id: 'mcp-ctx', name: MCP_MODULE, config: { serverName: 'ctx', transport: 'stdio', command: 'npx' } }, fiber: { state: 2 } }] }
  const { servers } = await listServers({ loader, tools: { schemas: () => [] }, pluginManager, readBundleConfig: async () => ({ serverName: 'off', transport: 'stdio', command: 'uvx', env: { K: 'secret' } }) })
  assert.deepEqual(servers.map(server => [server.name, server.toggleable, server.toggleVia, server.enabled]), [['ctx', true, 'bundle', true], ['off', true, 'bundle', false]])
  assert.equal(servers[1].entryId, 'bundle:@local/mcp-off')
  assert.equal(JSON.stringify(servers).includes('secret'), false, 'a switched-off bundle shows redacted configuration too')
})

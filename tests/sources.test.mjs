import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { parse } from 'yaml'

import { bundleFiles, flowYaml, installConfigBundle } from '../src/importer.js'
import { environmentExpression, manualConfig, splitCommandLine } from '../src/manual.js'
import { quickAddPrompt } from '../src/prompts.js'
import { createConsoleRpc } from '../src/rpc.js'
import { classifySource } from '../src/sources.js'

/** The Loader's YAML dialect: `!!js` scalars become expression nodes. */
const parseDialect = text => parse(text, { customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: value => ({ __jsExpr: value }) }] })

// ── sources ─────────────────────────────────────────────────────────────────

test('quick add recognises repositories, packages, images, commands, and pages', () => {
  const kind = text => {
    const { kind: k, value } = classifySource(text)
    return [k, value]
  }
  assert.deepEqual(kind('https://github.com/upstash/context7.git'), ['repository', 'https://github.com/upstash/context7'])
  assert.deepEqual(kind('https://gitee.com/a/b'), ['repository', 'https://gitee.com/a/b'])
  assert.deepEqual(kind('git@github.com:a/b.git'), ['repository', 'https://github.com/a/b'])
  assert.deepEqual(kind('modelcontextprotocol/servers'), ['repository', 'https://github.com/modelcontextprotocol/servers'])
  assert.deepEqual(kind('npx -y @upstash/context7-mcp --api-key x'), ['npm', '@upstash/context7-mcp'])
  assert.deepEqual(kind('@modelcontextprotocol/server-memory@1.0.0'), ['npm', '@modelcontextprotocol/server-memory@1.0.0'])
  assert.deepEqual(kind('https://www.npmjs.com/package/@upstash/context7-mcp'), ['npm', '@upstash/context7-mcp'])
  assert.deepEqual(kind('uvx mcp-server-time'), ['pypi', 'mcp-server-time'])
  assert.deepEqual(kind('pip install mcp-server-fetch'), ['pypi', 'mcp-server-fetch'])
  assert.deepEqual(kind('https://pypi.org/project/mcp-server-fetch/'), ['pypi', 'mcp-server-fetch'])
  assert.deepEqual(kind('ghcr.io/github/github-mcp-server'), ['docker', 'ghcr.io/github/github-mcp-server'])
  assert.deepEqual(kind('mcp/fetch'), ['docker', 'mcp/fetch'])
  assert.deepEqual(kind('https://hub.docker.com/r/mcp/fetch'), ['docker', 'mcp/fetch'])
  assert.deepEqual(kind('mcp-server-time'), ['package', 'mcp-server-time'])
  assert.deepEqual(kind('https://mcp.context7.com/mcp'), ['url', 'https://mcp.context7.com/mcp'])
  const run = classifySource('docker run -i --rm -e GITHUB_TOKEN ghcr.io/github/github-mcp-server')
  assert.equal(run.kind, 'docker')
  assert.equal(run.label, 'ghcr.io/github/github-mcp-server', 'the image of a docker run command, past option values')
  assert.equal(classifySource('npx -y @upstash/context7-mcp').link, 'https://www.npmjs.com/package/@upstash/context7-mcp')
  assert.equal(classifySource('@scope/pkg@2').link, 'https://www.npmjs.com/package/@scope/pkg')
})

test('quick add refuses what is not a source', () => {
  for (const text of ['', 'rm -rf /', 'C:\\tools\\server.exe', 'two words', 'a\nb', 'ftp://x/y', 'npx -y', 'x'.repeat(501)]) {
    assert.throws(() => classifySource(text), /enter a repository or web page link/u, JSON.stringify(text.slice(0, 20)))
  }
})

test('the quick-add prompt is written for the kind of source', () => {
  const npm = quickAddPrompt({ source: classifySource('npx -y @upstash/context7-mcp'), bundleDir: '/b', locale: 'zh' })
  assert.match(npm, /npm 包 `@upstash\/context7-mcp`/u)
  assert.match(npm, /npx -y @upstash\/context7-mcp/u)
  assert.match(npm, /"homepage": "https:\/\/www\.npmjs\.com\/package\/@upstash\/context7-mcp"/u)
  const docker = quickAddPrompt({ source: classifySource('mcp/fetch'), bundleDir: '/b', locale: 'en' })
  assert.match(docker, /docker run -i --rm/u)
  assert.doesNotMatch(docker, /"homepage"|"repository"/u, 'no link for a bare image')
  const url = quickAddPrompt({ source: classifySource('https://mcp.context7.com/mcp'), bundleDir: '/b', locale: 'en' })
  assert.match(url, /streamable-http/u)
  assert.match(url, /remote MCP endpoint/u)
  assert.match(quickAddPrompt({ source: classifySource('uvx mcp-server-time'), bundleDir: '/b' }), /uvx mcp-server-time/u)
  assert.match(quickAddPrompt({ repositoryUrl: 'https://github.com/a/b', bundleDir: '/b', locale: 'en' }), /"repository": "https:\/\/github\.com\/a\/b"/u)
})

// ── manual add ──────────────────────────────────────────────────────────────

test('a command line splits like a shell would, without a shell', () => {
  assert.deepEqual(splitCommandLine('npx -y @upstash/context7-mcp'), ['npx', '-y', '@upstash/context7-mcp'])
  assert.deepEqual(splitCommandLine('"C:\\Program Files\\py\\python.exe" C:\\ida\\server.py --name "a b" \'c d\' ""'), ['C:\\Program Files\\py\\python.exe', 'C:\\ida\\server.py', '--name', 'a b', 'c d', ''])
  assert.throws(() => splitCommandLine('npx "x'), /unclosed quote/u)
})

test('values from the environment become Loader expressions', () => {
  assert.deepEqual(environmentExpression('GITHUB_TOKEN'), { __jsExpr: "process.env.GITHUB_TOKEN ?? ''" })
  assert.deepEqual(environmentExpression('Bearer ${API_TOKEN}'), { __jsExpr: `"Bearer " + (process.env.API_TOKEN ?? '')` })
  assert.deepEqual(environmentExpression('${A}:${B}!'), { __jsExpr: `(process.env.A ?? '') + ":" + (process.env.B ?? '') + "!"` })
  assert.throws(() => environmentExpression('Bearer token'), /names no environment variable/u)
  const expr = environmentExpression('x"); process.exit(1); ("${T}').__jsExpr
  assert.equal(new Function('process', `return ${expr}`)({ env: { T: 't' } }), 'x"); process.exit(1); ("t', 'literal text stays a string literal')
})

test('manual add builds a stdio or streamable-http config and checks it', () => {
  assert.deepEqual(manualConfig({
    name: 'ctx',
    transport: 'stdio',
    commandLine: 'npx -y @upstash/context7-mcp',
    env: [{ name: 'CONTEXT7_API_KEY', value: 'CONTEXT7_API_KEY', fromEnv: true }, { name: 'MODE', value: 'ro' }, { name: '', value: '' }],
  }), {
    serverName: 'ctx',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp'],
    env: { CONTEXT7_API_KEY: { __jsExpr: "process.env.CONTEXT7_API_KEY ?? ''" }, MODE: 'ro' },
  })
  assert.deepEqual(manualConfig({
    name: 'web',
    transport: 'streamable-http',
    url: 'https://mcp.example.com/mcp',
    headers: [{ name: 'Authorization', value: 'Bearer ${MCP_TOKEN}', fromEnv: true }],
    commandLine: 'ignored',
  }), {
    serverName: 'web',
    transport: 'streamable-http',
    url: 'https://mcp.example.com/mcp',
    headers: { Authorization: { __jsExpr: `"Bearer " + (process.env.MCP_TOKEN ?? '')` } },
  })
  const stdio = { transport: 'stdio', commandLine: 'x' }
  assert.throws(() => manualConfig({ ...stdio, name: 'bad name' }), /1-32 letters/u)
  assert.throws(() => manualConfig({ ...stdio, name: 'ctx' }, ['ctx']), /already exists/u)
  assert.throws(() => manualConfig({ name: 'a', transport: 'stdio', commandLine: '  ' }), /command that starts/u)
  assert.throws(() => manualConfig({ name: 'a', transport: 'streamable-http', url: 'file:///x' }), /http\(s\) URL/u)
  assert.throws(() => manualConfig({ name: 'a', transport: 'sse' }), /local command or a remote endpoint/u)
  assert.throws(() => manualConfig({ ...stdio, name: 'a', env: [{ name: '1X', value: 'v' }] }), /not a valid environment variable name/u)
  assert.throws(() => manualConfig({ ...stdio, name: 'a', env: [{ name: 'X', value: '1' }, { name: 'X', value: '2' }] }), /given twice/u)
})

test('the bundle keeps expressions as !!js and installs like an import', async () => {
  const config = manualConfig({ name: 'web', transport: 'streamable-http', url: 'https://m.example/mcp', headers: [{ name: 'Authorization', value: 'Bearer ${T}', fromEnv: true }, { name: 'X-Mode', value: "it's \"quoted\"" }] })
  const files = bundleFiles({ serverName: 'web', config, description: 'd', homepage: 'https://m.example', origin: 'Added by hand' })
  assert.match(files['cordis.patch.yml'], /^# Added by hand by dsh-mcp-console/u)
  assert.match(files['cordis.patch.yml'], /"Authorization": !!js /u)
  assert.equal(JSON.parse(files['package.json']).homepage, 'https://m.example')
  const parsed = parseDialect(files['cordis.patch.yml'])
  assert.deepEqual(parsed[0].insert[0].config, config, 'the patch reads back exactly as the config')
  assert.equal(flowYaml({ a: [], b: {}, c: undefined }), '{\n  "a": [],\n  "b": {}\n}')

  const bundleDir = await mkdtemp(join(tmpdir(), 'mcp-manual-'))
  const installs = []
  const result = await installConfigBundle({ pluginManager: { installBundle: async dir => { installs.push(dir); return { application: 'applied' } } }, config, bundleDir, description: 'd' })
  assert.deepEqual(result, { serverName: 'web', bundle: '@local/mcp-web', application: 'applied', directory: join(bundleDir, 'web') })
  assert.deepEqual(installs, [join(bundleDir, 'web')])
  assert.match(await readFile(join(bundleDir, 'web', 'cordis.patch.yml'), 'utf8'), /!!js/u)
  await assert.rejects(() => installConfigBundle({ config, bundleDir }), /Plugin Manager is not available/u)
})

test('the RPC classifies the quick-add source and routes manual add', async () => {
  const seen = []
  const handler = createConsoleRpc({
    status: async () => ({}),
    quickAdd: async request => ({ request }),
    addServer: async request => { seen.push(request); return { serverName: request.name } },
  })
  const added = await handler('quick-add', { source: 'uvx mcp-server-time', locale: 'en' })
  assert.equal(added.value.request.source.kind, 'pypi')
  assert.equal((await handler('quick-add', { repositoryUrl: 'https://github.com/a/b' })).value.request.source.kind, 'repository', 'older pages send repositoryUrl')
  assert.match((await handler('quick-add', { source: 'rm -rf /' })).error.message, /^MCP console: enter a repository/u)
  assert.deepEqual((await handler('servers/add', { name: 'x', transport: 'stdio', commandLine: 'y', extra: 1 })).value, { serverName: 'x' })
  assert.deepEqual(Object.keys(seen[0]).sort(), ['bridge', 'commandLine', 'cwd', 'env', 'headers', 'name', 'transport', 'url'])
})

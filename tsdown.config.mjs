import { readFileSync } from 'node:fs'

import { defineConfig } from 'tsdown'

/** Stamped into both halves so the page can tell a host that was not restarted. */
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

const id = 'dsh-mcp-console'
const hostExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/schemastery',
]
const clientExternal = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
]

export default defineConfig([
  {
    name: id,
    entry: { index: 'src/index.js' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: true,
    deps: { neverBundle: hostExternal },
    define: { __MCP_CONSOLE_VERSION__: JSON.stringify(version) },
  },
  {
    name: `${id}/client`,
    entry: { client: 'src/client.jsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    dts: false,
    sourcemap: true,
    clean: false,
    deps: { neverBundle: clientExternal },
    define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'), __MCP_CONSOLE_VERSION__: JSON.stringify(version) },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])

/**
 * Export the profile's MCP servers in the `mcpServers` JSON most clients read
 * (Claude Desktop, Claude Code, Cursor, Windsurf), for a backup or another
 * client.
 *
 * No secret leaves the host: a value read from the environment is written as
 * `${NAME}`, and a literal value under a credential-like name (or one that
 * looks like a token) is replaced by a `${NAME}` placeholder and listed in
 * the notes, so the person fills it in the other client.
 *
 * @module dsh-mcp-console/exporter
 */

import { valueToPair } from './editor.js'

const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu
const OPAQUE = /^(?:Bearer\s+)?(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA|eyJ)[-_A-Za-z0-9.]{8,}$|^[A-Za-z0-9+/_=-]{32,}$/u
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const placeholder = name => `\${${name.replace(/[^A-Za-z0-9_]+/gu, '_').toUpperCase()}}`

/** One map of values for export, with notes for what was withheld. */
function exportMap(map, server, what, notes) {
  const out = {}
  for (const [name, value] of Object.entries(record(map) ? map : {})) {
    const pair = valueToPair(name, value)
    if (pair.expression === true) {
      out[name] = placeholder(name)
      notes.push(`${server}: ${what} ${name} is computed by an expression in DSH; set it by hand`)
    } else if (pair.fromEnv) {
      out[name] = pair.value.includes('${') ? pair.value : `\${${pair.value}}`
    } else if (SECRET_NAME.test(name) || OPAQUE.test(pair.value)) {
      out[name] = placeholder(name)
      notes.push(`${server}: ${what} ${name} holds a secret that was not exported; fill it in`)
    } else {
      out[name] = pair.value
    }
  }
  return out
}

/**
 * Build the export.
 * @param rows - MCP rows from `readMcpRows` (raw config, expressions kept).
 * @returns `{ json, count, notes }` where `json` is the text to save or copy.
 */
export function exportServers(rows) {
  const mcpServers = {}
  const notes = []
  for (const row of Array.isArray(rows) ? rows : []) {
    const config = row?.config
    if (!record(config) || typeof config.serverName !== 'string') continue
    const name = config.serverName
    if (config.transport === 'streamable-http') {
      if (typeof config.url !== 'string') continue
      mcpServers[name] = { type: 'http', url: config.url, headers: exportMap(config.headers, name, 'header', notes) }
    } else {
      if (typeof config.command !== 'string') continue
      const args = (Array.isArray(config.args) ? config.args : []).map(arg => (typeof arg === 'string' ? arg : '${ARG}'))
      mcpServers[name] = {
        command: config.command,
        args,
        env: exportMap(config.env, name, 'environment variable', notes),
        ...(typeof config.cwd === 'string' && config.cwd !== '' ? { cwd: config.cwd } : {}),
      }
    }
    if (row.disabled === true) notes.push(`${name}: switched off in DSH`)
  }
  return { json: `${JSON.stringify({ mcpServers }, null, 2)}\n`, count: Object.keys(mcpServers).length, notes }
}

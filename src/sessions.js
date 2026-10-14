/**
 * Open an ordinary Session that carries one prompt, for the AI-assisted flows.
 *
 * The Session is created through the public session controller in the
 * default Workspace and receives the prompt as a real user message, so what
 * the model sees is exactly what the transcript shows. It runs under the
 * person's own permission preset: every install the agent attempts still
 * asks for approval.
 *
 * @module dsh-mcp-console/sessions
 */

import { randomUUID } from 'node:crypto'

import { DEFAULT_WORKSPACE_DIRECTORY } from './constants.js'

const NO_DEFAULT = Symbol('no default workspace')

/**
 * Pick the Workspace a new Session opens in: the registry's first-use default
 * when it is still registered, else a Workspace named like the desktop
 * default, else the most recently updated one.
 * @param registry - `ctx.workspaceRegistry`.
 * @returns the Workspace, or undefined when none is registered.
 */
export async function resolveDefaultWorkspace(registry) {
  if (registry === undefined) return undefined
  if (typeof registry.initializeDefault === 'function') {
    try {
      // Never create one here: a missing default falls through to the list.
      const existing = await registry.initializeDefault(() => Promise.reject(NO_DEFAULT))
      if (existing !== undefined) return existing
    } catch (error) {
      if (error !== NO_DEFAULT) throw error
    }
  }
  const all = typeof registry.list === 'function' ? registry.list() : []
  if (all.length === 0) return undefined
  const named = all.find(workspace => workspace.title === DEFAULT_WORKSPACE_DIRECTORY)
  if (named !== undefined) return named
  return [...all].sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))[0]
}

/**
 * Create a Session in the default Workspace and send it `text`.
 * @param options - the session controller, the Workspace registry, the Agent
 *   preset, the Session title, the prompt, and cancellation.
 * @returns `{ sessionId, workspaceId? }`.
 */
export async function openPromptSession({ sessionController, workspaceRegistry, agentPreset, title, text, signal }) {
  if (sessionController === undefined) throw new Error('MCP console: the session controller is not available in this profile')
  if (typeof text !== 'string' || text.trim() === '') throw new Error('MCP console: the prompt is empty')
  const workspace = await resolveDefaultWorkspace(workspaceRegistry)
  const preset = typeof agentPreset === 'string' && agentPreset.trim() !== '' ? agentPreset.trim() : undefined
  const created = await sessionController.create({
    ...(workspace === undefined ? {} : { workspaceId: workspace.id }),
    ...(preset === undefined ? {} : { agentPreset: preset }),
  })
  const sessionId = created.sessionId
  if (typeof title === 'string' && title.trim() !== '' && typeof sessionController.rename === 'function') {
    // A title is a convenience; the Session works without it.
    await sessionController.rename({ sessionId, title: title.trim().slice(0, 80) }).catch(() => undefined)
  }
  await sessionController.prompt({
    requestId: randomUUID(),
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text }],
  }, signal ?? new AbortController().signal)
  return { sessionId, ...(workspace === undefined ? {} : { workspaceId: workspace.id }) }
}

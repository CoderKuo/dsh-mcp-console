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
 * Select a model for one Session without changing the person's default.
 *
 * `selectModel` is what DSH's own picker calls, and it also saves the choice
 * as the default model. The default is read first and saved back afterwards;
 * saves are applied in submission order, so the restore lands after the
 * picker's own save.
 * @param options - the session controller, the default-model service, the
 *   Session, and the `{ provider, model }` to use.
 */
export async function selectSessionModel({ sessionController, agentDefaultModel, sessionId, model }) {
  if (typeof sessionController?.selectModel !== 'function') throw new Error('MCP console: this profile cannot choose a model for a session')
  const previous = typeof agentDefaultModel?.currentSelection === 'function' ? agentDefaultModel.currentSelection() : undefined
  try {
    await sessionController.selectModel({ sessionId, provider: model.provider, model: model.model })
  } catch (error) {
    const reason = typeof error?.code === 'string' ? error.code : error instanceof Error ? error.message : String(error)
    throw new Error(`MCP console: the model ${model.provider} / ${model.model} cannot be used (${reason.slice(0, 120)})`)
  }
  // Restore even when the default still reads unchanged: the picker's save
  // may only be queued, and saving the same value back is harmless.
  if (previous !== undefined && typeof agentDefaultModel.saveSelection === 'function') await agentDefaultModel.saveSelection(previous)
}

/** A `{ provider, model }` the person picked, or undefined for the default model. */
export function pickedModel(value) {
  if (value === null || typeof value !== 'object') return undefined
  const provider = typeof value.provider === 'string' ? value.provider.trim() : ''
  const model = typeof value.model === 'string' ? value.model.trim() : ''
  return provider === '' || model === '' ? undefined : { provider, model }
}

/**
 * Create a Session in the default Workspace and send it `text`.
 * @param options - the session controller, the Workspace registry, the
 *   default-model service, the Agent preset, the model to use (the default
 *   when absent), the Session title, the prompt, and cancellation.
 * @returns `{ sessionId, workspaceId? }`.
 */
export async function openPromptSession({ sessionController, workspaceRegistry, agentDefaultModel, agentPreset, model, title, text, signal }) {
  if (sessionController === undefined) throw new Error('MCP console: the session controller is not available in this profile')
  if (typeof text !== 'string' || text.trim() === '') throw new Error('MCP console: the prompt is empty')
  const workspace = await resolveDefaultWorkspace(workspaceRegistry)
  const preset = typeof agentPreset === 'string' && agentPreset.trim() !== '' ? agentPreset.trim() : undefined
  const created = await sessionController.create({
    ...(workspace === undefined ? {} : { workspaceId: workspace.id }),
    ...(preset === undefined ? {} : { agentPreset: preset }),
  })
  const sessionId = created.sessionId
  // Chosen before the first prompt, so the first turn already runs on it.
  if (model !== undefined) await selectSessionModel({ sessionController, agentDefaultModel, sessionId, model })
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

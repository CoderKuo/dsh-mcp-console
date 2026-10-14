/**
 * The providers and models an AI session can run on, as the model picker
 * shows them: every registered provider route with the models it lists, and
 * the person's current default selection.
 *
 * @module dsh-mcp-console/models
 */

/** Bound on one provider's model listing; a slow provider is shown without models. */
export const MODEL_LIST_TIMEOUT_MS = 8_000

const withTimeout = (promise, ms) => {
  let timer
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timed out')), ms) })
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
}

/**
 * List the selectable models.
 * @param options - `ctx.llm`, `ctx.agentDefaultModel`, and the per-provider bound.
 * @returns `{ providers: [{ id, name, models: [{ id, name }], error? }], default? }`.
 */
export async function listModelChoices({ llm, agentDefaultModel, timeoutMs = MODEL_LIST_TIMEOUT_MS }) {
  const routes = typeof llm?.listProviders === 'function' ? llm.listProviders() : []
  const providers = await Promise.all(routes.map(async route => {
    const id = String(route?.id ?? '')
    const name = typeof route?.name === 'string' && route.name !== '' ? route.name : id
    try {
      const models = await withTimeout(Promise.resolve(llm.listModels(id)), timeoutMs)
      return {
        id,
        name,
        models: (Array.isArray(models) ? models : [])
          .filter(model => typeof model?.id === 'string')
          .map(model => ({ id: model.id, name: typeof model.name === 'string' && model.name !== '' ? model.name : model.id })),
      }
    } catch {
      return { id, name, models: [], error: true }
    }
  }))
  let current
  try {
    const selection = agentDefaultModel?.currentSelection?.()
    if (typeof selection?.provider === 'string' && typeof selection?.model === 'string') current = { provider: selection.provider, model: selection.model }
  } catch {
    current = undefined
  }
  return { providers: providers.filter(provider => provider.id !== ''), ...(current === undefined ? {} : { default: current }) }
}

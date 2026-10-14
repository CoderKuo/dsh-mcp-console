/**
 * The provider and model choice for AI sessions, shared by AI install and the
 * AI research of a scan.
 *
 * @module dsh-mcp-console/client-models
 */

import * as react from 'react'

// ── model choice ────────────────────────────────────────────────────────────

const MODEL_KEY = 'dsh-mcp-console.model'

/** The last model chosen on this page, per viewer; unavailable storage just forgets it. */
function rememberedModel() {
  try {
    const value = JSON.parse(window.localStorage.getItem(MODEL_KEY) ?? 'null')
    return typeof value?.provider === 'string' && typeof value?.model === 'string' ? value : undefined
  } catch {
    return undefined
  }
}

function rememberModel(value) {
  try {
    window.localStorage.setItem(MODEL_KEY, JSON.stringify(value))
  } catch {
    // Storage is a convenience.
  }
}

/** A choice still offered by the listing, else undefined. */
function offered(choices, value) {
  const provider = choices?.providers?.find(item => item.id === value?.provider)
  return provider?.models.some(model => model.id === value?.model) ? { provider: value.provider, model: value.model } : undefined
}

/** The first offered model, for a listing without a usable default. */
function firstOffered(choices) {
  const provider = choices?.providers?.find(item => item.models.length > 0)
  return provider === undefined ? undefined : { provider: provider.id, model: provider.models[0].id }
}

/** One shared selection for both AI flows: remembered, else the default model, else the first offered. */
export function useModelChoice(choices) {
  const [choice, setChoice] = react.useState()
  react.useEffect(() => {
    if (choices === undefined) return
    setChoice(current => offered(choices, current) ?? offered(choices, rememberedModel()) ?? offered(choices, choices.default) ?? firstOffered(choices))
  }, [choices])
  const update = next => {
    setChoice(next)
    if (next !== undefined) rememberModel(next)
  }
  return [choice, update]
}

/** Provider and model selects, like the model picker's two levels. */
export function ModelPicker({ choices, value, onChange, disabled, t }) {
  const providers = choices === undefined ? [] : choices.providers.filter(provider => provider.models.length > 0)
  if (providers.length === 0) {
    const reason = choices === undefined ? t('modelLoading') : choices.stale === true ? t('modelStale') : t('modelNone')
    return (
      <div className="mcpc-field">
        <span className="mcpc-label">{t('modelTitle')}</span>
        <span className="mcpc-hint">{reason}</span>
      </div>
    )
  }
  const provider = providers.find(item => item.id === value?.provider) ?? providers[0]
  const isDefault = value !== undefined && choices.default?.provider === value.provider && choices.default?.model === value.model
  return (
    <div className="mcpc-field">
      <span className="mcpc-label">{t('modelTitle')}</span>
      <div className="mcpc-actions">
        <select
          className="mcpc-input" data-select="true"
          aria-label={t('modelProvider')}
          disabled={disabled}
          value={provider.id}
          onChange={event => {
            const next = providers.find(item => item.id === event.target.value)
            if (next !== undefined) onChange({ provider: next.id, model: next.models[0].id })
          }}
        >
          {providers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select
          className="mcpc-input" data-select="true"
          aria-label={t('modelModel')}
          disabled={disabled}
          value={provider.models.some(model => model.id === value?.model) ? value.model : provider.models[0].id}
          onChange={event => onChange({ provider: provider.id, model: event.target.value })}
        >
          {provider.models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </div>
      <span className="mcpc-hint">{isDefault ? t('modelIsDefault') : t('modelHint')}</span>
    </div>
  )
}

/**
 * Browser half: the MCP sidebar entry and the page it opens.
 *
 * Every figure comes from the host over this plugin's loopback RPC channel;
 * configuration arrives redacted. Sessions the AI flows open are shown with
 * the workspace UI's own navigation.
 *
 * @module dsh-mcp-console/client
 */

import * as react from 'react'

import { en, zh } from './client-copy.js'
import { STYLE } from './client-style.js'
import { groupClientServers, launchLine } from './client-groups.js'
import { classifySource } from './sources.js'

const NS = 'mcpConsole'
const CHANNEL = '/mcp-console'
const PANEL_ID = 'mcp-console'
/** Pause before waiting again after a failed wait (host restarting, connection reset). */
const RETRY_MS = 3_000
/* global __MCP_CONSOLE_VERSION__ */
/** This page's build; compared with the host's to catch a DSH that was not restarted after an update. */
const CLIENT_VERSION = typeof __MCP_CONSOLE_VERSION__ === 'string' ? __MCP_CONSOLE_VERSION__ : 'dev'

const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => (values[name] === undefined ? match : String(values[name])))

function channelCaller(rpc) {
  return (endpoint, payload = {}, signal) => rpc.call(CHANNEL, endpoint, payload, signal).then(response => {
    if (!response?.ok) throw new Error(response?.error?.message ?? 'MCP console request failed')
    return response.value
  })
}

const clearMessage = error => String(error instanceof Error ? error.message : error).replace(/^MCP console:\s*/u, '')

// ── primitives ──────────────────────────────────────────────────────────────

function Card({ title, aside, children }) {
  return (
    <section className="mcpc-card">
      <header className="mcpc-head">
        <h3 className="mcpc-title">{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  )
}

function Button({ variant, size, children, ...rest }) {
  return <button type="button" className="mcpc-btn" data-variant={variant} data-size={size} {...rest}>{children}</button>
}

/** The sidebar glyph: two plugs meeting, drawn inline (no host UI imports). */
function PanelIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3v4M15 3v4M7 7h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 15v6" />
    </svg>
  )
}

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
function useModelChoice(choices) {
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
function ModelPicker({ choices, value, onChange, disabled, t }) {
  const providers = choices === undefined ? [] : choices.providers.filter(provider => provider.models.length > 0)
  if (providers.length === 0) {
    const reason = choices === undefined ? t('modelLoading') : choices.stale === true ? t('modelStale') : t('modelNone')
    return (
      <div className="mcpc-field">
        <span className="mcpc-label">{t('modelTitle')}</span>
        <span className="mcpc-meta">{reason}</span>
      </div>
    )
  }
  const provider = providers.find(item => item.id === value?.provider) ?? providers[0]
  const isDefault = value !== undefined && choices.default?.provider === value.provider && choices.default?.model === value.model
  return (
    <div className="mcpc-field">
      <span className="mcpc-label">{t('modelTitle')}</span>
      <div className="mcpc-form">
        <select
          className="mcpc-input mcpc-select"
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
          className="mcpc-input mcpc-select"
          aria-label={t('modelModel')}
          disabled={disabled}
          value={provider.models.some(model => model.id === value?.model) ? value.model : provider.models[0].id}
          onChange={event => onChange({ provider: provider.id, model: event.target.value })}
        >
          {provider.models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
        </select>
      </div>
      <span className="mcpc-meta">{isDefault ? t('modelIsDefault') : t('modelHint')}</span>
    </div>
  )
}

const STATUS_TONE = { connected: 'success', starting: 'info', failed: 'danger', disabled: 'neutral', stopped: 'neutral' }
const STATUS_KEY = { connected: 'statusConnected', starting: 'statusStarting', failed: 'statusFailed', disabled: 'statusDisabled', stopped: 'statusStopped' }

// ── configured servers ──────────────────────────────────────────────────────

function ServerRow({ server, call, t, onChanged }) {
  const [busy, setBusy] = react.useState(false)
  const [notice, setNotice] = react.useState()
  const [error, setError] = react.useState()
  const [showTools, setShowTools] = react.useState(false)
  const [editing, setEditing] = react.useState()
  const [confirming, setConfirming] = react.useState(false)

  const remove = () => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    call('servers/remove', { entryId: server.entryId })
      .then(result => {
        setConfirming(false)
        if (result?.application === 'restart-required') setNotice(t('restartRequired'))
        return onChanged()
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  const toggle = () => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    call('servers/toggle', { entryId: server.entryId, enabled: !server.enabled })
      .then(result => {
        if (result?.application === 'restart-required') setNotice(t('restartRequired'))
        else if (result?.application === 'overridden') setNotice(t('overridden'))
        return onChanged()
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  const saveRepository = () => {
    setBusy(true)
    setError(undefined)
    call('servers/repository', { rowId: server.rowId, url: editing ?? '' })
      .then(() => {
        setEditing(undefined)
        return onChanged()
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  const config = server.config ?? {}
  const mapTags = list => (Array.isArray(list) && list.length > 0
    ? (
      <span className="mcpc-tags">
        {list.map(item => <span key={item.name} className="mcpc-tag" title={item.source === 'expression' ? t('valueExpression') : t('valueLiteral')}>{item.name}</span>)}
      </span>
    )
    : undefined)

  return (
    <div className="mcpc-server" data-enabled={server.enabled ? 'true' : 'false'}>
      <div className="mcpc-server-top">
        <span className="mcpc-server-name">
          {server.name}
          <span className="mcpc-chip" data-tone={STATUS_TONE[server.status] ?? 'neutral'}>{t(STATUS_KEY[server.status] ?? 'statusStopped')}</span>
          {server.toolCount > 0 && <span className="mcpc-meta">{`${server.toolCount} ${t('tools')}`}</span>}
        </span>
        <span className="mcpc-actions">
          {server.removable && !confirming && <Button variant="danger" disabled={busy} onClick={() => setConfirming(true)}>{t('remove')}</Button>}
          <span className="mcpc-meta">{busy ? t('toggling') : server.enabled ? t('disable') : t('enable')}</span>
          <button
            type="button"
            role="switch"
            className="mcpc-switch"
            aria-checked={server.enabled}
            aria-label={server.enabled ? t('disable') : t('enable')}
            title={server.toggleable ? undefined : fill(t('readOnly'), { reason: server.readOnlyReason ?? '—' })}
            disabled={busy || !server.toggleable}
            onClick={toggle}
          />
        </span>
      </div>
      <dl className="mcpc-kv">
        <dt>{t('transport')}</dt>
        <dd>{config.transport}</dd>
        {config.transport === 'streamable-http'
          ? (
            <>
              <dt>{t('url')}</dt>
              <dd className="mcpc-mono">{config.url}</dd>
              {mapTags(config.headers) && (<><dt>{t('headers')}</dt><dd>{mapTags(config.headers)}</dd></>)}
            </>
          )
          : (
            <>
              <dt>{t('command')}</dt>
              <dd className="mcpc-mono">{[config.command, ...(config.args ?? [])].join(' ')}</dd>
              {mapTags(config.env) && (<><dt>{t('env')}</dt><dd>{mapTags(config.env)}</dd></>)}
              {config.cwd && (<><dt>{t('cwd')}</dt><dd className="mcpc-mono">{config.cwd}</dd></>)}
            </>
          )}
        <dt>{t('repository')}</dt>
        <dd>
          {editing === undefined
            ? (
              <span className="mcpc-actions">
                {server.repository
                  ? <a className="mcpc-link" href={server.repository} target="_blank" rel="noreferrer noopener">{server.repository}</a>
                  : <span className="mcpc-meta">{t('repositoryNone')}</span>}
                <Button variant="ghost" disabled={busy} onClick={() => setEditing(server.repository ?? '')}>{t('repositoryEdit')}</Button>
              </span>
            )
            : (
              <span className="mcpc-form">
                <input
                  className="mcpc-input"
                  type="url"
                  autoFocus
                  placeholder={t('repositoryPlaceholder')}
                  value={editing}
                  onChange={event => setEditing(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') saveRepository()
                    if (event.key === 'Escape') setEditing(undefined)
                  }}
                />
                <Button variant="primary" disabled={busy} onClick={saveRepository}>{t('repositorySave')}</Button>
                <Button variant="ghost" onClick={() => setEditing(undefined)}>{t('repositoryCancel')}</Button>
              </span>
            )}
        </dd>
        {server.bundle && (<><dt>{t('source')}</dt><dd className="mcpc-mono">{`${server.bundle.name}${server.bundle.version ? `@${server.bundle.version}` : ''}`}</dd></>)}
        <dt>{t('tools')}</dt>
        <dd>
          {server.toolCount === 0
            ? <span className="mcpc-meta">{t('toolsNone')}</span>
            : (
              <>
                <Button variant="ghost" onClick={() => setShowTools(open => !open)}>{showTools ? t('toolsHide') : fill(t('toolsShow'), { count: server.toolCount })}</Button>
                {showTools && <span className="mcpc-tags">{server.tools.map(name => <span key={name} className="mcpc-tag mcpc-mono">{name}</span>)}</span>}
              </>
            )}
        </dd>
      </dl>
      {confirming && (
        <div className="mcpc-callout" data-tone="danger">
          <span>{fill(t(server.bundle?.mcpRows > 1 ? 'removeConfirmMany' : 'removeConfirm'), { bundle: server.bundle?.name ?? '', count: server.bundle?.mcpRows ?? 1 })}</span>
          <span className="mcpc-actions">
            <Button variant="danger" disabled={busy} onClick={remove}>{busy ? t('removing') : t('removeYes')}</Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>{t('repositoryCancel')}</Button>
          </span>
        </div>
      )}
      {server.status === 'starting' && server.toolCount === 0 && <span className="mcpc-meta">{t('startingHint')}</span>}
      {server.error && <pre className="mcpc-detail">{server.error}</pre>}
      {notice && <p className="mcpc-note">{notice}</p>}
      {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
    </div>
  )
}

function ServersCard({ status, loading, error, reload, call, t }) {
  const servers = status?.servers ?? []
  const connected = servers.filter(server => server.status === 'connected').length
  return (
    <Card
      title={t('listTitle')}
      aside={<Button disabled={loading} onClick={() => reload()}>{loading ? t('refreshing') : t('refresh')}</Button>}
    >
      {servers.length > 0 && <span className="mcpc-meta">{fill(t('listCount'), { count: servers.length, connected })}</span>}
      {status !== undefined && status.manageable === false && <p className="mcpc-note">{t('noManager')}</p>}
      {status !== undefined && servers.length === 0 && <p className="mcpc-note">{t('listEmpty')}</p>}
      <div className="mcpc-list">
        {servers.map(server => <ServerRow key={server.entryId} server={server} call={call} t={t} onChanged={reload} />)}
      </div>
      {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
    </Card>
  )
}

// ── AI quick add ────────────────────────────────────────────────────────────

/** What the quick-add field was recognised as, or undefined while it is not a source. */
function recognised(text) {
  if (text.trim() === '') return undefined
  try {
    return classifySource(text)
  } catch {
    return null
  }
}

function QuickAddCard({ call, t, openSession, sessionsAvailable, choices, model, setModel }) {
  const [source, setSource] = react.useState('')
  const [notes, setNotes] = react.useState('')
  const [busy, setBusy] = react.useState(false)
  const [done, setDone] = react.useState(false)
  const [error, setError] = react.useState()
  const kind = recognised(source)

  const start = event => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    setDone(false)
    call('quick-add', { source, notes, locale: t('lang'), ...(model === undefined ? {} : { model }) })
      .then(result => {
        setDone(true)
        setSource('')
        setNotes('')
        openSession(result.sessionId)
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  return (
    <Card title={t('addTitle')}>
      <p className="mcpc-note">{t('addIntro')}</p>
      <form className="mcpc-add" onSubmit={start}>
        <label className="mcpc-field">
          <span className="mcpc-label">{t('addSource')}</span>
          <input className="mcpc-input" type="text" required spellCheck={false} placeholder={t('addSourcePlaceholder')} value={source} onChange={event => setSource(event.target.value)} />
          {kind === undefined && <span className="mcpc-meta">{t('addSourceHint')}</span>}
          {kind === null && <span className="mcpc-warn">{t('addSourceUnknown')}</span>}
          {kind && (
            <span className="mcpc-recognised">
              <span className="mcpc-chip" data-tone="info">{t(`kind_${kind.kind}`)}</span>
              <span className="mcpc-mono">{kind.label}</span>
            </span>
          )}
        </label>
        <label className="mcpc-field">
          <span className="mcpc-label">{t('addNotes')}</span>
          <textarea className="mcpc-textarea" rows={2} placeholder={t('addNotesPlaceholder')} value={notes} onChange={event => setNotes(event.target.value)} />
        </label>
        <ModelPicker choices={choices} value={model} onChange={setModel} disabled={busy} t={t} />
        <div className="mcpc-split">
          <Button type="submit" variant="primary" size="md" disabled={busy || !kind || !sessionsAvailable}>{busy ? t('addStarting') : t('addStart')}</Button>
        </div>
      </form>
      {!sessionsAvailable && <p className="mcpc-note">{t('noSessions')}</p>}
      {done && <p className="mcpc-note">{t('addOpened')}</p>}
      {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
    </Card>
  )
}

// ── manual add ──────────────────────────────────────────────────────────────

const emptyPair = () => ({ name: '', value: '', fromEnv: false })
/** A name whose literal value is masked while typing. */
const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu

/** Name/value rows (environment variables or headers); a row may read its value from the environment. */
function PairsEditor({ label, pairs, onChange, namePlaceholder, valuePlaceholder, disabled, t }) {
  const update = (index, patch) => onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)))
  return (
    <div className="mcpc-field">
      <span className="mcpc-label">{label}</span>
      {pairs.map((pair, index) => (
        <div key={index} className="mcpc-pair">
          <input className="mcpc-input mcpc-pair-name" spellCheck={false} disabled={disabled} placeholder={namePlaceholder} value={pair.name} onChange={event => update(index, { name: event.target.value })} />
          <input
            className="mcpc-input"
            spellCheck={false}
            disabled={disabled}
            type={!pair.fromEnv && SECRET_NAME.test(pair.name) ? 'password' : 'text'}
            autoComplete="off"
            placeholder={pair.fromEnv ? t('manualEnvPlaceholder') : valuePlaceholder}
            value={pair.value}
            onChange={event => update(index, { value: event.target.value })}
          />
          <label className="mcpc-check" title={t('manualFromEnvHint')}>
            <input type="checkbox" disabled={disabled} checked={pair.fromEnv} onChange={event => update(index, { fromEnv: event.target.checked })} />
            <span>{t('manualFromEnv')}</span>
          </label>
          <Button variant="ghost" disabled={disabled} aria-label={t('manualRemoveRow')} onClick={() => onChange(pairs.filter((_, i) => i !== index))}>×</Button>
        </div>
      ))}
      <span>
        <Button variant="ghost" disabled={disabled} onClick={() => onChange([...pairs, emptyPair()])}>{t('manualAddRow')}</Button>
      </span>
    </div>
  )
}

const INITIAL_MANUAL = { name: '', transport: 'stdio', commandLine: '', cwd: '', env: [], url: '', headers: [] }

/** A server name suggested from the command or URL, for an empty name field. */
function suggestedName(form) {
  try {
    if (form.transport === 'streamable-http') return new URL(form.url).hostname.split('.').filter(part => !/^(?:www|mcp|api)$/u.test(part))[0]?.slice(0, 32) ?? ''
    const source = classifySource(form.commandLine)
    const base = source.label.replace(/^.*\//u, '').replace(/[@:].*$/u, '').replace(/^(?:mcp-server-|server-)/u, '').replace(/-mcp(?:-server)?$/u, '')
    return base.replace(/[^A-Za-z0-9_-]+/gu, '-').slice(0, 32)
  } catch {
    return ''
  }
}

function ManualAddCard({ call, t, onAdded }) {
  const [form, setForm] = react.useState(INITIAL_MANUAL)
  const [busy, setBusy] = react.useState(false)
  const [done, setDone] = react.useState()
  const [error, setError] = react.useState()
  const set = patch => setForm(current => ({ ...current, ...patch }))
  const remote = form.transport === 'streamable-http'
  const suggestion = suggestedName(form)
  const name = form.name.trim() === '' ? suggestion : form.name.trim()
  const ready = name !== '' && (remote ? form.url.trim() !== '' : form.commandLine.trim() !== '')

  const submit = event => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    setDone(undefined)
    call('servers/add', { ...form, name })
      .then(result => {
        setDone(result)
        setForm(INITIAL_MANUAL)
        return onAdded()
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  return (
    <Card title={t('manualTitle')}>
      <p className="mcpc-note">{t('manualIntro')}</p>
      <form className="mcpc-add" onSubmit={submit}>
        <div className="mcpc-seg" role="radiogroup" aria-label={t('manualKind')}>
          <button type="button" role="radio" aria-checked={!remote} disabled={busy} onClick={() => set({ transport: 'stdio' })}>{t('manualStdio')}</button>
          <button type="button" role="radio" aria-checked={remote} disabled={busy} onClick={() => set({ transport: 'streamable-http' })}>{t('manualHttp')}</button>
        </div>
        <label className="mcpc-field">
          <span className="mcpc-label">{t('manualName')}</span>
          <input className="mcpc-input" spellCheck={false} disabled={busy} maxLength={32} placeholder={suggestion === '' ? t('manualNamePlaceholder') : suggestion} value={form.name} onChange={event => set({ name: event.target.value })} />
        </label>
        {remote
          ? (
            <>
              <label className="mcpc-field">
                <span className="mcpc-label">{t('manualUrl')}</span>
                <input className="mcpc-input mcpc-mono" type="url" spellCheck={false} disabled={busy} placeholder="https://mcp.example.com/mcp" value={form.url} onChange={event => set({ url: event.target.value })} />
                <span className="mcpc-meta">{t('manualUrlHint')}</span>
              </label>
              <PairsEditor label={t('headers')} pairs={form.headers} onChange={headers => set({ headers })} namePlaceholder="Authorization" valuePlaceholder={t('manualValuePlaceholder')} disabled={busy} t={t} />
            </>
          )
          : (
            <>
              <label className="mcpc-field">
                <span className="mcpc-label">{t('manualCommand')}</span>
                <input className="mcpc-input mcpc-mono" spellCheck={false} disabled={busy} placeholder="npx -y @upstash/context7-mcp" value={form.commandLine} onChange={event => set({ commandLine: event.target.value })} />
                <span className="mcpc-meta">{t('manualCommandHint')}</span>
              </label>
              <PairsEditor label={t('env')} pairs={form.env} onChange={env => set({ env })} namePlaceholder="API_KEY" valuePlaceholder={t('manualValuePlaceholder')} disabled={busy} t={t} />
              <label className="mcpc-field">
                <span className="mcpc-label">{t('manualCwd')}</span>
                <input className="mcpc-input mcpc-mono" spellCheck={false} disabled={busy} placeholder={t('manualCwdPlaceholder')} value={form.cwd} onChange={event => set({ cwd: event.target.value })} />
              </label>
            </>
          )}
        <p className="mcpc-note">{t('manualSecrets')}</p>
        <div className="mcpc-split">
          <Button type="submit" variant="primary" size="md" disabled={busy || !ready}>{busy ? t('manualAdding') : t('manualAdd')}</Button>
        </div>
      </form>
      {done && <p className="mcpc-note">{done.application === 'restart-required' ? t('importedRestart') : fill(t('manualAdded'), { name: done.serverName })}</p>}
      {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
    </Card>
  )
}

// ── local discovery ─────────────────────────────────────────────────────────

function Group({ title, items, render }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <div className="mcpc-group">
      <span className="mcpc-label">{`${title} (${items.length})`}</span>
      <ul>{items.map((item, index) => <li key={index}>{render(item)}</li>)}</ul>
    </div>
  )
}

/** MCP servers configured in other clients, each importable in one step. */
function ClientServers({ servers, existing, call, t, onImported }) {
  const [state, setState] = react.useState({})
  const rows = react.useMemo(() => groupClientServers(servers), [servers])
  if (rows.length === 0) return null
  const importOne = row => {
    setState(current => ({ ...current, [row.key]: { busy: true } }))
    call('servers/import', { client: row.clients[0], name: row.name })
      .then(result => {
        setState(current => ({ ...current, [row.key]: { done: result } }))
        return onImported()
      })
      .catch(failure => setState(current => ({ ...current, [row.key]: { error: clearMessage(failure) } })))
  }
  return (
    <section className="mcpc-imports">
      <header className="mcpc-imports-head">
        <span className="mcpc-label">{t('scanClients')}</span>
        <span className="mcpc-meta">{fill(t('importCount'), { count: rows.length })}</span>
      </header>
      <p className="mcpc-meta">{t('importIntro')}</p>
      <ul className="mcpc-import-list">
        {rows.map(row => {
          const entry = state[row.key] ?? {}
          const present = existing.includes(row.name)
          const line = launchLine(row)
          return (
            <li key={row.key} className="mcpc-import-row">
              <div className="mcpc-import-main">
                <div className="mcpc-import-title">
                  <span className="mcpc-import-name">{row.name}</span>
                  <span className="mcpc-tag">{row.command ? 'stdio' : 'http'}</span>
                  {row.clients.map(client => <span key={client} className="mcpc-tag mcpc-tag-soft">{client}</span>)}
                  {present && entry.done === undefined && <span className="mcpc-chip" data-tone="neutral">{t('importPresent')}</span>}
                </div>
                <span className="mcpc-import-cmd" title={line}>{line}</span>
                {entry.error && <span className="mcpc-error">{entry.error}</span>}
              </div>
              <div className="mcpc-import-action">
                {entry.done
                  ? <span className="mcpc-chip" data-tone="success">{entry.done.application === 'restart-required' ? t('importedRestart') : fill(t('imported'), { name: entry.done.serverName })}</span>
                  : (
                    <Button variant={present ? undefined : 'primary'} disabled={entry.busy === true} onClick={() => importOne(row)}>
                      {entry.busy ? t('importing') : present ? t('importAgain') : t('import')}
                    </Button>
                  )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ScanCard({ call, t, openSession, sessionsAvailable, choices, model, setModel, existing, onImported }) {
  const [scan, setScan] = react.useState()
  const [busy, setBusy] = react.useState(false)
  const [analyzing, setAnalyzing] = react.useState(false)
  const [error, setError] = react.useState()

  // The host keeps the last scan; show it instead of scanning again.
  react.useEffect(() => {
    let live = true
    call('scan/last').then(saved => {
      if (live && saved) setScan(current => current ?? saved)
    }).catch(() => undefined)
    return () => { live = false }
  }, [call])

  const start = () => {
    setBusy(true)
    setError(undefined)
    call('scan')
      .then(setScan)
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  const analyze = () => {
    setAnalyzing(true)
    setError(undefined)
    call('scan/analyze', { locale: t('lang'), ...(model === undefined ? {} : { model }) })
      .then(result => openSession(result.sessionId))
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setAnalyzing(false))
  }

  const clientServers = (scan?.clients ?? []).flatMap(client => client.servers.map(server => ({ ...server, client: client.client })))
  return (
    <Card title={t('scanTitle')} aside={<Button disabled={busy} onClick={start}>{busy ? t('scanning') : scan === undefined ? t('scanStart') : t('scanAgain')}</Button>}>
      <p className="mcpc-note">{t('scanIntro')}</p>
      {scan !== undefined && (
        <>
          <span className="mcpc-meta">{fill(t('scanAt'), { time: new Date(scan.scannedAt).toLocaleString() })}</span>
          <span className="mcpc-meta">
            {fill(t('scanSummary'), {
              apps: scan.apps.length,
              services: scan.services.length,
              processes: scan.processes.length,
              ports: scan.ports.length,
              containers: scan.containers.length,
              clients: scan.clients.length,
            })}
          </span>
          <ClientServers servers={clientServers} existing={existing} call={call} t={t} onImported={onImported} />
          <div className="mcpc-columns">
            <Group title={t('scanApps')} items={scan.apps} render={item => [item.name, item.publisher].filter(Boolean).join(' · ')} />
            <Group title={t('scanServices')} items={scan.services} render={item => item.display ?? item.name} />
            <Group title={t('scanPorts')} items={scan.ports} render={item => `${item.port}${item.process ? ` ← ${item.process}` : ''}`} />
            <Group title={t('scanContainers')} items={scan.containers} render={item => `${item.name} (${item.image})`} />
            <Group title={t('scanProcesses')} items={scan.processes} render={item => [item.name, item.product].filter(Boolean).join(' · ')} />
          </div>
          <p className="mcpc-note">{t('scanPrivacy')}</p>
          <ModelPicker choices={choices} value={model} onChange={setModel} disabled={analyzing} t={t} />
          <div className="mcpc-split">
            <Button variant="primary" size="md" disabled={analyzing || !sessionsAvailable} onClick={analyze}>{analyzing ? t('scanAnalyzing') : t('scanAnalyze')}</Button>
          </div>
        </>
      )}
      {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
    </Card>
  )
}

// ── the page ────────────────────────────────────────────────────────────────

function ConsolePage({ rpc, t, openSession }) {
  const call = react.useMemo(() => channelCaller(rpc), [rpc])
  const [status, setStatus] = react.useState()
  const [loading, setLoading] = react.useState(false)
  const [error, setError] = react.useState()

  const reload = react.useCallback(() => {
    setLoading(true)
    return call('status')
      .then(next => {
        setStatus(next)
        setError(undefined)
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setLoading(false))
  }, [call])

  react.useEffect(() => {
    void reload()
    // Wait for the host to announce a change (tools registered or dropped,
    // the Plugin Manager changed the profile) instead of polling. A wait
    // answers at once when the revision moved, or after a bound.
    const controller = new AbortController()
    let revision = 0
    const loop = async () => {
      while (!controller.signal.aborted) {
        try {
          const next = await call('status/wait', { revision }, controller.signal)
          if (controller.signal.aborted) return
          if (next.revision !== revision) {
            revision = next.revision
            const fresh = await call('status', {}, controller.signal)
            if (!controller.signal.aborted) setStatus(fresh)
          }
        } catch {
          if (controller.signal.aborted) return
          await new Promise(resolve => { window.setTimeout(resolve, RETRY_MS) })
        }
      }
    }
    void loop()
    return () => controller.abort()
  }, [reload, call])

  // The providers and models the picker offers, read once per page visit.
  const [choices, setChoices] = react.useState()
  react.useEffect(() => {
    let live = true
    call('models').then(value => { if (live) setChoices(value) }).catch(failure => {
      // A host older than this page does not know the endpoint.
      if (live) setChoices({ providers: [], stale: /unknown endpoint/u.test(clearMessage(failure)) })
    })
    return () => { live = false }
  }, [call])
  const [model, setModel] = useModelChoice(choices)

  const sessionsAvailable = status?.sessions !== false
  const ai = { choices, model, setModel }
  return (
    <div className="mcpc-page">
      <div className="mcpc">
        <header className="mcpc-header">
          <h2 className="mcpc-h1">{t('title')}</h2>
        </header>
        <p className="mcpc-intro">{t('intro')}</p>
        {status !== undefined && CLIENT_VERSION !== 'dev' && status.version !== CLIENT_VERSION && (
          <p className="mcpc-warn" role="alert">{fill(t('restartNeeded'), { page: CLIENT_VERSION, host: status.version ?? '?' })}</p>
        )}
        <ServersCard status={status} loading={loading} error={error} reload={reload} call={call} t={t} />
        <QuickAddCard call={call} t={t} openSession={openSession} sessionsAvailable={sessionsAvailable} {...ai} />
        <ManualAddCard call={call} t={t} onAdded={reload} />
        <ScanCard call={call} t={t} openSession={openSession} sessionsAvailable={sessionsAvailable} {...ai} existing={(status?.servers ?? []).map(server => server.name)} onImported={reload} />
      </div>
    </div>
  )
}

export const inject = ['slots', 'locale', 'connection', 'layout']

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'mcp-console: copy')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-mcp-console'
    tag.textContent = STYLE
    document.head.append(tag)
    return () => tag.remove()
  }, 'mcp-console: style')
  const connection = ctx.get('connection')
  const t = ctx.locale.bind(NS)
  // A Session the AI flows opened is shown with the workspace UI's own
  // navigation; without it the Session still exists in the sidebar list.
  const openSession = sessionId => {
    const workspace = ctx.get('uiWorkspace')
    if (typeof sessionId === 'string' && typeof workspace?.openSession === 'function') workspace.openSession(sessionId)
  }
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: () => ({ rpc: connection.rpc, t, openSession }),
  }, ConsolePage))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 5,
    label: () => t('panel'),
    locale: NS,
  }, PanelIcon))
}

/**
 * The Add tab: pick where the server comes from (the official registry, by
 * hand, AI, or another client), then finish in one place. The registry and
 * by-hand paths end in the same server form.
 *
 * @module dsh-mcp-console/client-add
 */

import * as react from 'react'

import { groupClientServers, launchLine } from './client-groups.js'
import { ServerForm, missingRuntime } from './client-form.jsx'
import { ModelPicker } from './client-models.jsx'
import { Button, Icon, Panel, clearMessage, fill } from './client-ui.jsx'
import { classifySource } from './sources.js'

const SAFE_LINK = /^https:\/\//u
export const SOURCES = [
  { id: 'registry', icon: 'search' },
  { id: 'manual', icon: 'pen' },
  { id: 'ai', icon: 'spark' },
  { id: 'import', icon: 'import' },
]

// ── registry ────────────────────────────────────────────────────────────────

function RegistrySearch({ call, t, runtimes, existing, onUse, memory }) {
  const [query, setQuery] = react.useState(memory.current.query ?? '')
  const [state, setState] = react.useState(memory.current.state ?? { results: [], searched: false })
  const [busy, setBusy] = react.useState(false)
  const [error, setError] = react.useState()
  // Kept across "back" from the form, so the results are still there.
  react.useEffect(() => { memory.current = { query, state } }, [memory, query, state])

  const search = cursor => {
    setBusy(true)
    setError(undefined)
    call('registry/search', { query, ...(cursor === undefined ? {} : { cursor }) })
      .then(page => setState(current => ({
        results: cursor === undefined ? page.results : [...current.results, ...page.results],
        nextCursor: page.nextCursor,
        searched: true,
        query,
      })))
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <form className="mcpc-search" onSubmit={event => { event.preventDefault(); search() }}>
        <input className="mcpc-input" type="search" autoFocus spellCheck={false} placeholder={t('registryPlaceholder')} aria-label={t('registrySearch')} value={query} onChange={event => setQuery(event.target.value)} />
        <Button type="submit" variant="primary" size="md" disabled={busy || query.trim() === ''}>{busy ? t('registrySearching') : t('registrySearch')}</Button>
      </form>
      <p className="mcpc-note">{t('registryIntro')}</p>
      {error && <p className="mcpc-note" data-tone="bad" role="alert">{`${t('error')}: ${error}`}</p>}
      {state.searched && state.results.length === 0 && <p className="mcpc-note">{fill(t('registryNone'), { query: state.query })}</p>}
      <div className="mcpc-results">
        {state.results.map(result => (
          <div key={`${result.name}@${result.version}`} className="mcpc-res">
            <div className="mcpc-res-top">
              <b>{result.title || result.name}</b>
              {result.version && <span className="mcpc-tag">{result.version}</span>}
              {result.title && <span className="mcpc-muted" data-mono="true">{result.name}</span>}
              {result.repository && SAFE_LINK.test(result.repository) && <a className="mcpc-link" href={result.repository} target="_blank" rel="noreferrer noopener">{t('registryRepository')}</a>}
              {result.website && SAFE_LINK.test(result.website) && <a className="mcpc-link" href={result.website} target="_blank" rel="noreferrer noopener">{t('registryWebsite')}</a>}
            </div>
            {result.description && <span className="mcpc-muted">{result.description}</span>}
            {result.options.length === 0 && <span className="mcpc-muted">{t('registryNoOption')}</span>}
            {result.options.map((option, index) => {
              const missing = missingRuntime(option.form, runtimes)
              const line = option.form.commandLine || option.form.url
              return (
                <div key={index} className="mcpc-opt">
                  <code title={line}>{line}</code>
                  <span className="mcpc-actions">
                    <span className="mcpc-tag" data-soft="true">{t(`registryKind_${option.kind}`)}</span>
                    {option.form.bridge && <span className="mcpc-tag" data-soft="true">mcp-remote</span>}
                    {missing && <span className="mcpc-chip" data-tone="bad">{fill(t('registryMissing'), { name: missing.name })}</span>}
                    {existing.includes(option.form.name) && <span className="mcpc-chip" data-tone="idle">{t('importPresent')}</span>}
                    <Button onClick={() => onUse(option.form, result.title || result.name)}>{t('registryUse')}</Button>
                  </span>
                </div>
              )
            })}
            {result.skipped.length > 0 && <span className="mcpc-hint">{fill(t('registrySkipped'), { list: result.skipped.join('; ') })}</span>}
          </div>
        ))}
      </div>
      {state.nextCursor && <span><Button disabled={busy} onClick={() => search(state.nextCursor)}>{t('registryMore')}</Button></span>}
    </>
  )
}

// ── AI ──────────────────────────────────────────────────────────────────────

function recognised(text) {
  if (text.trim() === '') return undefined
  try {
    return classifySource(text)
  } catch {
    return null
  }
}

function AiInstall({ call, t, openSession, sessionsAvailable, choices, model, setModel }) {
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
    <form className="mcpc-form" onSubmit={start}>
      <label className="mcpc-field">
        <span className="mcpc-label">{t('addSource')}</span>
        <input className="mcpc-input" type="text" autoFocus spellCheck={false} placeholder={t('addSourcePlaceholder')} value={source} onChange={event => setSource(event.target.value)} />
        {kind === undefined && <span className="mcpc-hint">{t('addSourceHint')}</span>}
        {kind === null && <span className="mcpc-hint" data-tone="warn">{t('addSourceUnknown')}</span>}
        {kind && (
          <span className="mcpc-actions">
            <span className="mcpc-chip" data-tone="info">{t(`kind_${kind.kind}`)}</span>
            <span className="mcpc-muted" data-mono="true">{kind.label}</span>
          </span>
        )}
      </label>
      <label className="mcpc-field">
        <span className="mcpc-label">{t('addNotes')}</span>
        <textarea className="mcpc-input" data-multiline="true" rows={2} placeholder={t('addNotesPlaceholder')} value={notes} onChange={event => setNotes(event.target.value)} />
      </label>
      <ModelPicker choices={choices} value={model} onChange={setModel} disabled={busy} t={t} />
      <div className="mcpc-actions">
        <Button type="submit" variant="primary" size="md" disabled={busy || !kind || !sessionsAvailable}>{busy ? t('addStarting') : t('addStart')}</Button>
        <span className="mcpc-muted">{t('aiFootnote')}</span>
      </div>
      {!sessionsAvailable && <p className="mcpc-note" data-tone="warn">{t('noSessions')}</p>}
      {done && <p className="mcpc-note" data-tone="ok">{t('addOpened')}</p>}
      {error && <p className="mcpc-note" data-tone="bad" role="alert">{`${t('error')}: ${error}`}</p>}
    </form>
  )
}

// ── import ──────────────────────────────────────────────────────────────────

export function clientServersOf(scan) {
  return (scan?.clients ?? []).flatMap(client => client.servers.map(server => ({ ...server, client: client.client })))
}

function ImportClients({ call, t, scan, scanning, rescan, existing, onImported }) {
  const rows = react.useMemo(() => groupClientServers(clientServersOf(scan)), [scan])
  const [picked, setPicked] = react.useState(() => new Set())
  const [state, setState] = react.useState({})
  const [running, setRunning] = react.useState(false)
  react.useEffect(() => {
    setPicked(new Set(rows.filter(row => !existing.includes(row.name)).map(row => row.key)))
  }, [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  if (scan === undefined || scan === null) {
    return (
      <div className="mcpc-empty" data-compact="true">
        <p className="mcpc-note">{t('importNeedsScan')}</p>
        <Button variant="primary" size="md" disabled={scanning} onClick={rescan}>{scanning ? t('scanning') : t('scanStart')}</Button>
      </div>
    )
  }
  const chosen = rows.filter(row => picked.has(row.key) && state[row.key]?.done === undefined)
  const toggle = key => setPicked(current => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  // One at a time: each install runs pnpm on the profile.
  const run = async () => {
    setRunning(true)
    for (const row of chosen) {
      setState(current => ({ ...current, [row.key]: { busy: true } }))
      try {
        const result = await call('servers/import', { client: row.clients[0], name: row.name })
        setState(current => ({ ...current, [row.key]: { done: result } }))
      } catch (failure) {
        setState(current => ({ ...current, [row.key]: { error: clearMessage(failure) } }))
      }
    }
    setRunning(false)
    await onImported()
  }

  return (
    <>
      <div className="mcpc-crumb">
        <span>{fill(t('importScannedAt'), { time: new Date(scan.scannedAt).toLocaleString() })}</span>
        <button type="button" className="mcpc-textbtn" disabled={scanning} onClick={rescan}>{scanning ? t('scanning') : t('scanAgain')}</button>
      </div>
      {rows.length === 0 && <p className="mcpc-note">{t('importNone')}</p>}
      <div className="mcpc-imports">
        {rows.map(row => {
          const entry = state[row.key] ?? {}
          const present = existing.includes(row.name) && entry.done === undefined
          const line = launchLine(row)
          return (
            <label key={row.key} className="mcpc-imp" data-disabled={entry.done !== undefined ? 'true' : undefined}>
              <input type="checkbox" disabled={running || entry.done !== undefined} checked={picked.has(row.key) && entry.done === undefined} onChange={() => toggle(row.key)} />
              <span className="mcpc-imp-main">
                <span className="mcpc-imp-title">
                  <b>{row.name}</b>
                  <span className="mcpc-tag" data-soft="true">{row.command ? 'stdio' : 'http'}</span>
                  {row.clients.map(client => <span key={client} className="mcpc-tag" data-soft="true" data-sans="true">{client}</span>)}
                </span>
                <code title={line}>{line}</code>
                {entry.error && <span className="mcpc-hint" data-tone="bad">{entry.error}</span>}
              </span>
              <span>
                {entry.busy && <span className="mcpc-spinner" />}
                {entry.done && <span className="mcpc-chip" data-tone="ok">{entry.done.application === 'restart-required' ? t('importedRestart') : fill(t('imported'), { name: entry.done.serverName })}</span>}
                {present && !entry.busy && <span className="mcpc-chip" data-tone="idle">{t('importPresent')}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {rows.length > 0 && <p className="mcpc-note">{t('importIntro')}</p>}
      {rows.length > 0 && (
        <div className="mcpc-actions">
          <Button variant="primary" size="md" disabled={running || chosen.length === 0} onClick={() => { void run() }}>{running ? t('importing') : fill(t('importN'), { count: chosen.length })}</Button>
        </div>
      )}
    </>
  )
}

// ── the tab ─────────────────────────────────────────────────────────────────

export function AddView({ source, setSource, call, t, runtimes, existing, scan, scanning, rescan, onSaved, ai }) {
  const [picked, setPicked] = react.useState()
  const registryMemory = react.useRef({})
  // A new source starts over.
  react.useEffect(() => { setPicked(undefined) }, [source])

  let body = null
  if (source === 'registry') {
    body = picked === undefined
      ? <RegistrySearch call={call} t={t} runtimes={runtimes} existing={existing} memory={registryMemory} onUse={(form, origin) => setPicked({ form, origin, key: Date.now() })} />
      : (
        <>
          <div className="mcpc-crumb"><button type="button" className="mcpc-textbtn" onClick={() => setPicked(undefined)}>{t('src_registry')}</button><span>›</span><span>{t('stepCheck')}</span></div>
          <ServerForm key={picked.key} mode="add" initial={picked.form} origin={picked.origin} call={call} t={t} runtimes={runtimes} onSaved={result => { setPicked(undefined); onSaved(result) }} />
        </>
      )
  } else if (source === 'manual') {
    body = <ServerForm mode="add" call={call} t={t} runtimes={runtimes} onSaved={onSaved} />
  } else if (source === 'ai') {
    body = <AiInstall call={call} t={t} {...ai} />
  } else if (source === 'import') {
    body = <ImportClients call={call} t={t} scan={scan} scanning={scanning} rescan={rescan} existing={existing} onImported={() => onSaved(undefined)} />
  }

  return (
    <Panel title={t('addHow')}>
      <div className="mcpc-sources">
        {SOURCES.map(item => (
          <button key={item.id} type="button" className="mcpc-src" aria-pressed={source === item.id} onClick={() => setSource(source === item.id ? undefined : item.id)}>
            <Icon name={item.icon} size={20} />
            <b>{t(`src_${item.id}`)}</b>
            <span>{t(`src_${item.id}_text`)}</span>
          </button>
        ))}
      </div>
      {body !== null && <div className="mcpc-step">{body}</div>}
    </Panel>
  )
}

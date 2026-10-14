/**
 * Browser half: the MCP sidebar entry and the page it opens.
 *
 * The page has three tabs: Installed (look after the servers), Add (one place
 * for every way to add one), and Discover (the local scan and the AI
 * research). Editing and the export open in a side drawer. Every figure comes
 * from the host over this plugin's loopback RPC channel; configuration
 * arrives redacted. Sessions the AI flows open are shown with the workspace
 * UI's own navigation.
 *
 * @module dsh-mcp-console/client
 */

import * as react from 'react'

import { AddView } from './client-add.jsx'
import { en, zh } from './client-copy.js'
import { DiscoverView } from './client-discover.jsx'
import { ServerForm } from './client-form.jsx'
import { InstalledView } from './client-installed.jsx'
import { useModelChoice } from './client-models.jsx'
import { STYLE } from './client-style.js'
import { Button, Drawer, Icon, clearMessage, fill } from './client-ui.jsx'

const NS = 'mcpConsole'
const CHANNEL = '/mcp-console'
const PANEL_ID = 'mcp-console'
/** Pause before waiting again after a failed wait (host restarting, connection reset). */
const RETRY_MS = 3_000
const TAB_KEY = 'dsh-mcp-console.tab'
/* global __MCP_CONSOLE_VERSION__ */
/** This page's build; compared with the host's to catch a DSH that was not restarted after an update. */
const CLIENT_VERSION = typeof __MCP_CONSOLE_VERSION__ === 'string' ? __MCP_CONSOLE_VERSION__ : 'dev'
const TABS = ['installed', 'add', 'discover']

function channelCaller(rpc) {
  return (endpoint, payload = {}, signal) => rpc.call(CHANNEL, endpoint, payload, signal).then(response => {
    if (!response?.ok) throw new Error(response?.error?.message ?? 'MCP console request failed')
    return response.value
  })
}

/** The sidebar glyph: a plug, drawn inline (no host UI imports). */
function PanelIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 3v4M15 3v4M7 7h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 15v6" />
    </svg>
  )
}

const rememberedTab = () => {
  try {
    const value = window.localStorage.getItem(TAB_KEY)
    return TABS.includes(value) ? value : 'installed'
  } catch {
    return 'installed'
  }
}

/** A short message at the bottom of the page. */
function useToast() {
  const [text, setText] = react.useState()
  const timer = react.useRef()
  const show = react.useCallback(message => {
    setText(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setText(undefined), 3_000)
  }, [])
  react.useEffect(() => () => window.clearTimeout(timer.current), [])
  return [text, show]
}

/** The export: JSON other clients read, to copy or save. Secrets are placeholders. */
function ExportDrawer({ call, t, onClose }) {
  const [state, setState] = react.useState()
  const [copied, setCopied] = react.useState(false)
  const area = react.useRef(null)
  react.useEffect(() => {
    let live = true
    call('servers/export').then(value => { if (live) setState(value) }).catch(failure => { if (live) setState({ error: clearMessage(failure) }) })
    return () => { live = false }
  }, [call])
  const copy = () => { void copyText(state.json, area.current).then(setCopied) }
  const download = () => {
    const url = URL.createObjectURL(new Blob([state.json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'mcp-servers.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
  return (
    <Drawer
      title={state?.count === undefined ? t('exportTitle') : fill(t('exportCount'), { count: state.count })}
      onClose={onClose}
      closeLabel={t('close')}
      footer={state?.json && (
        <span className="mcpc-actions">
          <Button variant="primary" size="md" onClick={copy}>{copied ? t('exportCopied') : t('exportCopy')}</Button>
          <Button size="md" onClick={download}>{t('exportDownload')}</Button>
        </span>
      )}
    >
      {state === undefined && <span className="mcpc-muted">{t('loading')}</span>}
      {state?.error && <p className="mcpc-note" data-tone="bad">{state.error}</p>}
      {state?.json && (
        <>
          <p className="mcpc-note">{t('exportIntro')}</p>
          <textarea ref={area} className="mcpc-input" data-mono="true" data-multiline="true" readOnly rows={16} value={state.json} onFocus={event => event.target.select()} />
          {state.notes.length > 0 && <ul className="mcpc-notes">{state.notes.map(note => <li key={note}>{note}</li>)}</ul>}
        </>
      )}
    </Drawer>
  )
}

/** Copy a text, or select it in its box when the clipboard refuses. */
function copyText(text, box) {
  const fallback = () => { box?.select(); return false }
  if (navigator.clipboard?.writeText === undefined) return Promise.resolve(fallback())
  return navigator.clipboard.writeText(text).then(() => true, fallback)
}

/** Diagnostics to paste to whoever helps: versions, servers, recent problems; no secrets. */
function DiagnosticsDrawer({ call, t, onClose }) {
  const [state, setState] = react.useState()
  const [copied, setCopied] = react.useState(false)
  const [reveal, setReveal] = react.useState()
  const box = react.useRef(null)
  react.useEffect(() => {
    let live = true
    call('diagnostics', { pageVersion: CLIENT_VERSION }).then(value => { if (live) setState(value) }).catch(failure => { if (live) setState({ error: clearMessage(failure) }) })
    return () => { live = false }
  }, [call])
  const open = () => {
    setReveal(undefined)
    call('diagnostics/reveal').then(() => setReveal({ ok: true })).catch(failure => setReveal({ error: clearMessage(failure) }))
  }
  return (
    <Drawer
      title={t('diagTitle')}
      onClose={onClose}
      closeLabel={t('close')}
      footer={state?.text && (
        <span className="mcpc-actions">
          <Button variant="primary" size="md" onClick={() => { void copyText(state.text, box.current).then(setCopied) }}>{copied ? t('exportCopied') : t('diagCopy')}</Button>
          <Button size="md" onClick={open}>{t('diagOpenFolder')}</Button>
        </span>
      )}
    >
      {state === undefined && <span className="mcpc-muted">{t('loading')}</span>}
      {state?.error && <p className="mcpc-note" data-tone="bad">{state.error}</p>}
      {state?.text && (
        <>
          <p className="mcpc-note">{t('diagIntro')}</p>
          <textarea ref={box} className="mcpc-input" data-mono="true" data-multiline="true" readOnly rows={18} value={state.text} onFocus={event => event.target.select()} />
          <span className="mcpc-hint">{fill(t('diagLogAt'), { path: state.logDir })}</span>
          {reveal?.error && <p className="mcpc-note" data-tone="warn">{reveal.error}</p>}
        </>
      )}
    </Drawer>
  )
}

/** A failure while drawing a tab: say so, log it, and offer the diagnostics. */
class TabBoundary extends react.Component {
  constructor(props) {
    super(props)
    this.state = { error: undefined }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    const stack = String(info?.componentStack ?? '').split(/\r?\n/u).map(item => item.trim()).filter(Boolean).slice(0, 4).join(' < ')
    this.props.call('log/client', { event: 'page-error', detail: `${error?.message ?? error} @ ${stack}` }).catch(() => undefined)
  }

  render() {
    const { t, onDiagnostics } = this.props
    if (this.state.error === undefined) return this.props.children
    return (
      <section className="mcpc-panel">
        <div className="mcpc-empty">
          <b>{t('pageErrorTitle')}</b>
          <p className="mcpc-note">{String(this.state.error?.message ?? this.state.error)}</p>
          <span className="mcpc-actions">
            <Button variant="primary" size="md" onClick={onDiagnostics}>{t('diagTitle')}</Button>
            <Button size="md" onClick={() => this.setState({ error: undefined })}>{t('pageErrorRetry')}</Button>
          </span>
        </div>
      </section>
    )
  }
}

function ConsolePage({ rpc, t, openSession }) {
  const call = react.useMemo(() => channelCaller(rpc), [rpc])
  const [status, setStatus] = react.useState()
  const [loading, setLoading] = react.useState(false)
  const [error, setError] = react.useState()
  const [tab, setTabState] = react.useState(rememberedTab)
  const [source, setSource] = react.useState()
  const [editing, setEditing] = react.useState()
  const [exporting, setExporting] = react.useState(false)
  const [diagnosing, setDiagnosing] = react.useState(false)
  const [toast, showToast] = useToast()
  const setTab = next => {
    setTabState(next)
    try { window.localStorage.setItem(TAB_KEY, next) } catch { /* a convenience */ }
  }

  const reload = react.useCallback(() => {
    setLoading(true)
    return call('status')
      .then(next => { setStatus(next); setError(undefined) })
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

  // Providers and models for the AI flows, read once per page visit.
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

  // Runtimes on DSH's PATH, for warnings before a command that cannot start.
  const [runtimes, setRuntimes] = react.useState()
  react.useEffect(() => {
    let live = true
    call('runtimes').then(value => { if (live) setRuntimes(value) }).catch(() => undefined)
    return () => { live = false }
  }, [call])

  // The last local scan, shared by Add → import and Discover.
  const [scan, setScan] = react.useState()
  const [scanning, setScanning] = react.useState(false)
  const [scanError, setScanError] = react.useState()
  react.useEffect(() => {
    let live = true
    call('scan/last').then(saved => { if (live) setScan(current => current ?? saved ?? null) }).catch(() => { if (live) setScan(current => current ?? null) })
    return () => { live = false }
  }, [call])
  const rescan = () => {
    setScanning(true)
    setScanError(undefined)
    call('scan')
      .then(next => { setScan(next); if (next?.runtimes) setRuntimes(next.runtimes) })
      .catch(failure => setScanError(clearMessage(failure)))
      .finally(() => setScanning(false))
  }

  const editServer = server => call('servers/config', { entryId: server.entryId }).then(result => {
    if (!result.editable) return fill(t('editUnavailable'), { reason: result.reason ?? '' })
    setEditing({ server, form: result.form })
    return undefined
  }).catch(failure => clearMessage(failure))

  const added = result => {
    void reload()
    if (result === undefined) return
    showToast(result.application === 'restart-required' ? t('importedRestart') : fill(t('addedToast'), { name: result.serverName }))
    setSource(undefined)
    setTab('installed')
  }
  const edited = result => {
    setEditing(undefined)
    void reload()
    showToast(result.application === 'restart-required' ? t('restartRequired') : fill(t('editSaved'), { name: result.serverName }))
  }
  const goAdd = next => {
    setTab('add')
    if (next !== undefined) setSource(next)
  }

  // A page newer or older than the host is the first thing to know when something breaks.
  const mismatch = status !== undefined && CLIENT_VERSION !== 'dev' && status.version !== CLIENT_VERSION
  react.useEffect(() => {
    if (mismatch) call('log/client', { event: 'version-mismatch', detail: `page ${CLIENT_VERSION}, host ${status?.version ?? '?'}` }).catch(() => undefined)
  }, [mismatch]) // eslint-disable-line react-hooks/exhaustive-deps

  const servers = status?.servers ?? []
  const failed = servers.filter(server => server.status === 'failed').length
  const existing = servers.map(server => server.name)
  const ai = { choices, model, setModel, openSession, sessionsAvailable: status?.sessions !== false }

  return (
    <div className="mcpc-page">
      <div className="mcpc">
        <header className="mcpc-head">
          <div>
            <h2 className="mcpc-h1">{t('title')}</h2>
            <p className="mcpc-sub">{t('intro')}</p>
          </div>
          <span className="mcpc-sp" />
          <Button variant="primary" size="md" onClick={() => goAdd()}><Icon name="plus" size={14} />{t('addMcp')}</Button>
        </header>
        {mismatch && (
          <p className="mcpc-banner" role="alert">{fill(t('restartNeeded'), { page: CLIENT_VERSION, host: status.version ?? '?' })}</p>
        )}
        <nav className="mcpc-tabs" role="tablist" aria-label={t('title')}>
          {TABS.map(id => (
            <button key={id} type="button" role="tab" className="mcpc-tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {t(`tab_${id}`)}
              {id === 'installed' && status !== undefined && <span className="mcpc-count" data-tone={failed > 0 ? 'bad' : undefined}>{failed > 0 ? fill(t('tabFailed'), { count: failed }) : servers.length}</span>}
            </button>
          ))}
        </nav>
        <TabBoundary key={tab} call={call} t={t} onDiagnostics={() => setDiagnosing(true)}>
        {tab === 'installed' && (
          <InstalledView
            status={status}
            loading={loading}
            error={error}
            reload={reload}
            call={call}
            t={t}
            onEdit={editServer}
            onExport={() => setExporting(true)}
            onDiagnostics={() => setDiagnosing(true)}
            onAdd={() => goAdd()}
            onDiscover={() => setTab('discover')}
          />
        )}
        {tab === 'add' && (
          <AddView source={source} setSource={setSource} call={call} t={t} runtimes={runtimes} existing={existing} scan={scan} scanning={scanning} rescan={rescan} onSaved={added} ai={ai} />
        )}
        {tab === 'discover' && (
          <DiscoverView call={call} t={t} scan={scan} scanning={scanning} scanError={scanError} rescan={rescan} onImport={() => goAdd('import')} ai={ai} />
        )}
        </TabBoundary>
      </div>
      {editing && (
        <Drawer title={fill(t('editTitle'), { name: editing.server.name })} onClose={() => setEditing(undefined)} closeLabel={t('close')} footer={<span className="mcpc-muted">{t('editIntro')}</span>}>
          <ServerForm mode="edit" initial={editing.form} entryId={editing.server.entryId} call={call} t={t} runtimes={runtimes} onSaved={edited} />
        </Drawer>
      )}
      {exporting && <ExportDrawer call={call} t={t} onClose={() => setExporting(false)} />}
      {diagnosing && <DiagnosticsDrawer call={call} t={t} onClose={() => setDiagnosing(false)} />}
      {toast && <div className="mcpc-toast" role="status">{toast}</div>}
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

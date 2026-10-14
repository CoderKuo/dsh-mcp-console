/**
 * The Discover tab: the local scan as a summary (counts, runtimes) with each
 * group folded, the MCP servers other clients configure, and the AI research
 * of what could be connected.
 *
 * @module dsh-mcp-console/client-discover
 */

import * as react from 'react'

import { clientServersOf } from './client-add.jsx'
import { groupClientServers } from './client-groups.js'
import { ModelPicker } from './client-models.jsx'
import { Button, Panel, clearMessage, fill } from './client-ui.jsx'

function Group({ title, items, render, open, aside }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return (
    <details className="mcpc-group" open={open}>
      <summary>
        <span>{title}</span>
        <span className="mcpc-chip" data-tone={open ? 'info' : 'idle'}>{items.length}</span>
        <span className="mcpc-sp" />
        {aside}
      </summary>
      <ul>{items.map((item, index) => <li key={index}>{render(item)}</li>)}</ul>
    </details>
  )
}

export function DiscoverView({ call, t, scan, scanning, scanError, rescan, onImport, ai }) {
  const [analyzing, setAnalyzing] = react.useState(false)
  const [error, setError] = react.useState()
  const clients = react.useMemo(() => groupClientServers(clientServersOf(scan)), [scan])

  const analyze = () => {
    setAnalyzing(true)
    setError(undefined)
    call('scan/analyze', { locale: t('lang'), ...(ai.model === undefined ? {} : { model: ai.model }) })
      .then(result => ai.openSession(result.sessionId))
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setAnalyzing(false))
  }

  if (scan === undefined || scan === null) {
    return (
      <Panel title={t('scanTitle')}>
        <div className="mcpc-empty">
          <p className="mcpc-note">{t('scanIntro')}</p>
          <Button variant="primary" size="md" disabled={scanning} onClick={rescan}>{scanning ? t('scanning') : t('scanStart')}</Button>
          {scanError && <p className="mcpc-note" data-tone="bad">{scanError}</p>}
        </div>
      </Panel>
    )
  }

  const runtimes = Object.entries(scan.runtimes ?? {})
  return (
    <>
      <Panel
        title={t('scanTitle')}
        aside={(
          <span className="mcpc-actions">
            <span className="mcpc-muted">{fill(t('scanAtShort'), { time: new Date(scan.scannedAt).toLocaleString() })}</span>
            <Button disabled={scanning} onClick={rescan}>{scanning ? t('scanning') : t('scanAgain')}</Button>
          </span>
        )}
      >
        <div className="mcpc-stats">
          <div className="mcpc-stat"><b>{scan.apps.length}</b><span>{t('scanApps')}</span></div>
          <div className="mcpc-stat"><b>{scan.services.length}</b><span>{t('scanServices')}</span></div>
          <div className="mcpc-stat"><b>{scan.ports.length}</b><span>{t('scanPorts')}</span></div>
          <div className="mcpc-stat"><b>{scan.containers.length}</b><span>{t('scanContainers')}</span></div>
        </div>
        {runtimes.length > 0 && (
          <div className="mcpc-runtimes">
            <span className="mcpc-muted">{t('runtimesTitle')}</span>
            {runtimes.map(([name, item]) => <span key={name} className="mcpc-chip" data-tone={item.found ? 'ok' : 'idle'}>{item.found ? `${name} ${item.version ?? ''}`.trim() : fill(t('runtimeAbsent'), { name })}</span>)}
          </div>
        )}
        {scanError && <p className="mcpc-note mcpc-pad" data-tone="bad">{scanError}</p>}
        <Group
          title={t('scanClients')}
          items={clients}
          open
          render={row => `${row.name} · ${row.clients.join('、')}`}
          aside={<Button onClick={event => { event.preventDefault(); onImport() }}>{t('goImport')}</Button>}
        />
        <Group title={t('scanApps')} items={scan.apps} render={item => [item.name, item.publisher].filter(Boolean).join(' · ')} />
        <Group title={t('scanServices')} items={scan.services} render={item => item.display ?? item.name} />
        <Group title={t('scanPorts')} items={scan.ports} render={item => `${item.port}${item.process ? ` ← ${item.process}` : ''}`} />
        <Group title={t('scanContainers')} items={scan.containers} render={item => `${item.name} (${item.image})`} />
        <Group title={t('scanProcesses')} items={scan.processes} render={item => [item.name, item.product].filter(Boolean).join(' · ')} />
      </Panel>
      <Panel title={t('aiScanTitle')}>
        <div className="mcpc-panel-body">
          <p className="mcpc-note">{t('scanPrivacy')}</p>
          <ModelPicker choices={ai.choices} value={ai.model} onChange={ai.setModel} disabled={analyzing} t={t} />
          <div className="mcpc-actions">
            <Button variant="primary" size="md" disabled={analyzing || !ai.sessionsAvailable} onClick={analyze}>{analyzing ? t('scanAnalyzing') : t('scanAnalyze')}</Button>
          </div>
          {!ai.sessionsAvailable && <p className="mcpc-note" data-tone="warn">{t('noSessions')}</p>}
          {error && <p className="mcpc-note" data-tone="bad" role="alert">{`${t('error')}: ${error}`}</p>}
        </div>
      </Panel>
    </>
  )
}

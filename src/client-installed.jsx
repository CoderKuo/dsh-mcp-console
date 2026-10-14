/**
 * The Installed tab: one compact row per server (state, name, transport, a
 * short status, the switch, and a menu), failed servers first; a row opens to
 * its configuration, tools, and source.
 *
 * @module dsh-mcp-console/client-installed
 */

import * as react from 'react'

import { Button, Dot, Icon, Panel, Switch, clearMessage, fill, useOutsideClose } from './client-ui.jsx'

const ORDER = { failed: 0, starting: 1, connected: 2, stopped: 3, disabled: 4 }
const STATUS_KEY = { connected: 'statusConnected', starting: 'statusStarting', failed: 'statusFailed', disabled: 'statusDisabled', stopped: 'statusStopped' }

function RowMenu({ server, t, onEdit, onRepository, onRemove, onClose }) {
  const ref = useOutsideClose(true, onClose)
  const item = (label, action, danger) => (
    <button type="button" role="menuitem" data-danger={danger ? 'true' : undefined} onClick={() => { onClose(); action() }}>{label}</button>
  )
  const editable = server.removable && server.bundle?.disabled !== true
  return (
    <div className="mcpc-menu" role="menu" ref={ref}>
      {editable && item(t('edit'), onEdit)}
      {item(server.repository ? t('repositoryChange') : t('repositorySet'), onRepository)}
      {server.removable && (<><hr />{item(t('remove'), onRemove, true)}</>)}
    </div>
  )
}

function Tags({ list, t }) {
  if (!Array.isArray(list) || list.length === 0) return null
  return (
    <span className="mcpc-tags">
      {list.map(item => <span key={item.name} className="mcpc-tag" title={item.source === 'expression' ? t('valueExpression') : t('valueLiteral')}>{item.name}</span>)}
    </span>
  )
}

function ServerRow({ server, call, t, onChanged, onEdit, initiallyOpen }) {
  const [open, setOpen] = react.useState(initiallyOpen)
  const [menu, setMenu] = react.useState(false)
  const [busy, setBusy] = react.useState(false)
  const [notice, setNotice] = react.useState()
  const [error, setError] = react.useState()
  const [confirming, setConfirming] = react.useState(false)
  const [repo, setRepo] = react.useState()
  const closeMenu = react.useCallback(() => setMenu(false), [])

  const act = (promise, after) => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    return promise
      .then(result => {
        if (result?.application === 'restart-required') { setNotice(t('restartRequired')); setOpen(true) }
        else if (result?.application === 'overridden') { setNotice(t('overridden')); setOpen(true) }
        after?.()
        return onChanged()
      })
      .catch(failure => { setError(clearMessage(failure)); setOpen(true) })
      .finally(() => setBusy(false))
  }
  const toggle = () => act(call('servers/toggle', { entryId: server.entryId, enabled: !server.enabled }))
  const remove = () => act(call('servers/remove', { entryId: server.entryId }), () => setConfirming(false))
  const saveRepository = () => act(call('servers/repository', { rowId: server.rowId, url: repo ?? '' }), () => setRepo(undefined))
  const edit = () => {
    setBusy(true)
    Promise.resolve(onEdit(server))
      .then(reason => { if (typeof reason === 'string') { setError(reason); setOpen(true) } })
      .finally(() => setBusy(false))
  }

  const config = server.config ?? {}
  const remote = config.transport === 'streamable-http'
  const meta = server.status === 'failed'
    ? <span className="mcpc-row-meta" data-tone="bad">{t('rowFailed')}</span>
    : server.status === 'starting'
      ? <span className="mcpc-row-meta">{t('rowStarting')}</span>
      : server.status === 'connected'
        ? <span className="mcpc-row-meta">{fill(t('rowTools'), { count: server.toolCount })}</span>
        : <span className="mcpc-row-meta">{t(STATUS_KEY[server.status] ?? 'statusStopped')}</span>

  return (
    <div className="mcpc-row" data-open={open ? 'true' : 'false'}>
      <div className="mcpc-row-line">
        <button type="button" className="mcpc-row-main" aria-expanded={open} onClick={() => setOpen(value => !value)}>
          <Dot status={server.status} title={t(STATUS_KEY[server.status] ?? 'statusStopped')} />
          <span className="mcpc-row-name">{server.name}</span>
          {config.transport && <span className="mcpc-tag" data-soft="true">{remote ? 'http' : 'stdio'}</span>}
          {meta}
          <span className="mcpc-row-caret"><Icon name="caret" size={14} /></span>
        </button>
        <Switch
          checked={server.enabled}
          label={fill(t(server.enabled ? 'switchOff' : 'switchOn'), { name: server.name })}
          title={server.toggleable ? undefined : fill(t('readOnly'), { reason: server.readOnlyReason ?? '—' })}
          disabled={busy || !server.toggleable}
          onClick={toggle}
        />
        <span className="mcpc-menu-wrap">
          <Button variant="icon" aria-label={t('more')} aria-haspopup="menu" aria-expanded={menu} disabled={busy} onClick={() => setMenu(value => !value)}><Icon name="more" /></Button>
          {menu && (
            <RowMenu
              server={server}
              t={t}
              onClose={closeMenu}
              onEdit={edit}
              onRepository={() => { setRepo(server.repository ?? ''); setOpen(true) }}
              onRemove={() => { setConfirming(true); setOpen(true) }}
            />
          )}
        </span>
      </div>
      {open && (
        <div className="mcpc-row-detail">
          {confirming && (
            <div className="mcpc-confirm">
              <span>{fill(t(server.bundle?.mcpRows > 1 ? 'removeConfirmMany' : 'removeConfirm'), { bundle: server.bundle?.name ?? '', count: server.bundle?.mcpRows ?? 1 })}</span>
              <span className="mcpc-actions">
                <Button variant="danger-solid" disabled={busy} onClick={remove}>{busy ? t('removing') : t('removeYes')}</Button>
                <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>{t('cancel')}</Button>
              </span>
            </div>
          )}
          {notice && <p className="mcpc-note" data-tone="warn">{notice}</p>}
          {error && <p className="mcpc-note" data-tone="bad" role="alert">{error}</p>}
          {server.error && <pre className="mcpc-err">{server.error}</pre>}
          {server.status === 'starting' && server.toolCount === 0 && <p className="mcpc-note">{t('startingHint')}</p>}
          {server.bundle?.disabled === true && <p className="mcpc-note">{t('bundleOff')}</p>}
          {server.toggleVia === 'bundle' && server.bundle?.mcpRows > 1 && <p className="mcpc-note">{fill(t('bundleToggleMany'), { count: server.bundle.mcpRows })}</p>}
          <dl className="mcpc-kv">
            {remote
              ? (
                <>
                  <dt>{t('url')}</dt><dd className="mcpc-mono">{config.url}</dd>
                  {config.headers?.length > 0 && (<><dt>{t('headers')}</dt><dd><Tags list={config.headers} t={t} /></dd></>)}
                </>
              )
              : config.command && (
                <>
                  <dt>{t('command')}</dt><dd className="mcpc-mono">{[config.command, ...(config.args ?? [])].join(' ')}</dd>
                  {config.env?.length > 0 && (<><dt>{t('env')}</dt><dd><Tags list={config.env} t={t} /></dd></>)}
                  {config.cwd && (<><dt>{t('cwd')}</dt><dd className="mcpc-mono">{config.cwd}</dd></>)}
                </>
              )}
            {server.bundle && (<><dt>{t('source')}</dt><dd className="mcpc-mono">{`${server.bundle.name}${server.bundle.version ? `@${server.bundle.version}` : ''}`}</dd></>)}
            {(server.repository || repo !== undefined) && (
              <>
                <dt>{t('repository')}</dt>
                <dd>
                  {repo === undefined
                    ? <a className="mcpc-link" href={server.repository} target="_blank" rel="noreferrer noopener">{server.repository.replace(/^https?:\/\//u, '')}</a>
                    : (
                      <span className="mcpc-inline-form">
                        <input
                          className="mcpc-input"
                          type="url"
                          autoFocus
                          placeholder="https://github.com/owner/project"
                          value={repo}
                          onChange={event => setRepo(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') saveRepository()
                            if (event.key === 'Escape') setRepo(undefined)
                          }}
                        />
                        <Button variant="primary" disabled={busy} onClick={saveRepository}>{t('save')}</Button>
                        <Button variant="ghost" onClick={() => setRepo(undefined)}>{t('cancel')}</Button>
                      </span>
                    )}
                </dd>
              </>
            )}
            <dt>{t('tools')}</dt>
            <dd>
              {server.toolCount === 0
                ? <span className="mcpc-muted">{t('toolsNone')}</span>
                : (
                  <span className="mcpc-tags">
                    {server.tools.map(name => <span key={name} className="mcpc-tag">{name}</span>)}
                    {server.toolCount > server.tools.length && <span className="mcpc-muted">{fill(t('toolsMore'), { count: server.toolCount - server.tools.length })}</span>}
                  </span>
                )}
            </dd>
          </dl>
        </div>
      )}
    </div>
  )
}

export function InstalledView({ status, loading, error, reload, call, t, onEdit, onExport, onAdd, onDiscover }) {
  const servers = [...(status?.servers ?? [])].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || a.name.localeCompare(b.name))
  if (status !== undefined && servers.length === 0) {
    return (
      <Panel>
        <div className="mcpc-empty">
          <b>{t('emptyTitle')}</b>
          <p className="mcpc-note">{t('emptyText')}</p>
          {status.manageable === false && <p className="mcpc-note" data-tone="warn">{t('noManager')}</p>}
          <span className="mcpc-actions">
            <Button variant="primary" size="md" onClick={onAdd}>{t('emptyAdd')}</Button>
            <Button size="md" onClick={onDiscover}>{t('emptyDiscover')}</Button>
          </span>
        </div>
      </Panel>
    )
  }
  const count = state => servers.filter(server => server.status === state).length
  const tools = servers.reduce((sum, server) => sum + (server.toolCount ?? 0), 0)
  return (
    <Panel
      title={t('installedTitle')}
      aside={(
        <span className="mcpc-actions">
          {servers.length > 0 && <Button variant="ghost" onClick={onExport}>{t('export')}</Button>}
          <Button variant="ghost" disabled={loading} onClick={() => reload()}>{loading ? t('refreshing') : t('refresh')}</Button>
        </span>
      )}
    >
      {servers.length > 0 && (
        <div className="mcpc-summary">
          <span><b>{count('connected')}</b>{t('sumConnected')}</span>
          {count('failed') > 0 && <span data-tone="bad"><b>{count('failed')}</b>{t('sumFailed')}</span>}
          {count('starting') > 0 && <span><b>{count('starting')}</b>{t('sumStarting')}</span>}
          {count('disabled') + count('stopped') > 0 && <span><b>{count('disabled') + count('stopped')}</b>{t('sumDisabled')}</span>}
          <span><b>{tools}</b>{t('sumTools')}</span>
        </div>
      )}
      {status?.manageable === false && <p className="mcpc-note mcpc-pad" data-tone="warn">{t('noManager')}</p>}
      {error && <p className="mcpc-note mcpc-pad" data-tone="bad" role="alert">{`${t('error')}: ${error}`}</p>}
      <div className="mcpc-list">
        {servers.map(server => <ServerRow key={server.entryId} server={server} call={call} t={t} onChanged={reload} onEdit={onEdit} initiallyOpen={server.status === 'failed'} />)}
      </div>
    </Panel>
  )
}

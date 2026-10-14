/**
 * Search the official MCP Registry and fill a result into Add manually.
 *
 * @module dsh-mcp-console/client-registry
 */

import * as react from 'react'

import { missingRuntime } from './client-manual.jsx'
import { Button, Card, clearMessage, fill } from './client-ui.jsx'

const SAFE_LINK = /^https:\/\//u

function Result({ result, existing, runtimes, onFill, t }) {
  return (
    <li className="mcpc-reg-row">
      <div className="mcpc-import-title">
        <span className="mcpc-import-name">{result.title || result.name}</span>
        {result.version && <span className="mcpc-tag">{result.version}</span>}
        {result.title && <span className="mcpc-meta mcpc-mono">{result.name}</span>}
        {result.repository && SAFE_LINK.test(result.repository) && <a className="mcpc-link" href={result.repository} target="_blank" rel="noreferrer noopener">{t('registryRepository')}</a>}
        {result.website && SAFE_LINK.test(result.website) && <a className="mcpc-link" href={result.website} target="_blank" rel="noreferrer noopener">{t('registryWebsite')}</a>}
      </div>
      {result.description && <span className="mcpc-meta">{result.description}</span>}
      {result.options.length === 0 && <span className="mcpc-meta">{t('registryNoOption')}</span>}
      {result.options.map((option, index) => {
        const missing = missingRuntime(option.form, runtimes)
        return (
          <div key={index} className="mcpc-reg-option">
            <span className="mcpc-import-cmd" title={option.form.commandLine || option.form.url}>{option.form.commandLine || option.form.url}</span>
            <span className="mcpc-actions">
              <span className="mcpc-tag mcpc-tag-soft">{t(`registryKind_${option.kind}`)}</span>
              {option.form.bridge && <span className="mcpc-tag mcpc-tag-soft">mcp-remote</span>}
              {missing && <span className="mcpc-chip" data-tone="danger">{fill(t('registryMissing'), { name: missing.name })}</span>}
              {existing.includes(option.form.name) && <span className="mcpc-chip" data-tone="neutral">{t('importPresent')}</span>}
              <Button variant="primary" onClick={() => onFill(option.form, result.title || result.name)}>{t('registryFill')}</Button>
            </span>
          </div>
        )
      })}
      {result.skipped.length > 0 && <span className="mcpc-meta">{fill(t('registrySkipped'), { list: result.skipped.join('; ') })}</span>}
    </li>
  )
}

export function RegistryCard({ call, t, runtimes, existing, onFill }) {
  const [query, setQuery] = react.useState('')
  const [state, setState] = react.useState({ results: [], searched: false })
  const [busy, setBusy] = react.useState(false)
  const [error, setError] = react.useState()

  const search = (cursor) => {
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
    <Card title={t('registryTitle')}>
      <p className="mcpc-note">{t('registryIntro')}</p>
      <form className="mcpc-form" onSubmit={event => { event.preventDefault(); search() }}>
        <input className="mcpc-input" type="search" spellCheck={false} placeholder={t('registryPlaceholder')} value={query} onChange={event => setQuery(event.target.value)} />
        <Button type="submit" variant="primary" size="md" disabled={busy || query.trim() === ''}>{busy ? t('registrySearching') : t('registrySearch')}</Button>
      </form>
      {state.searched && state.results.length === 0 && <p className="mcpc-note">{fill(t('registryNone'), { query: state.query })}</p>}
      {state.results.length > 0 && (
        <ul className="mcpc-import-list">
          {state.results.map(result => <Result key={`${result.name}@${result.version}`} result={result} existing={existing} runtimes={runtimes} onFill={onFill} t={t} />)}
        </ul>
      )}
      {state.nextCursor && <span><Button disabled={busy} onClick={() => search(state.nextCursor)}>{t('registryMore')}</Button></span>}
      {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
    </Card>
  )
}

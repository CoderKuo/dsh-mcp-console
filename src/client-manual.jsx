/**
 * Add manually and edit: the form for a server the person knows how to run.
 *
 * The form is tried before it is saved (the MCP handshake runs on the host);
 * a failed try can still be saved on purpose. Environment references show
 * whether DSH can see the variable, and a command whose runtime is missing
 * on DSH's PATH says so before anything runs.
 *
 * @module dsh-mcp-console/client-manual
 */

import * as react from 'react'

import { Button, Card, clearMessage, fill } from './client-ui.jsx'
import { classifySource } from './sources.js'

export const emptyPair = () => ({ name: '', value: '', fromEnv: false })
/** A name whose literal value is masked while typing. */
const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u
/** The launchers a command may start with, and the runtime each needs. */
const RUNTIME_OF = { npx: 'npx', node: 'node', uvx: 'uvx', uv: 'uv', python: 'python', python3: 'python', py: 'python', docker: 'docker', bun: 'bun', bunx: 'bun', deno: 'deno' }
/** What to install for each runtime. */
const RUNTIME_HINT = { npx: 'Node.js', node: 'Node.js', uvx: 'uv', uv: 'uv', python: 'Python', docker: 'Docker Desktop', bun: 'Bun', deno: 'Deno' }

export const INITIAL_FORM = { name: '', transport: 'stdio', commandLine: '', cwd: '', env: [], url: '', headers: [], bridge: false }

/** The variables an environment row reads: a bare name, or each `${NAME}` of a template. */
export function referencedVariables(pair) {
  if (pair?.fromEnv !== true || typeof pair.value !== 'string') return []
  const value = pair.value.trim()
  if (ENV_NAME.test(value)) return [value]
  return [...value.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu)].map(match => match[1])
}

/** Whether DSH sees each referenced variable, re-asked shortly after the rows change. */
function useEnvironment(call, rows) {
  const names = [...new Set(rows.flatMap(referencedVariables))].sort()
  const key = names.join(',')
  const [status, setStatus] = react.useState({})
  react.useEffect(() => {
    if (key === '') return undefined
    const timer = window.setTimeout(() => {
      call('env/check', { names: key.split(',') }).then(setStatus).catch(() => undefined)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [call, key])
  return status
}

/** The first word of a command line, without a path or extension. */
function launcher(commandLine) {
  const first = String(commandLine ?? '').trim().match(/^"([^"]+)"|^'([^']+)'|^(\S+)/u)
  const word = first?.[1] ?? first?.[2] ?? first?.[3] ?? ''
  return word.replace(/^.*[\\/]/u, '').replace(/\.(?:exe|cmd|bat)$/iu, '').toLowerCase()
}

/** The runtime the form needs that DSH did not find, if any. */
export function missingRuntime(form, runtimes) {
  if (runtimes === undefined) return undefined
  const needed = form.transport === 'streamable-http' ? (form.bridge ? 'npx' : undefined) : RUNTIME_OF[launcher(form.commandLine)]
  if (needed === undefined || runtimes[needed]?.found !== false) return undefined
  return { name: needed, install: RUNTIME_HINT[needed] ?? needed }
}

/** A server name suggested from the command or URL, for an empty name field. */
function suggestedName(form) {
  try {
    if (form.transport === 'streamable-http') return new URL(form.url).hostname.split('.').filter(part => !/^(?:www|mcp|api|server)$/u.test(part))[0]?.slice(0, 32) ?? ''
    const source = classifySource(form.commandLine)
    const base = source.label.replace(/^.*\//u, '').replace(/[@:=].*$/u, '').replace(/^(?:mcp-server-|server-|mcp-)/u, '').replace(/-mcp(?:-server)?$/u, '')
    return base.replace(/[^A-Za-z0-9_-]+/gu, '-').slice(0, 32)
  } catch {
    return ''
  }
}

/** Name/value rows (environment variables or headers); a row may read its value from the environment. */
function PairsEditor({ label, pairs, onChange, namePlaceholder, valuePlaceholder, disabled, environment, t }) {
  const update = (index, patch) => onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...patch } : pair)))
  return (
    <div className="mcpc-field">
      <span className="mcpc-label">{label}</span>
      {pairs.map((pair, index) => {
        const missing = referencedVariables(pair).filter(name => environment[name] === false)
        return (
          <div key={index} className="mcpc-pair-wrap">
            <div className="mcpc-pair">
              <input className="mcpc-input mcpc-pair-name" spellCheck={false} disabled={disabled || pair.expression} placeholder={namePlaceholder} value={pair.name} onChange={event => update(index, { name: event.target.value })} />
              {pair.expression
                ? <span className="mcpc-input mcpc-pair-expr" title={t('manualExpressionHint')}>{`!!js ${pair.value}`}</span>
                : (
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
                )}
              {!pair.expression && (
                <label className="mcpc-check" title={t('manualFromEnvHint')}>
                  <input type="checkbox" disabled={disabled} checked={pair.fromEnv} onChange={event => update(index, { fromEnv: event.target.checked })} />
                  <span>{t('manualFromEnv')}</span>
                </label>
              )}
              <Button variant="ghost" disabled={disabled} aria-label={t('manualRemoveRow')} onClick={() => onChange(pairs.filter((_, i) => i !== index))}>×</Button>
            </div>
            {pair.description && <span className="mcpc-meta">{`${pair.required ? `${t('manualRequired')} · ` : ''}${pair.description}`}</span>}
            {missing.length > 0 && <span className="mcpc-warn">{fill(t('envMissing'), { names: missing.join(', ') })}</span>}
          </div>
        )
      })}
      <span>
        <Button variant="ghost" disabled={disabled} onClick={() => onChange([...pairs, emptyPair()])}>{t('manualAddRow')}</Button>
      </span>
    </div>
  )
}

const BRIDGE_REASONS = new Set(['oauth', 'not-streamable'])
/** The failure reasons the host reports, each with its own sentence. */
const REASONS = new Set(['config', 'auth', 'oauth', 'not-streamable', 'http', 'protocol', 'timeout', 'unreachable', 'unavailable', 'no-executable', 'spawn', 'exited'])

/** What a try found: the server and its tools, or why it failed and what to do. */
function TestResult({ result, remote, bridged, t, onBridge }) {
  if (result.ok) {
    return (
      <div className="mcpc-callout" data-tone="success">
        <span>{fill(t('testOk'), { server: [result.server.name, result.server.version].filter(Boolean).join(' ') || '—', count: result.toolCount, ms: result.ms })}</span>
        {result.tools.length > 0 && <span className="mcpc-tags">{result.tools.map(name => <span key={name} className="mcpc-tag">{name}</span>)}</span>}
      </div>
    )
  }
  return (
    <div className="mcpc-callout" data-tone="danger">
      <span>{`${t(REASONS.has(result.reason) ? `test_${result.reason}` : 'test_failed')}${result.message ? ` (${result.message})` : ''}`}</span>
      {result.output && <pre className="mcpc-detail">{result.output}</pre>}
      {remote && !bridged && BRIDGE_REASONS.has(result.reason) && (
        <span className="mcpc-actions">
          <span className="mcpc-meta">{t('testBridgeHint')}</span>
          <Button variant="primary" onClick={onBridge}>{t('testUseBridge')}</Button>
        </span>
      )}
    </div>
  )
}

/**
 * The Add manually card, also used to edit a server.
 * @param props - `draft` (`{ key, form, mode, entryId?, origin? }`), the
 *   caller, the copy, the runtimes found, and what to do after a save or a
 *   cancelled edit.
 */
export function ManualAddCard({ draft, call, t, runtimes, onSaved, onCancel, cardRef }) {
  const editing = draft?.mode === 'edit'
  const [form, setForm] = react.useState(() => ({ ...INITIAL_FORM, ...(draft?.form ?? {}) }))
  const [busy, setBusy] = react.useState(false)
  const [testing, setTesting] = react.useState(false)
  const [test, setTest] = react.useState()
  const [done, setDone] = react.useState()
  const [error, setError] = react.useState()
  const set = patch => {
    setForm(current => ({ ...current, ...patch }))
    setTest(undefined)
  }
  const remote = form.transport === 'streamable-http'
  const suggestion = suggestedName(form)
  const name = form.name.trim() === '' ? suggestion : form.name.trim()
  const ready = name !== '' && (remote ? form.url.trim() !== '' : form.commandLine.trim() !== '')
  const environment = useEnvironment(call, [...form.env, ...form.headers])
  const missing = missingRuntime(form, runtimes)

  const payload = () => ({ ...form, name })
  const runTest = () => {
    setTesting(true)
    setError(undefined)
    return call('servers/test', payload())
      .then(result => {
        setTest(result)
        return result
      })
      .catch(failure => {
        setError(clearMessage(failure))
        return undefined
      })
      .finally(() => setTesting(false))
  }
  const save = () => {
    setBusy(true)
    setError(undefined)
    setDone(undefined)
    const request = editing ? call('servers/update', { ...payload(), entryId: draft.entryId }) : call('servers/add', payload())
    return request
      .then(result => {
        setDone(result)
        setTest(undefined)
        if (!editing) setForm(INITIAL_FORM)
        return onSaved(result)
      })
      .catch(failure => setError(clearMessage(failure)))
      .finally(() => setBusy(false))
  }
  // Saving tries the server first; a failed try waits for "Save anyway".
  const submit = event => {
    event.preventDefault()
    void runTest().then(result => {
      if (result?.ok === true) return save()
      return undefined
    })
  }

  const title = editing ? fill(t('editTitle'), { name: draft.form.name }) : t('manualTitle')
  const working = busy || testing
  return (
    <div ref={cardRef}>
      <Card title={title} aside={editing ? <Button variant="ghost" disabled={working} onClick={onCancel}>{t('repositoryCancel')}</Button> : undefined}>
        <p className="mcpc-note">{editing ? t('editIntro') : t('manualIntro')}</p>
        {draft?.origin && <p className="mcpc-callout" data-tone="info">{fill(t('registryFilled'), { name: draft.origin })}</p>}
        <form className="mcpc-add" onSubmit={submit}>
          <div className="mcpc-seg" role="radiogroup" aria-label={t('manualKind')}>
            <button type="button" role="radio" aria-checked={!remote} disabled={working} onClick={() => set({ transport: 'stdio' })}>{t('manualStdio')}</button>
            <button type="button" role="radio" aria-checked={remote} disabled={working} onClick={() => set({ transport: 'streamable-http' })}>{t('manualHttp')}</button>
          </div>
          <label className="mcpc-field">
            <span className="mcpc-label">{t('manualName')}</span>
            <input className="mcpc-input" spellCheck={false} disabled={working || editing} maxLength={32} placeholder={suggestion === '' ? t('manualNamePlaceholder') : suggestion} value={form.name} onChange={event => set({ name: event.target.value })} />
            {editing && <span className="mcpc-meta">{t('editNameFixed')}</span>}
          </label>
          {remote
            ? (
              <>
                <label className="mcpc-field">
                  <span className="mcpc-label">{t('manualUrl')}</span>
                  <input className="mcpc-input mcpc-mono" type="url" spellCheck={false} disabled={working} placeholder="https://mcp.example.com/mcp" value={form.url} onChange={event => set({ url: event.target.value })} />
                  <span className="mcpc-meta">{form.bridge ? t('manualBridgeOn') : t('manualUrlHint')}</span>
                </label>
                <label className="mcpc-check mcpc-check-row">
                  <input type="checkbox" disabled={working} checked={form.bridge} onChange={event => set({ bridge: event.target.checked })} />
                  <span>{t('manualBridge')}</span>
                </label>
                {!form.bridge && /\/sse\/?(?:\?|$)/u.test(form.url) && <span className="mcpc-warn">{t('manualSseHint')}</span>}
                <PairsEditor label={t('headers')} pairs={form.headers} onChange={headers => set({ headers })} namePlaceholder="Authorization" valuePlaceholder={t('manualValuePlaceholder')} disabled={working} environment={environment} t={t} />
              </>
            )
            : (
              <>
                <label className="mcpc-field">
                  <span className="mcpc-label">{t('manualCommand')}</span>
                  <input className="mcpc-input mcpc-mono" spellCheck={false} disabled={working} placeholder="npx -y @upstash/context7-mcp" value={form.commandLine} onChange={event => set({ commandLine: event.target.value })} />
                  <span className="mcpc-meta">{t('manualCommandHint')}</span>
                </label>
                <PairsEditor label={t('env')} pairs={form.env} onChange={env => set({ env })} namePlaceholder="API_KEY" valuePlaceholder={t('manualValuePlaceholder')} disabled={working} environment={environment} t={t} />
                <label className="mcpc-field">
                  <span className="mcpc-label">{t('manualCwd')}</span>
                  <input className="mcpc-input mcpc-mono" spellCheck={false} disabled={working} placeholder={t('manualCwdPlaceholder')} value={form.cwd} onChange={event => set({ cwd: event.target.value })} />
                </label>
              </>
            )}
          {missing && <p className="mcpc-warn">{fill(t('runtimeMissing'), { name: missing.name, install: missing.install })}</p>}
          <p className="mcpc-note">{t('manualSecrets')}</p>
          {test && <TestResult result={test} remote={remote} bridged={form.bridge} t={t} onBridge={() => set({ bridge: true })} />}
          <div className="mcpc-split">
            <span className="mcpc-actions">
              <Button type="submit" variant="primary" size="md" disabled={working || !ready}>
                {testing ? t('testRunning') : busy ? t('manualAdding') : editing ? t('editSave') : t('manualAdd')}
              </Button>
              <Button size="md" disabled={working || !ready} onClick={() => { void runTest() }}>{t('testOnly')}</Button>
              {test && !test.ok && <Button size="md" variant="ghost" disabled={working} onClick={() => { void save() }}>{editing ? t('editSaveAnyway') : t('manualAddAnyway')}</Button>}
            </span>
            {testing && <span className="mcpc-meta">{remote && !form.bridge ? t('testWaitRemote') : t('testWaitLocal')}</span>}
          </div>
        </form>
        {done && <p className="mcpc-note">{done.application === 'restart-required' ? t('importedRestart') : fill(t(editing ? 'editSaved' : 'manualAdded'), { name: done.serverName })}</p>}
        {error && <p className="mcpc-error" role="alert">{`${t('error')}: ${error}`}</p>}
      </Card>
    </div>
  )
}

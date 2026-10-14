/**
 * Shared page primitives: panels, buttons, the switch, status dots, the side
 * drawer, icons, and message helpers.
 *
 * @module dsh-mcp-console/client-ui
 */

import * as react from 'react'

export const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => (values[name] === undefined ? match : String(values[name])))

export const clearMessage = error => String(error instanceof Error ? error.message : error).replace(/^MCP console:\s*/u, '')

export function Button({ variant, size, children, ...rest }) {
  return <button type="button" className="mcpc-btn" data-variant={variant} data-size={size} {...rest}>{children}</button>
}

/** A bordered section with an optional head row. */
export function Panel({ title, aside, children, className }) {
  return (
    <section className={`mcpc-panel${className ? ` ${className}` : ''}`}>
      {(title || aside) && (
        <header className="mcpc-panel-head">
          {title && <h3 className="mcpc-panel-title">{title}</h3>}
          <span className="mcpc-sp" />
          {aside}
        </header>
      )}
      {children}
    </section>
  )
}

export function Switch({ checked, label, ...rest }) {
  return <button type="button" role="switch" className="mcpc-switch" aria-checked={checked} aria-label={label} {...rest} />
}

/** The state dot of a server: connected, connecting, failed, or off. */
export const DOT = { connected: 'ok', starting: 'wait', failed: 'bad', disabled: 'off', stopped: 'off' }
export function Dot({ status, title }) {
  return <span className="mcpc-dot" data-tone={DOT[status] ?? 'off'} title={title} />
}

/** A panel sliding in from the right, closed with the scrim, the X, or Escape. */
export function Drawer({ title, onClose, footer, children, closeLabel }) {
  react.useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <>
      <div className="mcpc-scrim" onClick={onClose} />
      <aside className="mcpc-drawer" role="dialog" aria-label={title}>
        <header className="mcpc-drawer-head">
          <h3 className="mcpc-panel-title">{title}</h3>
          <span className="mcpc-sp" />
          <Button variant="icon" aria-label={closeLabel} onClick={onClose}><Icon name="x" /></Button>
        </header>
        <div className="mcpc-drawer-body">{children}</div>
        {footer && <footer className="mcpc-drawer-foot">{footer}</footer>}
      </aside>
    </>
  )
}

const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  caret: <path d="m9 6 6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></>,
  pen: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  spark: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>,
  import: <><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></>,
  check: <path d="m5 12 5 5 9-10" />,
}

export function Icon({ name, size = 16 }) {
  if (name === 'more') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}

/** Close a popup when the person clicks anywhere else. */
export function useOutsideClose(open, onClose) {
  const ref = react.useRef(null)
  react.useEffect(() => {
    if (!open) return undefined
    const onDown = event => { if (ref.current !== null && !ref.current.contains(event.target)) onClose() }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, onClose])
  return ref
}

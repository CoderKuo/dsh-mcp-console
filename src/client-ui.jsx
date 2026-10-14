/**
 * Shared page primitives: cards, buttons, and message helpers.
 *
 * @module dsh-mcp-console/client-ui
 */

export const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => (values[name] === undefined ? match : String(values[name])))

export const clearMessage = error => String(error instanceof Error ? error.message : error).replace(/^MCP console:\s*/u, '')

// ── primitives ──────────────────────────────────────────────────────────────

export function Card({ title, aside, children }) {
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

export function Button({ variant, size, children, ...rest }) {
  return <button type="button" className="mcpc-btn" data-variant={variant} data-size={size} {...rest}>{children}</button>
}


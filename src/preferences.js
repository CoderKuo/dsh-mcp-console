/**
 * Where the plugin's preferences are read from and written to, on both
 * settings generations DSH has shipped (adapted from dsh-geek2api):
 * - DSH 0.1.5 installs a settings *section*; writes go through
 *   `settings.update(namespace, patch)`.
 * - DSH 0.2 stores preferences as *volatile* Config fields of the plugin's own
 *   row, written through `settings.update(rowId, patch)`.
 *
 * @module dsh-mcp-console/preferences
 */

/** Mark a preference editable without restarting the plugin. */
export const live = schema => schema.volatile()

/** Read a Config field that may arrive as a volatile reference. */
export const fieldValue = value => (value !== null && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value)

/**
 * Connect the preferences to the settings service the host provides.
 * @param settingsCtx - the scope the `settings` inject handed over.
 * @param options - the plugin context and Config, the namespace, the current
 *   source and how to replace it, and the preference target this fills in.
 */
export function connectSettings(settingsCtx, { ctx, Config, namespace, source, setSource, preference }) {
  const settings = settingsCtx.settings
  if (typeof settings?.installSection === 'function') {
    try {
      settings.installSection(ctx, namespace, Config, source(), {
        setSource: current => setSource(typeof current === 'function' ? () => current() ?? {} : () => current ?? {}),
      })
      if (typeof settings.update === 'function') {
        Object.assign(preference, { writable: settings.writable !== false, set: patch => settings.update(namespace, patch) })
      }
    } catch (error) {
      ctx.logger?.warn?.('mcp-console: preferences unavailable, defaults stand: %s', error.message)
    }
    return
  }
  if (typeof settings?.update !== 'function') return
  const rowId = ctx.fiber?.entry?.options?.id ?? namespace
  Object.assign(preference, { writable: settings.writable !== false, set: patch => settings.update(rowId, patch) })
  if (typeof settings.configure === 'function') {
    // The MCP Console page is the editor; no generated duplicate page.
    const scope = typeof settingsCtx.effect === 'function' ? settingsCtx : ctx
    try {
      scope.effect(() => settings.configure({ auto: false }, ctx.fiber), 'mcp-console: settings page policy')
    } catch (error) {
      ctx.logger?.warn?.('mcp-console: could not hide the generated settings page: %s', error.message)
    }
  }
}

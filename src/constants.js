/**
 * Identities and defaults this plugin owns.
 *
 * @module dsh-mcp-console/constants
 */

/** Loader row id, settings namespace, and RPC channel stem. */
export const PLUGIN_ID = 'mcp-console'
/** Loopback RPC channel the browser half talks to. */
export const CHANNEL = '/mcp-console'
/** The module every MCP server row of a profile names. */
export const MCP_MODULE = '@deepseek-ai/dsh-mcp-client'

/**
 * The Agent preset AI-assisted sessions start with. `cordis` is Creator mode:
 * it carries the `plugin_manager` tool the agent needs to install a
 * configuration bundle, and every install still asks for approval.
 */
export const DEFAULT_AGENT_PRESET = 'cordis'
/** Directory name of the first-use Workspace the desktop app creates. */
export const DEFAULT_WORKSPACE_DIRECTORY = 'default-workspace'

/** Bound on one local discovery command. */
export const DEFAULT_SCAN_TIMEOUT_MS = 20_000
/** Upper bound on the inventory text handed to an AI session. */
export const MAX_INVENTORY_CHARS = 24_000
/** How many tool names one server row lists. */
export const MAX_TOOLS_PER_SERVER = 50

/** Loader fiber states (`@deepseek-ai/cordis` FiberState). */
export const FIBER_STATE = Object.freeze({ PENDING: 0, LOADING: 1, ACTIVE: 2, FAILED: 3, DISPOSED: 4, UNLOADING: 5 })

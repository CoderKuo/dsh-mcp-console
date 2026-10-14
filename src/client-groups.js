/**
 * How the page folds the MCP servers found in other clients: identical
 * servers (same name, same launch line) configured in several clients become
 * one row listing those clients.
 *
 * @module dsh-mcp-console/client-groups
 */

/** One line for a server's launch: the command and its arguments, or its URL. */
export const launchLine = item => (item.command ? [item.command, ...(item.args ?? [])].join(' ') : item.url ?? '')

/**
 * Fold identical servers configured in several clients into one row: same
 * name and same launch line. The first client is the one imported from.
 */
export function groupClientServers(servers) {
  const groups = new Map()
  for (const item of servers) {
    const key = `${item.name}\u0000${launchLine(item)}`
    const group = groups.get(key)
    if (group === undefined) groups.set(key, { ...item, key, clients: [item.client] })
    else if (!group.clients.includes(item.client)) group.clients.push(item.client)
  }
  return [...groups.values()]
}


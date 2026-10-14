# Changelog

## 0.1.7

- **AI quick add takes any source**, not only a repository link: a code repository (GitHub, GitLab, Gitee, Codeberg, Bitbucket, or `owner/name`), an npm package (`@scope/name`, `npx -y …`, an npmjs.com page), a PyPI package (`uvx …`, `pip install …`, a pypi.org page), a Docker image (`ghcr.io/…`, `mcp/…`, `docker run …`, a Docker Hub page), a bare package name, or any web page (an MCP registry entry, a remote endpoint). The page shows what the input was recognised as; the prompt tells the agent what it is looking at and which launcher to try first (`npx -y`, `uvx`, `docker run -i --rm`, or `streamable-http` for an endpoint). Older pages that send `repositoryUrl` still work.
- **Add manually**, without the AI: a local command (`npx -y …`, `uvx …`, `docker run -i --rm …`, any executable; split like a shell line but never run through a shell) with environment variables and a working directory, or a remote streamable-http endpoint with headers. A value marked "from environment" is written as a Loader `!!js` expression (`process.env.NAME`, or a template such as `Bearer ${API_TOKEN}`), so the secret is not stored in the bundle. The server is installed as a configuration-only bundle through the Plugin Manager, like an import, and can be removed from the list.
- Bundles the plugin writes now carry `homepage` when known, and their patch is written in the Loader's YAML dialect so `!!js` values survive.

## 0.1.6

- Redesigned the "MCP in other clients" list: identical servers configured in several clients are one row with the clients as tags; each row shows the name, transport, and clients on one line and the launch command on a single truncated line (the full command on hover), with the action on the right.

## 0.1.5

- **Remove**: a server provided by a removable bundle (what AI quick add and import install) has a Remove button with an inline confirmation. It uninstalls the bundle through the Plugin Manager's `removeBundle` and deletes the bundle's source directory only when it lies inside the plugin's bundle directory; nothing elsewhere is deleted. A bundle carrying several servers says so before removing them together.
- **Import from other clients**: each MCP server found in Claude Desktop, Claude Code, Cursor, Windsurf, VS Code, or Codex has an Import button. The host re-reads that client's own file (the page sends only the client and server names), converts the entry to a `@deepseek-ai/dsh-mcp-client` config (stdio or streamable-http; SSE is refused), writes a configuration-only bundle under the bundle directory with a non-clashing server name, and installs it with `installBundle`. A failed install leaves no directory behind. Environment values and headers are copied as the client stores them.
- **Event-driven refresh**: the page no longer polls every 5 seconds. It waits on the host, which answers when the tool registry changes (`tools/change`), the Plugin Manager changes the profile (`plugin-manager/changed`), or this plugin acts, and at the latest after 25 seconds.

## 0.1.4

- The page warns when DSH is still running an older host half of the plugin after an update (the page and the host report their versions), and asks for a full restart.
- The model choice keeps its title while models are loading or unavailable and says why the list is empty, including when the host is too old to list models.

## 0.1.3

- AI quick add and the AI analysis of a scan can run on a chosen provider and model, picked from the same routes and models as DSH's model picker. The choice applies to the new session only: `selectModel` also saves the choice as the default, so the previous default is saved back right after. The last choice is remembered on this page; it starts from your default model.

## 0.1.2

- The local scan result is kept: it survives leaving the page and restarting DSH (saved under `<DSH_HOME>/storages/dsh-mcp-console/last-scan.json`), and the page shows when it ran with a Scan again button. The AI analysis uses the saved scan.
- Fixed garbled non-ASCII names (e.g. Chinese application and service names) in the Windows scan and in the inventory sent to the AI: PowerShell now writes UTF-8 instead of the console code page.

## 0.1.1

- Fixed the repository URL input of AI quick add being about 200px tall: inputs inside a stacked field no longer grow along the column.

## 0.1.0

First release.

- MCP sidebar page listing the profile's `@deepseek-ai/dsh-mcp-client` rows with inferred status, redacted configuration, tools, source bundle, and repository link (from the bundle manifest or set on the page).
- Enable/disable through the Plugin Manager (`setPluginEnabled`), applied in place; read-only rows say why.
- AI quick add: opens a Creator-mode session in the default workspace with a prompt that installs the repository's MCP server as a configuration-only bundle through `plugin_manager install_bundle`.
- Local discovery: applications, background services, listening ports, Docker containers, and MCP servers configured in other AI clients; an AI session researches the inventory and asks which to connect.

# Changelog

## 0.1.10

- **Log**: the plugin keeps its own log, since DSH sends a plugin's `ctx.logger` to the console only. One JSON line per entry in `<DSH_HOME>/storages/dsh-mcp-console/logs/YYYY-MM-DD.log`, kept seven days and at most 5 MB in all, also mirrored to `ctx.logger`. Every operation is logged in one place at the RPC layer: what was asked (names, not values: environment variables and headers as names with where the value comes from, URLs without their query, credential arguments masked), how it ended (the Plugin Manager's application, the test's reason and the server's output), how long it took, and the raw failure (message, code, details, the first stack lines) that the page itself only sees as a safe code. Polling and lookups are logged only when they fail. The page reports a version mismatch and any error while drawing a tab.
- **No secrets in the log**: every literal value a form carries and every value an environment reference resolves to is registered and masked, and bearer values, `key=value` credentials, and token-shaped strings are masked wherever they appear.
- **Diagnostics**: Installed has a Diagnostics button (also on the empty page) that opens a drawer with a text to copy: plugin (host and page) and DSH versions, system, runtimes, every server's state with its redacted configuration and switch path, and the recent problems from the log. It can reveal the log file in the file manager through the session controller, or shows the path when DSH cannot.
- A tab that fails to draw shows the error with a Diagnostics button instead of a blank page.

## 0.1.9

- **Redesigned page**, organised by task instead of one long scroll of cards:
  - **Installed** (the default tab): one compact row per server with its state dot, name, transport, a short status, the switch, and a menu (edit, repository link, remove). Failed servers come first and open to their error; a row opens to its configuration, tools, and source. A summary line counts connected, failed, connecting, and switched-off servers and their tools; export and refresh sit in the panel header. An empty profile gets a starting point instead of an empty list.
  - **Add**: one place for every way to add a server. Pick a source (search the official registry, fill in by hand, install with AI, import from other clients), then finish below. Registry results and the by-hand path end in the same form, which shows only what most servers need; the working directory and the mcp-remote bridge sit under Advanced. Import lists the servers of other clients with checkboxes and imports the chosen ones one after another.
  - **Discover**: the local scan as counts and runtimes with every group folded, the MCP servers other clients configure (with a shortcut to import them), and the AI research.
  - Editing and the export open in a drawer from the right instead of moving the page. The chosen tab is remembered.
- The header has an Add MCP button and the Installed tab shows how many servers failed.

## 0.1.8

- **Test before adding**: Add manually tries the server first and only installs it once the MCP handshake (`initialize`, `notifications/initialized`, `tools/list`) succeeds; the result shows the server name, version, and tools, or why it failed (program not found, exited with its stderr, timed out, refused credentials, OAuth required, SSE only, unreachable). A failed try can still be saved on purpose, and there is a separate Test connection button. A local server runs through `ctx.subprocess` with the explicit environment the row would get; any configured value that shows up in its output is masked.
- **Environment check**: a row that reads an environment variable shows when the DSH host cannot see it (the host answers yes or no; values never cross).
- **mcp-remote bridge** for SSE-only servers and OAuth sign-in: a remote server can be connected through `npx -y mcp-remote <url>`. Header values travel as explicit environment variables (`Name:${MCP_REMOTE_HEADER_n}`), since DSH scrubs credential-shaped names from a child's environment. A test that fails with OAuth or SSE-only offers to switch to it; URLs ending in `/sse` suggest it.
- **Runtime detection**: the runtimes on DSH's PATH (`node`, `npx`, `uv`, `uvx`, `python`, `docker`, `bun`, `deno`) are detected; a command or registry option whose runtime is missing says so before anything runs. The scan includes them in the inventory for the AI.
- **Search the MCP Registry**: search the official registry (`/v0.1/servers?version=latest`); each npm, PyPI, or OCI package and each streamable-http or SSE remote of a result fills Add manually, secrets as environment references and `{placeholder}` header values as `${VAR}` templates. Package types that cannot run here are listed as skipped. The registry URL is configurable (`registryUrl`).
- **Edit** a server whose bundle is in the plugin's `mcp-bundles` directory and adds exactly one MCP server (import, Add manually, AI quick add): the patch is read with the Loader's YAML dialect, opens in the Add manually form, and is saved by removing and reinstalling the bundle; a failed reinstall restores the old patch and installs it again. Expressions the form cannot show are kept as they were and can only be kept or dropped, never rewritten; settings the form does not show (timeouts, reconnect) are kept.
- **Import all** servers found in other clients, one after another.
- **Export** the profile's servers as `mcpServers` JSON (copy or download). No secret is exported: environment reads become `${NAME}`, literal secrets become placeholders listed in notes.
- **Bundle-provided servers can be switched**: when a row inside a bundle is read-only for `setPluginEnabled`, and the bundle only carries MCP rows, the switch uses the Plugin Manager's `setBundleEnabled`. Servers of a switched-off bundle (which leave the Loader) stay listed so they can be switched back on.

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

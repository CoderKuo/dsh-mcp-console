# Changelog

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

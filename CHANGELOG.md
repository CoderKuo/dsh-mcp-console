# Changelog

## 0.1.0

First release.

- MCP sidebar page listing the profile's `@deepseek-ai/dsh-mcp-client` rows with inferred status, redacted configuration, tools, source bundle, and repository link (from the bundle manifest or set on the page).
- Enable/disable through the Plugin Manager (`setPluginEnabled`), applied in place; read-only rows say why.
- AI quick add: opens a Creator-mode session in the default workspace with a prompt that installs the repository's MCP server as a configuration-only bundle through `plugin_manager install_bundle`.
- Local discovery: applications, background services, listening ports, Docker containers, and MCP servers configured in other AI clients; an AI session researches the inventory and asks which to connect.

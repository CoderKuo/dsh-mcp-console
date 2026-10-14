<div align="center">

<img src="docs/assets/icon.png" width="120" height="120" alt="MCP Console">

# DSH MCP Console (dsh-mcp-console)

[简体中文](README.md) · **English**

**Manage MCP servers in DeepSeek Harness: see their status, switch them on and off, let AI install one from a repository, and discover local software that can be connected.**

</div>

## Features

- **MCP list** — an "MCP" sidebar entry lists every MCP server of the current profile: name, connection status, transport, command or URL, environment variable names, tools, and repository link.
- **Enable / disable** — one switch per server, written through DSH's official Plugin Manager and applied immediately.
- **AI quick add** — enter a GitHub repository; a new session opens in the default workspace and the AI reads the repository, installs it, writes the configuration, and connects it. Every install step asks for your approval.
- **Discover local services** — scan installed applications, background services, listening ports, Docker containers, and MCP servers already configured in Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, and Codex; then let an AI session research which of them have MCP servers and ask which to connect.
- **No secrets shown** — only the names of environment variables and headers are shown, credential-looking arguments are masked, and the scan inventory carries no file paths.

## Install

In the desktop app, open **Plugins → Add plugin**, choose the official registry, and enter `dsh-mcp-console`. Within 24 hours of a release, install `https://github.com/CoderKuo/dsh-mcp-console/releases/latest/download/dsh-mcp-console.tgz` instead.

## How it works

- **Status**: `@deepseek-ai/dsh-mcp-client` publishes no connection state, so it is inferred: *connected* = running with `mcp__<name>__*` tools; *connecting* = starting, or running without tools yet (also a failed first connection or a server without tools — see the DSH log); *failed* = the row failed to load (only with `failOnStartupError: true`); *disabled* = switched off.
- **Enable/disable** calls the Plugin Manager's `setPluginEnabled`, which writes `disabled` into the profile patch. Rows provided by a bundle or another layer are read-only and say why.
- **AI quick add** opens a Creator-mode session (agent preset `cordis`, which carries the `plugin_manager` tool) and follows the documented procedure: read the repository, run it locally once, write a configuration-only bundle under `~/.dsh/mcp-bundles/<name>`, install it with `plugin_manager install_bundle`, and verify the tools. Secrets are referenced as `!!js process.env.NAME`, never written literally.
- **Discovery** runs locally through `ctx.subprocess` (one PowerShell query on Windows; `ps`, `lsof`/`ss`, `systemctl`, `/Applications` elsewhere). Only when you click "Analyze with AI" is the inventory sent to your model as a message.

## Settings

Row id `mcp-console` in the profile's `cordis.patch.yml`: `agentPreset` (default `cordis`), `bundleDirectory` (default `<DSH_HOME>/mcp-bundles`), `scanTimeoutMs` (default `20000`), `repositories` (edited from the page).

## Development

```sh
pnpm install
pnpm run check
```

License: [MIT](LICENSE)

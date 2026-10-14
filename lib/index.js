import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import z from "@deepseek-ai/schemastery";
import { randomUUID } from "node:crypto";
//#region src/constants.js
/**
* Identities and defaults this plugin owns.
*
* @module dsh-mcp-console/constants
*/
/** Loader row id, settings namespace, and RPC channel stem. */
const PLUGIN_ID = "mcp-console";
/** Loopback RPC channel the browser half talks to. */
const CHANNEL = "/mcp-console";
/**
* The Agent preset AI-assisted sessions start with. `cordis` is Creator mode:
* it carries the `plugin_manager` tool the agent needs to install a
* configuration bundle, and every install still asks for approval.
*/
const DEFAULT_AGENT_PRESET = "cordis";
/** Directory name of the first-use Workspace the desktop app creates. */
const DEFAULT_WORKSPACE_DIRECTORY = "default-workspace";
/** Bound on one local discovery command. */
const DEFAULT_SCAN_TIMEOUT_MS = 2e4;
/** Upper bound on the inventory text handed to an AI session. */
const MAX_INVENTORY_CHARS = 24e3;
/** Loader fiber states (`@deepseek-ai/cordis` FiberState). */
const FIBER_STATE = Object.freeze({
	PENDING: 0,
	LOADING: 1,
	ACTIVE: 2,
	FAILED: 3,
	DISPOSED: 4,
	UNLOADING: 5
});
//#endregion
//#region src/redact.js
/**
* What of an MCP row's configuration may reach the browser.
*
* The row's raw `config` is read, never the fiber's resolved one: `!!js`
* expressions such as `process.env.GITHUB_TOKEN` stay expressions instead of
* becoming the secret they evaluate to. Environment variables and HTTP
* headers show their names only, and an argument that is, or follows a flag
* that names, a credential is masked.
*
* @module dsh-mcp-console/redact
*/
const MASK = "••••••";
const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu;
/** A long opaque run that reads as a credential rather than a word or path. */
const OPAQUE = /^(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA|eyJ)[-_A-Za-z0-9.]{8,}$|^[A-Za-z0-9+/_=-]{32,}$/u;
const record$2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** A `!!js` node as the loader keeps it in raw rows. */
function jsExpression(value) {
	if (record$2(value) && typeof value.__jsExpr === "string") return value.__jsExpr;
}
/** One scalar for display: a `!!js` node as its source, anything else as text. */
function show(value) {
	const expression = jsExpression(value);
	if (expression !== void 0) return `!!js ${expression}`;
	if (typeof value === "string") return value;
	if (value === void 0 || value === null) return "";
	return JSON.stringify(value);
}
/**
* Mask credential-looking arguments: a value after `--api-key`-style flags,
* a `--token=…` pair, or an opaque token on its own.
* @param args - the row's `args`.
* @returns display strings.
*/
function redactArgs(args) {
	if (!Array.isArray(args)) return [];
	const out = [];
	let maskNext = false;
	for (const raw of args) {
		const text = show(raw);
		if (jsExpression(raw) !== void 0) {
			out.push(text);
			maskNext = false;
			continue;
		}
		if (maskNext) {
			out.push(MASK);
			maskNext = false;
			continue;
		}
		const pair = /^(--?[^=\s]+)=(.*)$/u.exec(text);
		if (pair !== null && SECRET_NAME.test(pair[1])) {
			out.push(`${pair[1]}=${MASK}`);
			continue;
		}
		if (/^--?[A-Za-z]/u.test(text) && SECRET_NAME.test(text)) {
			out.push(text);
			maskNext = true;
			continue;
		}
		out.push(OPAQUE.test(text) ? MASK : text);
	}
	return out;
}
/**
* Keep the names of a map and say where each value comes from, never what it is.
* @param map - `env` or `headers`.
* @returns `[{ name, source }]`, source `expression` (a `!!js` value) or `literal`.
*/
function redactMap(map) {
	if (!record$2(map)) return [];
	return Object.entries(map).map(([name, value]) => ({
		name,
		source: jsExpression(value) !== void 0 ? "expression" : "literal"
	}));
}
/**
* The browser-safe projection of one `@deepseek-ai/dsh-mcp-client` config.
* @param config - the row's raw config.
* @returns transport, command or URL, masked arguments, and map names.
*/
function redactConfig(config) {
	const value = record$2(config) ? config : {};
	const transport = value.transport === "streamable-http" ? "streamable-http" : value.transport === "stdio" ? "stdio" : show(value.transport);
	const base = {
		serverName: show(value.serverName),
		transport,
		...value.toolCallTimeoutMs === void 0 ? {} : { toolCallTimeoutMs: value.toolCallTimeoutMs },
		...value.failOnStartupError === true ? { failOnStartupError: true } : {}
	};
	if (transport === "streamable-http") {
		let url = show(value.url);
		try {
			const parsed = new URL(url);
			if (parsed.username !== "" || parsed.password !== "") {
				parsed.username = parsed.username === "" ? "" : MASK;
				parsed.password = parsed.password === "" ? "" : MASK;
			}
			for (const key of [...parsed.searchParams.keys()]) if (SECRET_NAME.test(key)) parsed.searchParams.set(key, MASK);
			url = parsed.toString();
		} catch {}
		return {
			...base,
			url,
			headers: redactMap(value.headers)
		};
	}
	return {
		...base,
		command: show(value.command),
		args: redactArgs(value.args),
		env: redactMap(value.env),
		...value.cwd === void 0 || value.cwd === "" ? {} : { cwd: show(value.cwd) }
	};
}
//#endregion
//#region src/discovery.js
/**
* Find local software that may be reachable over MCP.
*
* Three read-only sources, gathered host-side:
* - running processes, background services, listening ports, and installed
*   applications, from the platform's own tools (PowerShell on Windows;
*   `ps`, `lsof`/`ss`, `systemctl`, `/Applications` elsewhere), with system
*   components filtered out;
* - MCP servers already configured in other AI clients (Claude Desktop,
*   Claude Code, Cursor, VS Code, Windsurf, Codex): names and commands only,
*   with credential-looking arguments masked and no environment values;
* - running Docker containers, when Docker answers.
* Commands run through `ctx.subprocess` with its scrubbed environment and a
* timeout. Nothing is sent anywhere from here: the page shows the result and
* the person decides whether an AI session gets it.
*
* @module dsh-mcp-console/discovery
*/
const MAX_ITEMS = 200;
const WINDOWS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
# Windows PowerShell writes stdout in the console code page (GBK on Chinese
# Windows); the host decodes UTF-8, so non-ASCII names would arrive garbled.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$sys = @('C:\Windows', 'C:\Program Files\WindowsApps', 'C:\Program Files\Windows')
function IsSystem($path) { if (-not $path) { return $true }; foreach ($p in $sys) { if ($path -like "$p*") { return $true } }; return $false }
$procs = Get-Process | Where-Object { $_.Path -and -not (IsSystem $_.Path) } | ForEach-Object {
  $info = $_.MainModule.FileVersionInfo
  [pscustomobject]@{ name = $_.ProcessName; path = $_.Path; company = $info.CompanyName; product = $info.ProductName; id = $_.Id }
} | Where-Object { $_.company -notlike 'Microsoft*' } | Sort-Object name -Unique
$byPid = @{}; foreach ($p in $procs) { $byPid[[int]$p.id] = $p.name }
$ports = Get-NetTCPConnection -State Listen | Where-Object { $byPid.ContainsKey([int]$_.OwningProcess) } | ForEach-Object {
  [pscustomobject]@{ port = $_.LocalPort; address = $_.LocalAddress; process = $byPid[[int]$_.OwningProcess] }
} | Sort-Object port -Unique
$services = Get-CimInstance Win32_Service -Filter "State='Running'" | Where-Object { $_.PathName -and $_.PathName -notmatch '\\Windows\\' } | ForEach-Object {
  [pscustomobject]@{ name = $_.Name; display = $_.DisplayName; path = ($_.PathName -replace '"', '') }
}
$keys = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
$apps = Get-ItemProperty $keys | Where-Object { $_.DisplayName -and -not $_.SystemComponent -and $_.Publisher -notlike 'Microsoft*' } | ForEach-Object {
  [pscustomobject]@{ name = $_.DisplayName; publisher = $_.Publisher; version = $_.DisplayVersion }
} | Sort-Object name -Unique
[pscustomobject]@{ processes = @($procs | Select-Object name, path, company, product); services = @($services); ports = @($ports); apps = @($apps) } | ConvertTo-Json -Depth 3 -Compress
`;
/** Where other AI clients keep their MCP server lists. */
function clientConfigPaths({ home = homedir(), appData = process.env.APPDATA, platform = process.platform } = {}) {
	const roaming = appData ?? (platform === "darwin" ? join(home, "Library", "Application Support") : join(home, ".config"));
	return [
		{
			client: "Claude Desktop",
			path: join(roaming, "Claude", "claude_desktop_config.json"),
			format: "json"
		},
		{
			client: "Claude Code",
			path: join(home, ".claude.json"),
			format: "json"
		},
		{
			client: "Cursor",
			path: join(home, ".cursor", "mcp.json"),
			format: "json"
		},
		{
			client: "Windsurf",
			path: join(home, ".codeium", "windsurf", "mcp_config.json"),
			format: "json"
		},
		{
			client: "VS Code",
			path: join(roaming, "Code", "User", "mcp.json"),
			format: "json"
		},
		{
			client: "Codex",
			path: join(home, ".codex", "config.toml"),
			format: "toml"
		}
	];
}
const record$1 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/**
* The MCP servers one client file declares: name, command or URL, masked args.
* @param text - the file's content.
* @param format - `json` or `toml`.
* @returns `[{ name, command?, args?, url? }]`.
*/
function parseClientServers(text, format) {
	if (format === "toml") {
		const servers = [];
		const sections = text.split(/^\s*\[/mu);
		const string = (section, key) => {
			const match = new RegExp(`^\\s*${key}\\s*=\\s*(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)')`, "mu").exec(section);
			return match === null ? void 0 : match[1] ?? match[2];
		};
		for (const section of sections) {
			const header = /^mcp_servers\.(?:"([^"]+)"|([A-Za-z0-9_-]+))\]/u.exec(section);
			if (header === null) continue;
			const command = string(section, "command");
			const argsText = /^\s*args\s*=\s*\[([^\]]*)\]/mu.exec(section)?.[1];
			const args = argsText === void 0 ? [] : [...argsText.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/gu)].map((match) => match[1] ?? match[2]);
			const url = string(section, "url");
			servers.push({
				name: header[1] ?? header[2],
				...command === void 0 ? {} : { command },
				...args.length === 0 ? {} : { args: redactArgs(args) },
				...url === void 0 ? {} : { url }
			});
		}
		return servers;
	}
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		return [];
	}
	const maps = [
		parsed?.mcpServers,
		parsed?.servers,
		parsed?.mcp?.servers
	];
	if (record$1(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers);
	const servers = /* @__PURE__ */ new Map();
	for (const map of maps) {
		if (!record$1(map)) continue;
		for (const [name, value] of Object.entries(map)) {
			if (!record$1(value) || servers.has(name)) continue;
			const url = typeof value.url === "string" ? value.url : typeof value.serverUrl === "string" ? value.serverUrl : void 0;
			servers.set(name, {
				name,
				...typeof value.command === "string" ? { command: value.command } : {},
				...Array.isArray(value.args) && value.args.length > 0 ? { args: redactArgs(value.args) } : {},
				...url === void 0 ? {} : { url: url.replace(/([?&][^=]*(?:key|token|secret)[^=]*=)[^&]*/giu, "$1••••••") }
			});
		}
	}
	return [...servers.values()];
}
/** Read every known client file that exists. */
async function readClientServers(paths = clientConfigPaths()) {
	const found = [];
	for (const { client, path, format } of paths) {
		let text;
		try {
			text = await readFile(path, "utf8");
		} catch {
			continue;
		}
		const servers = parseClientServers(text, format);
		if (servers.length > 0) found.push({
			client,
			path,
			servers
		});
	}
	return found;
}
/**
* A command runner over `ctx.subprocess`: argv in, stdout text out, bounded.
* @param subprocess - `ctx.subprocess`.
* @param options - working directory and timeout.
* @returns `(argv) => Promise<string>`; a failing or missing command yields ''.
*/
function createRunner(subprocess, { cwd = homedir(), timeoutMs = DEFAULT_SCAN_TIMEOUT_MS } = {}) {
	return async (argv) => {
		if (subprocess === void 0) return "";
		let executable;
		try {
			executable = await subprocess.resolveExecutable(argv[0]);
		} catch {
			return "";
		}
		const signal = AbortSignal.timeout(timeoutMs);
		let handle;
		try {
			handle = subprocess.spawn({
				argv: [executable, ...argv.slice(1)],
				cwd,
				stdio: {
					stdin: "ignore",
					stdout: "pipe",
					stderr: "ignore"
				},
				graceMs: 2e3,
				signal
			});
		} catch {
			return "";
		}
		const chunks = [];
		let size = 0;
		handle.stdout?.on("data", (chunk) => {
			if (size > 4 * 1024 * 1024) return;
			size += chunk.length;
			chunks.push(chunk);
		});
		try {
			await handle.done;
			await handle.waitForExit(AbortSignal.timeout(5e3)).catch(() => false);
		} catch {
			return "";
		}
		return Buffer.concat(chunks).toString("utf8");
	};
}
const take = (list, limit = MAX_ITEMS) => Array.isArray(list) ? list.slice(0, limit) : [];
const lines = (text) => text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
const unique = (list) => [...new Set(list)];
/** Windows inventory from one PowerShell run. */
async function windowsInventory(run) {
	const raw = await run([
		"powershell",
		"-NoProfile",
		"-NonInteractive",
		"-ExecutionPolicy",
		"Bypass",
		"-Command",
		WINDOWS_SCRIPT
	]);
	let parsed = {};
	try {
		parsed = JSON.parse(raw.replace(/^\uFEFF/u, "").trim() || "{}");
	} catch {
		parsed = {};
	}
	const asList = (value) => Array.isArray(value) ? value : value === void 0 || value === null ? [] : [value];
	return {
		processes: take(asList(parsed.processes).map((item) => ({
			name: item.name,
			company: item.company ?? void 0,
			product: item.product ?? void 0,
			path: item.path
		}))),
		services: take(asList(parsed.services).map((item) => ({
			name: item.name,
			display: item.display,
			path: item.path
		}))),
		ports: take(asList(parsed.ports).map((item) => ({
			port: item.port,
			address: item.address,
			process: item.process
		}))),
		apps: take(asList(parsed.apps).map((item) => ({
			name: item.name,
			publisher: item.publisher ?? void 0,
			version: item.version ?? void 0
		})))
	};
}
/** macOS and Linux inventory from the usual tools. */
async function unixInventory(run, platform) {
	const ps = await run([
		"ps",
		"-axo",
		"comm="
	]);
	const systemPrefix = platform === "darwin" ? /^\/(?:System|usr\/(?:libexec|sbin)|sbin)\//u : /^(?:\[|\/(?:usr\/)?(?:s?bin|lib)\/(?:systemd|kworker))/u;
	const processes = unique(lines(ps).filter((line) => !systemPrefix.test(line)).map((line) => line.split("/").pop())).map((name) => ({ name }));
	const ports = [];
	const lsof = await run([
		"lsof",
		"-nP",
		"-iTCP",
		"-sTCP:LISTEN"
	]);
	for (const line of lines(lsof).slice(1)) {
		const cols = line.split(/\s+/u);
		const port = Number(/:(\d+)$/u.exec(cols[8] ?? "")?.[1]);
		if (Number.isFinite(port)) ports.push({
			port,
			process: cols[0]
		});
	}
	if (ports.length === 0 && platform === "linux") {
		const ss = await run(["ss", "-ltnpH"]);
		for (const line of lines(ss)) {
			const port = Number(/:(\d+)\s/u.exec(line)?.[1]);
			const process = /users:\(\("([^"]+)"/u.exec(line)?.[1];
			if (Number.isFinite(port)) ports.push({
				port,
				...process === void 0 ? {} : { process }
			});
		}
	}
	const services = [];
	if (platform === "linux") {
		const units = await run([
			"systemctl",
			"list-units",
			"--type=service",
			"--state=running",
			"--no-legend",
			"--plain"
		]);
		for (const line of lines(units)) services.push({ name: line.split(/\s+/u)[0] });
	} else if (platform === "darwin") {
		const brew = await run([
			"brew",
			"services",
			"list"
		]);
		for (const line of lines(brew).slice(1)) {
			const [name, status] = line.split(/\s+/u);
			if (status === "started") services.push({ name });
		}
	}
	const apps = [];
	if (platform === "darwin") {
		const listing = await run(["ls", "/Applications"]);
		for (const line of lines(listing)) if (line.endsWith(".app")) apps.push({ name: line.slice(0, -4) });
	}
	const byPort = /* @__PURE__ */ new Map();
	for (const item of ports) if (!byPort.has(item.port)) byPort.set(item.port, item);
	return {
		processes: take(processes),
		services: take(services),
		ports: take([...byPort.values()]),
		apps: take(apps)
	};
}
/** Running Docker containers, when Docker answers. */
async function dockerContainers(run) {
	const out = await run([
		"docker",
		"ps",
		"--format",
		"{{.Names}}	{{.Image}}	{{.Ports}}"
	]);
	return take(lines(out).map((line) => {
		const [name, image, ports] = line.split("	");
		return {
			name,
			image,
			...ports ? { ports } : {}
		};
	}), 50);
}
/**
* Gather the whole inventory.
* @param options - the command runner, the platform, and the client config paths.
* @returns `{ platform, processes, services, ports, apps, containers, clients, scannedAt }`.
*/
async function scanLocal({ run, platform = process.platform, clientPaths, now = Date.now } = {}) {
	const [system, containers, clients] = await Promise.all([
		platform === "win32" ? windowsInventory(run) : unixInventory(run, platform),
		dockerContainers(run),
		readClientServers(clientPaths)
	]);
	return {
		platform,
		...system,
		containers,
		clients,
		scannedAt: now()
	};
}
/**
* The inventory as compact text for an AI session.
* @param scan - the result of {@link scanLocal}.
* @returns plain text, one item per line, grouped by source.
*/
function inventoryText(scan) {
	const out = [`platform: ${scan.platform}`];
	const section = (title, items, format) => {
		if (!Array.isArray(items) || items.length === 0) return;
		out.push("", `## ${title} (${items.length})`);
		for (const item of items) out.push(`- ${format(item)}`);
	};
	section("installed applications", scan.apps, (item) => [
		item.name,
		item.publisher && `by ${item.publisher}`,
		item.version && `v${item.version}`
	].filter(Boolean).join(" "));
	section("background services", scan.services, (item) => [item.name, item.display && item.display !== item.name && `(${item.display})`].filter(Boolean).join(" "));
	section("running processes", scan.processes, (item) => [
		item.name,
		item.product && `[${item.product}]`,
		item.company && `by ${item.company}`
	].filter(Boolean).join(" "));
	section("listening TCP ports", scan.ports, (item) => `${item.port}${item.process ? ` ← ${item.process}` : ""}`);
	section("docker containers", scan.containers, (item) => `${item.name} (${item.image})${item.ports ? ` ${item.ports}` : ""}`);
	for (const client of scan.clients ?? []) section(`MCP servers configured in ${client.client}`, client.servers, (item) => [
		item.name,
		item.command && `command: ${[item.command, ...item.args ?? []].join(" ")}`,
		item.url && `url: ${item.url}`
	].filter(Boolean).join(" — "));
	return out.join("\n");
}
//#endregion
//#region src/preferences.js
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
const live = (schema) => schema.volatile();
/** Read a Config field that may arrive as a volatile reference. */
const fieldValue = (value) => value !== null && typeof value === "object" && typeof value.get === "function" ? value.get() : value;
/**
* Connect the preferences to the settings service the host provides.
* @param settingsCtx - the scope the `settings` inject handed over.
* @param options - the plugin context and Config, the namespace, the current
*   source and how to replace it, and the preference target this fills in.
*/
function connectSettings(settingsCtx, { ctx, Config, namespace, source, setSource, preference }) {
	const settings = settingsCtx.settings;
	if (typeof settings?.installSection === "function") {
		try {
			settings.installSection(ctx, namespace, Config, source(), { setSource: (current) => setSource(typeof current === "function" ? () => current() ?? {} : () => current ?? {}) });
			if (typeof settings.update === "function") Object.assign(preference, {
				writable: settings.writable !== false,
				set: (patch) => settings.update(namespace, patch)
			});
		} catch (error) {
			ctx.logger?.warn?.("mcp-console: preferences unavailable, defaults stand: %s", error.message);
		}
		return;
	}
	if (typeof settings?.update !== "function") return;
	const rowId = ctx.fiber?.entry?.options?.id ?? namespace;
	Object.assign(preference, {
		writable: settings.writable !== false,
		set: (patch) => settings.update(rowId, patch)
	});
	if (typeof settings.configure === "function") {
		const scope = typeof settingsCtx.effect === "function" ? settingsCtx : ctx;
		try {
			scope.effect(() => settings.configure({ auto: false }, ctx.fiber), "mcp-console: settings page policy");
		} catch (error) {
			ctx.logger?.warn?.("mcp-console: could not hide the generated settings page: %s", error.message);
		}
	}
}
//#endregion
//#region src/prompts.js
/**
* The prompts the AI-assisted flows send as the first user message of a new
* Session. They follow the documented way to connect an MCP server: write a
* configuration-only bundle whose patch inserts `@deepseek-ai/dsh-mcp-client`,
* then install it with the `plugin_manager` tool (Creator mode), which asks
* the person for approval. The agent never edits the profile's own
* `cordis.patch.yml` or `package.json`.
*
* @module dsh-mcp-console/prompts
*/
const SERVER_NAME_RULE = "[A-Za-z0-9_-]{1,32}";
/** The bundle procedure both flows end with, in the person's language. */
function bundleSteps(locale, { bundleDir, repositoryUrl }) {
	const repo = repositoryUrl === void 0 ? "" : repositoryUrl;
	if (locale === "en") return [
		`Create a configuration-only bundle directory under \`${bundleDir}\` (one directory per server, e.g. \`${bundleDir}/<serverName>\`) with:`,
		`   - \`package.json\`: \`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<one line>", ${repo === "" ? "" : `"repository": "${repo}", `}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
		"   - `cordis.patch.yml` inserting one row: `- insert: [ { id: mcp-<serverName>, name: '@deepseek-ai/dsh-mcp-client', config: { serverName: <serverName>, transport: stdio | streamable-http, ... } } ]`",
		`   - \`serverName\` must match \`${SERVER_NAME_RULE}\` and must not clash with an existing server.`,
		"   - Never write a secret literally. Reference it as `!!js process.env.NAME` and tell me which environment variables to set.",
		"Install the bundle with the `plugin_manager` tool, action `install_bundle`, using the absolute directory path. Do not edit the profile's own `cordis.patch.yml` or `package.json`.",
		"Check that the result says `application: applied`, that tools named `mcp__<serverName>__*` appear, and call one harmless tool to prove it works.",
		"Finish with a short summary: server name, transport, the tools it offers, environment variables I still need to set, and that it can be switched off in the MCP Console page."
	];
	return [
		`在 \`${bundleDir}\` 下创建一个只含配置的 bundle 目录（每个服务器一个目录，例如 \`${bundleDir}/<serverName>\`），包含：`,
		`   - \`package.json\`：\`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<一句话说明>", ${repo === "" ? "" : `"repository": "${repo}", `}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
		"   - `cordis.patch.yml`，插入一行：`- insert: [ { id: mcp-<serverName>, name: '@deepseek-ai/dsh-mcp-client', config: { serverName: <serverName>, transport: stdio 或 streamable-http, ... } } ]`",
		`   - \`serverName\` 必须符合 \`${SERVER_NAME_RULE}\`，且不能和已有服务器重名。`,
		"   - 密钥绝不写明文，用 `!!js process.env.变量名` 引用，并告诉我需要设置哪些环境变量。",
		"用 `plugin_manager` 工具的 `install_bundle` 操作安装这个 bundle（传目录的绝对路径）。不要直接修改 profile 自己的 `cordis.patch.yml` 或 `package.json`。",
		"确认结果是 `application: applied`、出现了 `mcp__<serverName>__*` 工具，并调用一个无副作用的工具验证可用。",
		"最后简短总结：服务器名、传输方式、提供哪些工具、我还需要设置哪些环境变量，并说明可以在「MCP 管理」页面随时禁用。"
	];
}
const numbered = (lines) => {
	let n = 0;
	return lines.map((line) => line.startsWith("   ") ? line : `${++n}. ${line}`).join("\n");
};
const existingLine = (locale, names) => {
	if (names.length === 0) return locale === "en" ? "No MCP server is configured yet." : "当前还没有配置任何 MCP 服务器。";
	return locale === "en" ? `Already configured MCP servers (do not reuse these names): ${names.join(", ")}.` : `已配置的 MCP 服务器（不要重名）：${names.join("、")}。`;
};
/**
* The prompt for installing and connecting an MCP server from a repository.
* @param options - the repository URL, the person's notes, the configured
*   server names, where bundles go, and the UI locale (`zh` | `en`).
* @returns the prompt text.
*/
function quickAddPrompt({ repositoryUrl, notes, existingNames = [], bundleDir, locale = "zh" }) {
	const extra = typeof notes === "string" && notes.trim() !== "" ? notes.trim().slice(0, 2e3) : "";
	if (locale === "en") return [
		`Install the open-source MCP server at ${repositoryUrl} and connect it to this DeepSeek Harness profile.`,
		"",
		existingLine("en", existingNames),
		...extra === "" ? [] : ["", `My notes: ${extra}`],
		"",
		numbered([
			"Read the repository (README, docs, package manifest) and confirm it is an MCP server. Work out its transport (stdio or streamable-http), the command or URL that starts it, and the environment variables it needs. If it is not an MCP server, stop and tell me.",
			"Choose the simplest reliable way to run it: a no-install launcher (`npx -y`, `uvx`, a published Docker image) first; otherwise clone it into this workspace and build it. Tell me what you are about to run before any install command, and do not run install scripts I have not seen.",
			"Start it once locally to confirm it launches.",
			...bundleSteps("en", {
				bundleDir,
				repositoryUrl
			})
		])
	].join("\n");
	return [
		`请安装 ${repositoryUrl} 这个开源 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
		"",
		existingLine("zh", existingNames),
		...extra === "" ? [] : ["", `我的补充说明：${extra}`],
		"",
		numbered([
			"阅读仓库（README、文档、包清单），确认它是 MCP 服务器，弄清传输方式（stdio 或 streamable-http）、启动命令或 URL、需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。",
			"选最简单可靠的运行方式：优先免安装启动（`npx -y`、`uvx`、已发布的 Docker 镜像）；否则克隆到当前工作区再构建。执行任何安装命令前先告诉我要运行什么，不要运行我没看过的安装脚本。",
			"在本机先启动一次，确认能正常运行。",
			...bundleSteps("zh", {
				bundleDir,
				repositoryUrl
			})
		])
	].join("\n");
}
/**
* The prompt for researching what the local inventory could connect.
* @param options - the inventory text, the configured server names, where
*   bundles go, and the UI locale.
* @returns the prompt text.
*/
function discoveryPrompt({ inventory, existingNames = [], bundleDir, locale = "zh" }) {
	const text = typeof inventory === "string" ? inventory.slice(0, MAX_INVENTORY_CHARS) : "";
	const truncated = typeof inventory === "string" && inventory.length > 24e3;
	if (locale === "en") return [
		"Below is an inventory of software and background services found on my computer, plus MCP servers already configured in other AI clients. Find what could be connected to DeepSeek Harness through MCP.",
		"",
		existingLine("en", existingNames),
		"",
		numbered([
			"For each item that plausibly has an MCP server (official, or a well-maintained community one), search the web to confirm it. Skip system components and anything without a credible MCP server.",
			"Report a table: software | evidence on this computer | MCP server (link) | transport / how it connects | confidence. Put the MCP servers configured in other clients in a separate list; they can be imported as they are.",
			"Do not install or change anything yet. Ask me which ones to connect.",
			"For each one I confirm, follow this procedure:",
			...bundleSteps("en", {
				bundleDir,
				repositoryUrl: void 0
			})
		]),
		"",
		`Inventory${truncated ? " (truncated)" : ""}:`,
		"```text",
		text,
		"```"
	].join("\n");
	return [
		"下面是在我电脑上找到的软件和后台服务清单，以及其他 AI 客户端里已经配置的 MCP 服务器。请找出哪些可以通过 MCP 接入 DeepSeek Harness。",
		"",
		existingLine("zh", existingNames),
		"",
		numbered([
			"对可能有 MCP 服务器的条目（官方的，或维护良好的社区项目）联网检索确认。系统组件、找不到可信 MCP 服务器的条目直接跳过。",
			"用表格汇报：软件 | 本机检测依据 | MCP 服务器（链接）| 传输方式/接入方式 | 可信度。其他客户端里已配置的 MCP 服务器单独列出，它们可以直接照搬接入。",
			"先不要安装或修改任何东西，问我要接入哪些。",
			"我确认要接入的，按下面的流程做：",
			...bundleSteps("zh", {
				bundleDir,
				repositoryUrl: void 0
			})
		]),
		"",
		`清单${truncated ? "（已截断）" : ""}：`,
		"```text",
		text,
		"```"
	].join("\n");
}
//#endregion
//#region src/servers.js
/**
* The MCP servers of the running profile and their state.
*
* Every server is a Loader row naming `@deepseek-ai/dsh-mcp-client`; disabled
* rows keep their entry, without a fiber. dsh-mcp-client publishes no status,
* so the state is read from what is observable:
* - `disabled`  — the row is switched off;
* - `failed`    — its fiber failed (only with `failOnStartupError: true`);
* - `connected` — active, with at least one `mcp__<serverName>__*` tool;
* - `starting`  — loading, or active with no tools yet (a server that failed
*   its first connection without `failOnStartupError` looks the same, as does
*   one that offers no tools).
* Enablement goes through the Plugin Manager, which writes the profile's
* patch and applies the change in place; rows it cannot address (built into a
* bundle, duplicated, or outside the profile) are reported read-only with its
* reason.
*
* @module dsh-mcp-console/servers
*/
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** The tool-name prefix dsh-mcp-client registers a server's tools under. */
const toolPrefix = (serverName) => `mcp__${serverName}__`;
/**
* The state of one row, from its entry and the tools it registered.
* @param entry - `{ disabled, fiberState }`.
* @param toolCount - tools registered under the server's prefix.
* @returns `disabled | failed | connected | starting | stopped`.
*/
function serverStatus({ disabled, fiberState }, toolCount) {
	if (disabled) return "disabled";
	if (fiberState === FIBER_STATE.FAILED) return "failed";
	if (fiberState === FIBER_STATE.ACTIVE) return toolCount > 0 ? "connected" : "starting";
	if (fiberState === FIBER_STATE.PENDING || fiberState === FIBER_STATE.LOADING) return "starting";
	return "stopped";
}
/** A repository URL a person may follow: http(s) only. */
function normalizeRepository(value) {
	let text = typeof value === "string" ? value.trim() : record(value) && typeof value.url === "string" ? value.url.trim() : "";
	if (text === "") return void 0;
	text = text.replace(/^git\+/u, "").replace(/\.git$/u, "");
	if (/^github:/u.test(text)) text = `https://github.com/${text.slice(7)}`;
	if (/^git@github\.com:/u.test(text)) text = `https://github.com/${text.slice(15)}`;
	try {
		const url = new URL(text);
		return url.protocol === "https:" || url.protocol === "http:" ? url.toString().replace(/\/$/u, "") : void 0;
	} catch {
		return;
	}
}
/**
* Read the MCP rows of the Loader, disabled ones included.
* @param loader - `ctx.loader`.
* @returns `[{ entryId, rowId, config, disabled, fiberState, error? }]`.
*/
function readMcpRows(loader) {
	const rows = [];
	for (const entry of loader?.entries?.() ?? []) {
		if (entry?.options?.name !== "@deepseek-ai/dsh-mcp-client") continue;
		const fiber = entry.fiber;
		rows.push({
			entryId: entry.id,
			rowId: entry.options.id,
			config: entry.options.config,
			disabled: entry.disabled === true,
			fiberState: typeof fiber?.state === "number" ? fiber.state : void 0,
			...fiber?.error === void 0 ? {} : { error: String(fiber.error?.message ?? fiber.error).slice(0, 400) }
		});
	}
	return rows;
}
/** Group registered tool names by MCP server name. */
function toolsByServer(schemas) {
	const byServer = /* @__PURE__ */ new Map();
	for (const schema of Array.isArray(schemas) ? schemas : []) {
		const name = typeof schema?.name === "string" ? schema.name : void 0;
		const match = name === void 0 ? null : /^mcp__([A-Za-z0-9_-]{1,32})__(.+)$/u.exec(name);
		if (match === null) continue;
		const list = byServer.get(match[1]) ?? [];
		list.push(match[2]);
		byServer.set(match[1], list);
	}
	return byServer;
}
/** The repository a bundle's manifest names, read from the profile's install. */
async function bundleRepository(profileDir, bundleName) {
	if (typeof profileDir !== "string" || typeof bundleName !== "string") return void 0;
	try {
		const manifest = JSON.parse(await readFile(join(profileDir, "node_modules", ...bundleName.split("/"), "package.json"), "utf8"));
		return normalizeRepository(manifest.repository) ?? normalizeRepository(manifest.homepage);
	} catch {
		return;
	}
}
/**
* The server list the page shows.
* @param options - the services it reads; any may be absent in a headless profile.
* @returns `{ servers, manageable }`.
*/
async function listServers({ loader, tools, pluginManager, profileDir, repositories = {} }) {
	const rows = readMcpRows(loader);
	const byServer = toolsByServer(typeof tools?.schemas === "function" ? tools.schemas() : []);
	let plugins = [];
	let bundles = [];
	if (pluginManager !== void 0) [plugins, bundles] = await Promise.all([pluginManager.listPlugins().catch(() => []), pluginManager.listBundles().catch(() => [])]);
	const bundleOf = /* @__PURE__ */ new Map();
	for (const bundle of bundles) for (const row of bundle?.rows ?? []) if (typeof row?.entryId === "string") bundleOf.set(row.entryId, bundle);
	const servers = await Promise.all(rows.map(async (row) => {
		const config = redactConfig(row.config);
		const serverName = typeof row.config?.serverName === "string" ? row.config.serverName : void 0;
		const toolNames = serverName === void 0 ? [] : byServer.get(serverName) ?? [];
		const plugin = plugins.find((item) => item?.entryId === row.entryId);
		const bundle = bundleOf.get(row.entryId);
		const repository = normalizeRepository(repositories[row.rowId]) ?? (bundle === void 0 ? void 0 : await bundleRepository(profileDir, bundle.name));
		return {
			entryId: row.entryId,
			rowId: row.rowId,
			name: serverName ?? (jsExpression(row.config?.serverName) === void 0 ? row.rowId : `${row.rowId}`),
			status: serverStatus(row, toolNames.length),
			enabled: !row.disabled,
			config,
			toolCount: toolNames.length,
			tools: toolNames.slice(0, 50),
			...row.error === void 0 ? {} : { error: row.error },
			...repository === void 0 ? {} : { repository },
			...bundle === void 0 ? {} : { bundle: {
				name: bundle.name,
				...bundle.version === void 0 ? {} : { version: bundle.version }
			} },
			...plugin?.readOnlyReason === void 0 ? {} : { readOnlyReason: plugin.readOnlyReason },
			toggleable: pluginManager !== void 0 && plugin !== void 0 && plugin.readOnlyReason === void 0
		};
	}));
	servers.sort((a, b) => a.name.localeCompare(b.name));
	return {
		servers,
		manageable: pluginManager !== void 0
	};
}
/**
* Switch one server row on or off through the Plugin Manager.
* @param pluginManager - `ctx.pluginManager`.
* @param entryId - the row's Loader entry id.
* @param enabled - whether it should run.
* @returns `{ application, warnings? }` from the manager.
*/
async function setServerEnabled(pluginManager, entryId, enabled) {
	if (pluginManager === void 0) throw new Error("MCP console: the Plugin Manager is not available in this profile");
	if (typeof entryId !== "string" || entryId === "") throw new Error("MCP console: unknown server");
	const result = await pluginManager.setPluginEnabled(entryId, enabled === true);
	return {
		application: typeof result?.application === "string" ? result.application : "applied",
		...Array.isArray(result?.warnings) && result.warnings.length > 0 ? { warnings: result.warnings.map(String).slice(0, 5) } : {}
	};
}
//#endregion
//#region src/rpc.js
/**
* The loopback RPC surface behind the MCP Console page.
*
* Replies carry only projections built here: redacted server configuration,
* states, tool names, the local inventory the person asked for, and the ids
* of Sessions this plugin opened. Environment values and header values never
* cross this boundary.
*
* @module dsh-mcp-console/rpc
*/
const ok = (value) => ({
	ok: true,
	value
});
const failed = (message) => ({
	ok: false,
	error: {
		code: "mcp-console/request-failed",
		message,
		details: {}
	}
});
/** Only sentences this plugin authored, or the Plugin Manager's own codes, reach the browser. */
const SAFE_MESSAGE = /^(?:MCP console:|unknown-plugin|management-required|unaddressable|operation-error)[\s\S]{0,300}$/u;
/** A repository URL the quick-add flow accepts: an https link to a code host page. */
function acceptRepositoryUrl(value) {
	const url = normalizeRepository(value);
	if (url === void 0 || !url.startsWith("https://")) throw new Error("MCP console: enter an https repository URL, for example https://github.com/owner/project");
	return url;
}
/**
* Build the RPC handler.
* @param options - the operations the page may call.
* @returns a handler for `connection.rpc.handle(CHANNEL, handler)`.
*/
function createConsoleRpc({ status, toggle, setRepository, quickAdd, scan, lastScan, analyze }) {
	const endpoints = {
		status: () => status(),
		"servers/toggle": (payload) => toggle(String(payload?.entryId ?? ""), payload?.enabled === true),
		"servers/repository": (payload) => setRepository(String(payload?.rowId ?? ""), typeof payload?.url === "string" ? payload.url : ""),
		"quick-add": (payload, signal) => quickAdd({
			repositoryUrl: acceptRepositoryUrl(payload?.repositoryUrl),
			notes: typeof payload?.notes === "string" ? payload.notes : "",
			locale: payload?.locale === "en" ? "en" : "zh"
		}, signal),
		scan: (_payload, signal) => scan(signal),
		"scan/last": () => typeof lastScan === "function" ? lastScan() : null,
		"scan/analyze": (payload, signal) => analyze({ locale: payload?.locale === "en" ? "en" : "zh" }, signal)
	};
	return async (endpoint, payload, signal) => {
		try {
			const handle = Object.hasOwn(endpoints, endpoint) ? endpoints[endpoint] : void 0;
			if (handle === void 0) return failed("MCP console: unknown endpoint");
			return ok(await handle(payload, signal));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = typeof error?.code === "string" ? error.code : "";
			if (SAFE_MESSAGE.test(message)) return failed(message);
			if (SAFE_MESSAGE.test(code)) return failed(code);
			return failed("MCP console: the request failed");
		}
	};
}
//#endregion
//#region src/sessions.js
/**
* Open an ordinary Session that carries one prompt, for the AI-assisted flows.
*
* The Session is created through the public session controller in the
* default Workspace and receives the prompt as a real user message, so what
* the model sees is exactly what the transcript shows. It runs under the
* person's own permission preset: every install the agent attempts still
* asks for approval.
*
* @module dsh-mcp-console/sessions
*/
const NO_DEFAULT = Symbol("no default workspace");
/**
* Pick the Workspace a new Session opens in: the registry's first-use default
* when it is still registered, else a Workspace named like the desktop
* default, else the most recently updated one.
* @param registry - `ctx.workspaceRegistry`.
* @returns the Workspace, or undefined when none is registered.
*/
async function resolveDefaultWorkspace(registry) {
	if (registry === void 0) return void 0;
	if (typeof registry.initializeDefault === "function") try {
		const existing = await registry.initializeDefault(() => Promise.reject(NO_DEFAULT));
		if (existing !== void 0) return existing;
	} catch (error) {
		if (error !== NO_DEFAULT) throw error;
	}
	const all = typeof registry.list === "function" ? registry.list() : [];
	if (all.length === 0) return void 0;
	const named = all.find((workspace) => workspace.title === DEFAULT_WORKSPACE_DIRECTORY);
	if (named !== void 0) return named;
	return [...all].sort((a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""))[0];
}
/**
* Create a Session in the default Workspace and send it `text`.
* @param options - the session controller, the Workspace registry, the Agent
*   preset, the Session title, the prompt, and cancellation.
* @returns `{ sessionId, workspaceId? }`.
*/
async function openPromptSession({ sessionController, workspaceRegistry, agentPreset, title, text, signal }) {
	if (sessionController === void 0) throw new Error("MCP console: the session controller is not available in this profile");
	if (typeof text !== "string" || text.trim() === "") throw new Error("MCP console: the prompt is empty");
	const workspace = await resolveDefaultWorkspace(workspaceRegistry);
	const preset = typeof agentPreset === "string" && agentPreset.trim() !== "" ? agentPreset.trim() : void 0;
	const sessionId = (await sessionController.create({
		...workspace === void 0 ? {} : { workspaceId: workspace.id },
		...preset === void 0 ? {} : { agentPreset: preset }
	})).sessionId;
	if (typeof title === "string" && title.trim() !== "" && typeof sessionController.rename === "function") await sessionController.rename({
		sessionId,
		title: title.trim().slice(0, 80)
	}).catch(() => void 0);
	await sessionController.prompt({
		requestId: randomUUID(),
		sessionId,
		mode: "queue",
		content: [{
			type: "text",
			text
		}]
	}, signal ?? new AbortController().signal);
	return {
		sessionId,
		...workspace === void 0 ? {} : { workspaceId: workspace.id }
	};
}
//#endregion
//#region src/index.js
/**
* dsh-mcp-console — manage the MCP servers of a DeepSeek Harness profile.
*
* The plugin reads the profile's `@deepseek-ai/dsh-mcp-client` rows and their
* observable state, switches rows on and off through the Plugin Manager, and
* opens ordinary Sessions for the two AI-assisted flows: installing an MCP
* server from a repository, and researching what local software could be
* connected. It never inserts MCP rows itself; an agent does that by
* installing a configuration-only bundle with the person's approval.
*
* @module dsh-mcp-console
*/
const name = PLUGIN_ID;
/**
* Nothing is mandatory: every service is looked up when an endpoint needs it,
* so a profile without one (a headless run, a profile without the Plugin
* Manager) still loads the plugin and its page says what is missing.
*/
const inject = [];
const Config = z.object({
	/** Agent preset of the AI sessions; `cordis` (Creator mode) can install bundles. */
	agentPreset: live(z.string().default(DEFAULT_AGENT_PRESET)),
	/** Where the agent writes configuration bundles; empty means `<DSH_HOME>/mcp-bundles`. */
	bundleDirectory: z.string().default(""),
	/** Bound on one local discovery command, in milliseconds. */
	scanTimeoutMs: z.natural().min(1e3).default(DEFAULT_SCAN_TIMEOUT_MS),
	/** Repository links the person set for rows, by row id. */
	repositories: live(z.dict(z.string()).default({}))
});
function apply(ctx, config) {
	let source = () => ({
		agentPreset: fieldValue(config?.agentPreset),
		repositories: fieldValue(config?.repositories)
	});
	const preference = {
		writable: false,
		set: void 0
	};
	ctx.inject(["settings"], (settingsCtx) => connectSettings(settingsCtx, {
		ctx,
		Config,
		namespace: PLUGIN_ID,
		source: () => source(),
		setSource: (next) => {
			source = next;
		},
		preference
	}));
	const service = (key) => {
		try {
			return ctx.get(key);
		} catch {
			return;
		}
	};
	const profile = () => service("profileContext");
	const dshHome = () => profile()?.home ?? (typeof process.env.DSH_HOME === "string" && process.env.DSH_HOME !== "" ? process.env.DSH_HOME : join(homedir(), ".dsh"));
	const bundleDir = () => typeof config?.bundleDirectory === "string" && config.bundleDirectory.trim() !== "" ? config.bundleDirectory.trim() : join(dshHome(), "mcp-bundles");
	const repositories = () => {
		const value = fieldValue((source() ?? {}).repositories);
		return value !== null && typeof value === "object" ? value : {};
	};
	const existingNames = () => readMcpRows(service("loader")).map((row) => row.config?.serverName).filter((item) => typeof item === "string");
	const openSession = (title, text, signal) => openPromptSession({
		sessionController: service("sessionController"),
		workspaceRegistry: service("workspaceRegistry"),
		agentPreset: fieldValue((source() ?? {}).agentPreset) ?? "cordis",
		title,
		text,
		signal
	});
	/**
	* The last local scan. It describes the machine, not the profile, so it is
	* kept in one file under DSH_HOME and survives leaving the page and
	* restarting; the AI analysis reuses it rather than scanning twice.
	*/
	let lastScan;
	const scanFile = () => join(dshHome(), "storages", "dsh-mcp-console", "last-scan.json");
	const loadLastScan = async () => {
		if (lastScan !== void 0) return lastScan;
		try {
			const saved = JSON.parse(await readFile(scanFile(), "utf8"));
			if (saved !== null && typeof saved === "object" && typeof saved.scannedAt === "number") lastScan = saved;
		} catch {}
		return lastScan;
	};
	const saveLastScan = async (scan) => {
		const file = scanFile();
		try {
			await mkdir(dirname(file), { recursive: true });
			const temp = `${file}.${process.pid}.tmp`;
			await writeFile(temp, JSON.stringify(scan), "utf8");
			await rename(temp, file);
		} catch (error) {
			ctx.logger?.warn?.("mcp-console: could not save the scan result: %s", error.message);
		}
	};
	const withSize = (scan) => scan === void 0 ? null : {
		...scan,
		inventoryChars: inventoryText(scan).length
	};
	const handler = createConsoleRpc({
		status: async () => ({
			...await listServers({
				loader: service("loader"),
				tools: service("tools"),
				pluginManager: service("pluginManager"),
				profileDir: profile()?.dir,
				repositories: repositories()
			}),
			sessions: service("sessionController") !== void 0,
			writable: preference.writable === true,
			bundleDir: bundleDir()
		}),
		toggle: (entryId, enabled) => setServerEnabled(service("pluginManager"), entryId, enabled),
		setRepository: async (rowId, url) => {
			if (rowId === "") throw new Error("MCP console: unknown server");
			if (preference.writable !== true) throw new Error("MCP console: settings are not writable in this profile");
			const normalized = url.trim() === "" ? void 0 : normalizeRepository(url);
			if (url.trim() !== "" && normalized === void 0) throw new Error("MCP console: enter an http(s) repository URL");
			const next = { ...repositories() };
			if (normalized === void 0) delete next[rowId];
			else next[rowId] = normalized;
			await preference.set({ repositories: next });
			return {
				rowId,
				...normalized === void 0 ? {} : { repository: normalized }
			};
		},
		quickAdd: ({ repositoryUrl, notes, locale }, signal) => {
			const short = repositoryUrl.replace(/^https:\/\/(?:www\.)?github\.com\//u, "");
			return openSession(locale === "en" ? `Install MCP: ${short}` : `安装 MCP：${short}`, quickAddPrompt({
				repositoryUrl,
				notes,
				existingNames: existingNames(),
				bundleDir: bundleDir(),
				locale
			}), signal);
		},
		scan: async (signal) => {
			const run = createRunner(service("subprocess"), { timeoutMs: config?.scanTimeoutMs ?? 2e4 });
			signal?.throwIfAborted?.();
			lastScan = await scanLocal({ run });
			await saveLastScan(lastScan);
			return withSize(lastScan);
		},
		lastScan: async () => withSize(await loadLastScan()),
		analyze: async ({ locale }, signal) => {
			if (await loadLastScan() === void 0) throw new Error("MCP console: scan this computer first");
			return openSession(locale === "en" ? "Find MCP-capable software" : "检索可接入 MCP 的本机软件", discoveryPrompt({
				inventory: inventoryText(lastScan),
				existingNames: existingNames(),
				bundleDir: bundleDir(),
				locale
			}), signal);
		}
	});
	ctx.inject(["connection", "webServer"], (connectionCtx) => {
		const connection = connectionCtx.connection;
		connectionCtx.effect(() => typeof connection.register === "function" ? connection.register(connectionCtx, CHANNEL, handler) : connection.rpc.handle(CHANNEL, handler), "mcp-console: loopback RPC");
	});
}
//#endregion
export { Config, MASK, acceptRepositoryUrl, apply, clientConfigPaths, createConsoleRpc, createRunner, discoveryPrompt, inject, inventoryText, listServers, name, normalizeRepository, openPromptSession, parseClientServers, quickAddPrompt, readClientServers, readMcpRows, redactArgs, redactConfig, redactMap, resolveDefaultWorkspace, scanLocal, serverStatus, setServerEnabled, toolPrefix, toolsByServer };

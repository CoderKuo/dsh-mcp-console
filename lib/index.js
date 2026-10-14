import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import z from "@deepseek-ai/schemastery";
import { randomUUID } from "node:crypto";
//#region src/constants.js
/**
* Identities and defaults this plugin owns.
*
* @module dsh-mcp-console/constants
*/
/** This build's version; `dev` when running from source (tests). */
const PLUGIN_VERSION = "0.1.7";
/** Loader row id, settings namespace, and RPC channel stem. */
const PLUGIN_ID = "mcp-console";
/** Loopback RPC channel the browser half talks to. */
const CHANNEL = "/mcp-console";
/** The module every MCP server row of a profile names. */
const MCP_MODULE = "@deepseek-ai/dsh-mcp-client";
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
//#region src/changes.js
/**
* A change counter the page waits on instead of polling.
*
* The host bumps it on the events that change what the page shows — the tool
* registry changed (an MCP server connected, synced, or dropped its tools),
* the Plugin Manager changed the profile — and on this plugin's own actions.
* The page asks to wait for a revision newer than the one it has; the answer
* comes as soon as one exists, or after a bound so the request never hangs.
*
* @module dsh-mcp-console/changes
*/
/** Longest a wait is held before answering with the unchanged revision. */
const MAX_WAIT_MS = 25e3;
function createChangeFeed({ now = Date.now } = {}) {
	let revision = 1;
	const waiters = /* @__PURE__ */ new Set();
	const bump = () => {
		revision += 1;
		for (const waiter of [...waiters]) waiter();
	};
	/**
	* Resolve with the current revision once it differs from `known`, or after
	* `timeoutMs`, or when `signal` aborts.
	* @param known - the revision the page has.
	* @param options - the bound and the request's signal.
	* @returns `{ revision, changed }`.
	*/
	const wait = (known, { timeoutMs = MAX_WAIT_MS, signal } = {}) => {
		if (known !== revision) return Promise.resolve({
			revision,
			changed: true
		});
		return new Promise((resolve) => {
			let timer;
			const done = (changed) => {
				clearTimeout(timer);
				waiters.delete(onChange);
				signal?.removeEventListener?.("abort", onAbort);
				resolve({
					revision,
					changed
				});
			};
			const onChange = () => done(true);
			const onAbort = () => done(false);
			waiters.add(onChange);
			timer = setTimeout(() => done(false), Math.max(0, Math.min(timeoutMs, MAX_WAIT_MS)));
			signal?.addEventListener?.("abort", onAbort, { once: true });
		});
	};
	return Object.freeze({
		bump,
		wait,
		current: () => revision,
		/** Answer every pending wait, for unload. */
		close: () => {
			for (const waiter of [...waiters]) waiter();
		},
		startedAt: now()
	});
}
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
const record$3 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** A `!!js` node as the loader keeps it in raw rows. */
function jsExpression(value) {
	if (record$3(value) && typeof value.__jsExpr === "string") return value.__jsExpr;
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
	if (!record$3(map)) return [];
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
	const value = record$3(config) ? config : {};
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
const record$2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
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
	if (record$2(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers);
	const servers = /* @__PURE__ */ new Map();
	for (const map of maps) {
		if (!record$2(map)) continue;
		for (const [name, value] of Object.entries(map)) {
			if (!record$2(value) || servers.has(name)) continue;
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
//#region src/importer.js
/**
* Import an MCP server another AI client already runs (Claude Desktop, Claude
* Code, Cursor, Windsurf, VS Code, Codex) into this profile.
*
* The page names a client and a server; the host re-reads that client's own
* file from the fixed list of known locations (never a path from the
* browser), turns the entry into a `@deepseek-ai/dsh-mcp-client` config, and
* installs it the documented way: a configuration-only bundle under the
* plugin's bundle directory, installed with the Plugin Manager's
* `installBundle`. Environment values and headers are copied as the other
* client stores them, into a local file of the same machine.
*
* @module dsh-mcp-console/importer
*/
const SERVER_NAME$1 = /^[A-Za-z0-9_-]{1,32}$/u;
const record$1 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
const stringMap = (value) => record$1(value) ? Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "string")) : {};
/** One full server entry from a JSON client file. */
function jsonEntry(text, name) {
	const parsed = JSON.parse(text);
	const maps = [
		parsed?.mcpServers,
		parsed?.servers,
		parsed?.mcp?.servers
	];
	if (record$1(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers);
	for (const map of maps) if (record$1(map) && record$1(map[name])) return map[name];
}
/** One full server entry from Codex's `config.toml` (strings, string arrays, and the env table). */
function tomlEntry(text, name) {
	const value = (raw) => {
		const trimmed = raw.trim();
		if (trimmed.startsWith("\"")) return JSON.parse(trimmed);
		if (trimmed.startsWith("'")) return trimmed.slice(1, trimmed.lastIndexOf("'"));
		if (trimmed.startsWith("[")) return [...trimmed.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/gu)].map((match) => match[1] === void 0 ? match[2] : JSON.parse(`"${match[1]}"`));
	};
	const entry = {};
	let target;
	for (const line of text.split(/\r?\n/u)) {
		const header = /^\s*\[(.+)\]\s*$/u.exec(line);
		if (header !== null) {
			const key = header[1].trim();
			const own = [`mcp_servers.${name}`, `mcp_servers."${name}"`];
			target = own.includes(key) ? entry : own.some((prefix) => key === `${prefix}.env`) ? entry.env = entry.env ?? {} : void 0;
			continue;
		}
		if (target === void 0) continue;
		const pair = /^\s*("?)([A-Za-z0-9_.-]+)\1\s*=\s*(.+)$/u.exec(line);
		if (pair === null) continue;
		const parsed = value(pair[3]);
		if (parsed !== void 0) target[pair[2]] = parsed;
	}
	return Object.keys(entry).length === 0 ? void 0 : entry;
}
/**
* Read one server of one client in full.
* @param options - the client name, the server name, and the known locations.
* @returns the raw entry.
*/
async function readClientServer({ client, name, paths = clientConfigPaths() }) {
	const location = paths.find((item) => item.client === client);
	if (location === void 0) throw new Error("MCP console: unknown client");
	let text;
	try {
		text = await readFile(location.path, "utf8");
	} catch {
		throw new Error(`MCP console: ${client} has no configuration file any more`);
	}
	let entry;
	try {
		entry = location.format === "toml" ? tomlEntry(text, name) : jsonEntry(text, name);
	} catch {
		entry = void 0;
	}
	if (!record$1(entry)) throw new Error(`MCP console: ${client} no longer configures "${name}"`);
	return entry;
}
/**
* Turn another client's entry into a `@deepseek-ai/dsh-mcp-client` config.
* @param entry - the raw entry.
* @param serverName - the DSH server name to use.
* @returns the config.
*/
function toMcpClientConfig(entry, serverName) {
	const type = typeof entry.type === "string" ? entry.type.toLowerCase() : typeof entry.transport === "string" ? entry.transport.toLowerCase() : "";
	const url = typeof entry.url === "string" ? entry.url : typeof entry.serverUrl === "string" ? entry.serverUrl : void 0;
	if (type === "sse") throw new Error("MCP console: this server uses SSE, which DSH does not support (stdio and streamable-http only)");
	if (typeof entry.command === "string" && entry.command !== "") {
		const cwd = typeof entry.cwd === "string" && entry.cwd !== "" ? entry.cwd : void 0;
		return {
			serverName,
			transport: "stdio",
			command: entry.command,
			args: strings(entry.args),
			env: stringMap(entry.env),
			...cwd === void 0 ? {} : { cwd }
		};
	}
	if (url !== void 0) return {
		serverName,
		transport: "streamable-http",
		url,
		headers: {
			...stringMap(entry.headers),
			...stringMap(entry.http_headers)
		}
	};
	throw new Error("MCP console: this entry has neither a command nor a URL");
}
/** A valid, unused DSH server name derived from the client's name. */
function serverNameFor(name, existing) {
	let base = String(name).replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 28);
	if (base === "") base = "imported";
	let candidate = base;
	for (let n = 2; existing.includes(candidate); n += 1) candidate = `${base}-${n}`;
	if (!SERVER_NAME$1.test(candidate)) throw new Error("MCP console: could not derive a server name");
	return candidate;
}
/**
* A value as flow-style YAML: JSON for plain data (JSON is YAML and every
* string is quoted), and a Loader `!!js` node as a tagged quoted scalar.
*/
function flowYaml(value, indent = "") {
	if (record$1(value) && typeof value.__jsExpr === "string") return `!!js ${JSON.stringify(value.__jsExpr)}`;
	const inner = `${indent}  `;
	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		return `[\n${value.map((item) => `${inner}${flowYaml(item, inner)}`).join(",\n")}\n${indent}]`;
	}
	if (record$1(value)) {
		const entries = Object.entries(value).filter(([, item]) => item !== void 0);
		if (entries.length === 0) return "{}";
		return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${flowYaml(item, inner)}`).join(",\n")}\n${indent}}`;
	}
	return JSON.stringify(value);
}
/** The files of a configuration-only bundle carrying one MCP row. */
function bundleFiles({ serverName, config, description, homepage, origin = "Imported" }) {
	const manifest = {
		name: `@local/mcp-${serverName.toLowerCase()}`,
		version: "0.1.0",
		private: true,
		description,
		...typeof homepage === "string" && homepage !== "" ? { homepage } : {},
		dsh: { bundle: { patch: "./cordis.patch.yml" } }
	};
	const patch = [{ insert: [{
		id: `mcp-${serverName}`,
		name: MCP_MODULE,
		config
	}] }];
	return {
		"package.json": `${JSON.stringify(manifest, null, 2)}\n`,
		"cordis.patch.yml": `# ${origin} by dsh-mcp-console. Generated; remove it in the MCP page and add it again to change it.\n${flowYaml(patch)}\n`,
		name: manifest.name
	};
}
/**
* Write a configuration-only bundle for one config and install it. A bundle
* that fails to install leaves no directory behind.
* @param options - the Plugin Manager, the config, the bundle directory, and
*   the manifest's description, homepage, and origin line.
* @returns `{ serverName, bundle, application, directory }`.
*/
async function installConfigBundle({ pluginManager, config, bundleDir, description, homepage, origin }) {
	if (pluginManager === void 0) throw new Error("MCP console: the Plugin Manager is not available in this profile");
	const serverName = config.serverName;
	const files = bundleFiles({
		serverName,
		config,
		description,
		homepage,
		origin
	});
	const directory = join(bundleDir, serverName);
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "package.json"), files["package.json"], "utf8");
	await writeFile(join(directory, "cordis.patch.yml"), files["cordis.patch.yml"], "utf8");
	let result;
	try {
		result = await pluginManager.installBundle(directory, { enabled: true });
	} catch (error) {
		await rm(directory, {
			recursive: true,
			force: true
		}).catch(() => void 0);
		throw error;
	}
	return {
		serverName,
		bundle: files.name,
		application: typeof result?.application === "string" ? result.application : "applied",
		directory
	};
}
/**
* Import one server: write the bundle, then install it.
* @param options - the Plugin Manager, the client and server names, the
*   configured server names, the bundle directory, and the known locations.
* @returns `{ serverName, bundle, application, directory }`.
*/
async function importClientServer({ pluginManager, client, name, existingNames, bundleDir, paths }) {
	if (pluginManager === void 0) throw new Error("MCP console: the Plugin Manager is not available in this profile");
	return installConfigBundle({
		pluginManager,
		config: toMcpClientConfig(await readClientServer({
			client,
			name,
			paths
		}), serverNameFor(name, existingNames)),
		bundleDir,
		description: `MCP server "${name}" imported from ${client}`
	});
}
//#endregion
//#region src/manual.js
/**
* Manual add: connect an MCP server the person already knows how to run,
* without the AI. The page sends a name and either a launch command or an
* endpoint URL; the host builds the `@deepseek-ai/dsh-mcp-client` config and
* installs it the same way import does.
*
* A value marked as coming from the environment is written as a Loader `!!js`
* expression (`process.env.NAME`), so the secret itself never lands in the
* bundle; the Loader evaluates it in the DSH host when the row starts.
*
* @module dsh-mcp-console/manual
*/
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu;
const MAX_PAIRS = 50;
const MAX_TEXT = 4e3;
const text = (value) => typeof value === "string" ? value.trim() : "";
const fail$1 = (message) => {
	throw new Error(`MCP console: ${message}`);
};
/**
* Split a command line into the executable and its arguments. Double and
* single quotes group; a backslash is an ordinary character, so Windows paths
* survive. No shell runs the result.
* @param line - the command line.
* @returns the tokens.
*/
function splitCommandLine(line) {
	const tokens = [];
	let current = "";
	let started = false;
	let quote;
	for (const ch of String(line)) if (quote !== void 0) if (ch === quote) quote = void 0;
	else current += ch;
	else if (ch === "\"" || ch === "'") {
		quote = ch;
		started = true;
	} else if (/\s/u.test(ch)) {
		if (started) tokens.push(current);
		current = "";
		started = false;
	} else {
		current += ch;
		started = true;
	}
	if (quote !== void 0) fail$1("the command has an unclosed quote");
	if (started) tokens.push(current);
	return tokens;
}
/**
* The expression for a value read from the environment: a bare variable name,
* or a template where each `${NAME}` is replaced, e.g. `Bearer ${API_TOKEN}`.
* A variable that is not set reads as an empty string.
* @param template - what the person typed.
* @returns a `!!js` node.
*/
function environmentExpression(template) {
	const value = text(template);
	if (ENV_NAME.test(value)) return { __jsExpr: `process.env.${value} ?? ''` };
	const parts = [];
	let last = 0;
	for (const match of value.matchAll(PLACEHOLDER)) {
		if (match.index > last) parts.push(JSON.stringify(value.slice(last, match.index)));
		parts.push(`(process.env.${match[1]} ?? '')`);
		last = match.index + match[0].length;
	}
	if (parts.length === 0) fail$1(`"${value.slice(0, 40)}" names no environment variable; enter a name such as API_TOKEN, or a template such as Bearer \${API_TOKEN}`);
	if (last < value.length) parts.push(JSON.stringify(value.slice(last)));
	return { __jsExpr: parts.join(" + ") };
}
/** Name/value pairs from the page as a config map; `fromEnv` pairs become expressions. */
function pairs(list, { pattern, what }) {
	const out = {};
	if (!Array.isArray(list)) return out;
	const filled = list.filter((item) => text(item?.name) !== "" || text(item?.value) !== "");
	if (filled.length > MAX_PAIRS) fail$1(`at most ${MAX_PAIRS} ${what}`);
	for (const item of filled) {
		const name = text(item.name);
		if (!pattern.test(name)) fail$1(`"${name.slice(0, 40)}" is not a valid ${what.replace(/s$/u, "")} name`);
		if (Object.hasOwn(out, name)) fail$1(`${what.replace(/s$/u, "")} "${name}" is given twice`);
		const value = typeof item.value === "string" ? item.value : "";
		if (value.length > MAX_TEXT) fail$1(`the value of "${name}" is too long`);
		out[name] = item.fromEnv === true ? environmentExpression(value) : value;
	}
	return out;
}
/**
* Build the dsh-mcp-client config the person described.
* @param request - `{ name, transport, commandLine, cwd, env, url, headers }`
*   where `env` and `headers` are `{ name, value, fromEnv }` lists.
* @param existingNames - the configured server names.
* @returns the config.
*/
function manualConfig(request, existingNames = []) {
	const serverName = text(request?.name);
	if (!SERVER_NAME.test(serverName)) fail$1("the name must be 1-32 letters, digits, \"-\" or \"_\"");
	if (existingNames.includes(serverName)) fail$1(`a server named "${serverName}" already exists`);
	if (request?.transport === "streamable-http") {
		const url = text(request.url);
		let parsed;
		try {
			parsed = new URL(url);
		} catch {
			fail$1("enter the endpoint as an http(s) URL");
		}
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") fail$1("enter the endpoint as an http(s) URL");
		return {
			serverName,
			transport: "streamable-http",
			url: parsed.toString(),
			headers: pairs(request.headers, {
				pattern: HEADER_NAME,
				what: "headers"
			})
		};
	}
	if (request?.transport !== "stdio") fail$1("choose a local command or a remote endpoint");
	const line = typeof request.commandLine === "string" ? request.commandLine : "";
	if (line.length > MAX_TEXT) fail$1("the command is too long");
	const [command, ...args] = splitCommandLine(line);
	if (command === void 0 || command === "") fail$1("enter the command that starts the server");
	const cwd = text(request.cwd);
	return {
		serverName,
		transport: "stdio",
		command,
		args,
		env: pairs(request.env, {
			pattern: ENV_NAME,
			what: "environment variables"
		}),
		...cwd === "" ? {} : { cwd }
	};
}
//#endregion
//#region src/models.js
/**
* The providers and models an AI session can run on, as the model picker
* shows them: every registered provider route with the models it lists, and
* the person's current default selection.
*
* @module dsh-mcp-console/models
*/
/** Bound on one provider's model listing; a slow provider is shown without models. */
const MODEL_LIST_TIMEOUT_MS = 8e3;
const withTimeout = (promise, ms) => {
	let timer;
	const deadline = new Promise((_, reject) => {
		timer = setTimeout(() => reject(/* @__PURE__ */ new Error("timed out")), ms);
	});
	return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
};
/**
* List the selectable models.
* @param options - `ctx.llm`, `ctx.agentDefaultModel`, and the per-provider bound.
* @returns `{ providers: [{ id, name, models: [{ id, name }], error? }], default? }`.
*/
async function listModelChoices({ llm, agentDefaultModel, timeoutMs = MODEL_LIST_TIMEOUT_MS }) {
	const routes = typeof llm?.listProviders === "function" ? llm.listProviders() : [];
	const providers = await Promise.all(routes.map(async (route) => {
		const id = String(route?.id ?? "");
		const name = typeof route?.name === "string" && route.name !== "" ? route.name : id;
		try {
			const models = await withTimeout(Promise.resolve(llm.listModels(id)), timeoutMs);
			return {
				id,
				name,
				models: (Array.isArray(models) ? models : []).filter((model) => typeof model?.id === "string").map((model) => ({
					id: model.id,
					name: typeof model.name === "string" && model.name !== "" ? model.name : model.id
				}))
			};
		} catch {
			return {
				id,
				name,
				models: [],
				error: true
			};
		}
	}));
	let current;
	try {
		const selection = agentDefaultModel?.currentSelection?.();
		if (typeof selection?.provider === "string" && typeof selection?.model === "string") current = {
			provider: selection.provider,
			model: selection.model
		};
	} catch {
		current = void 0;
	}
	return {
		providers: providers.filter((provider) => provider.id !== ""),
		...current === void 0 ? {} : { default: current }
	};
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
function bundleSteps(locale, { bundleDir, source }) {
	const link = source?.link === void 0 ? "" : `"${source.kind === "repository" ? "repository" : "homepage"}": "${source.link}", `;
	if (locale === "en") return [
		`Create a configuration-only bundle directory under \`${bundleDir}\` (one directory per server, e.g. \`${bundleDir}/<serverName>\`) with:`,
		`   - \`package.json\`: \`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<one line>", ${link}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
		"   - `cordis.patch.yml` inserting one row: `- insert: [ { id: mcp-<serverName>, name: '@deepseek-ai/dsh-mcp-client', config: { serverName: <serverName>, transport: stdio | streamable-http, ... } } ]`",
		`   - \`serverName\` must match \`${SERVER_NAME_RULE}\` and must not clash with an existing server.`,
		"   - Never write a secret literally. Reference it as `!!js process.env.NAME` and tell me which environment variables to set.",
		"Install the bundle with the `plugin_manager` tool, action `install_bundle`, using the absolute directory path. Do not edit the profile's own `cordis.patch.yml` or `package.json`.",
		"Check that the result says `application: applied`, that tools named `mcp__<serverName>__*` appear, and call one harmless tool to prove it works.",
		"Finish with a short summary: server name, transport, the tools it offers, environment variables I still need to set, and that it can be switched off in the MCP Console page."
	];
	return [
		`在 \`${bundleDir}\` 下创建一个只含配置的 bundle 目录（每个服务器一个目录，例如 \`${bundleDir}/<serverName>\`），包含：`,
		`   - \`package.json\`：\`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<一句话说明>", ${link}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
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
/** How each kind of source is introduced, read, and run first. */
const SOURCE_STEPS = {
	repository: {
		en: (v) => [
			`Install the open-source MCP server at ${v} and connect it to this DeepSeek Harness profile.`,
			"Read the repository (README, docs, package manifest) and confirm it is an MCP server. Work out its transport (stdio or streamable-http), the command or URL that starts it, and the environment variables it needs. If it is not an MCP server, stop and tell me.",
			"Choose the simplest reliable way to run it: a no-install launcher (`npx -y`, `uvx`, a published Docker image) first; otherwise clone it into this workspace and build it."
		],
		zh: (v) => [
			`请安装 ${v} 这个开源 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
			"阅读仓库（README、文档、包清单），确认它是 MCP 服务器，弄清传输方式（stdio 或 streamable-http）、启动命令或 URL、需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。",
			"选最简单可靠的运行方式：优先免安装启动（`npx -y`、`uvx`、已发布的 Docker 镜像）；否则克隆到当前工作区再构建。"
		]
	},
	npm: {
		en: (v) => [
			`Install the MCP server published as the npm package \`${v}\` and connect it to this DeepSeek Harness profile.`,
			"Read the package (its npm page, README, and source repository) and confirm it is an MCP server. Work out its transport, its arguments, and the environment variables it needs. If it is not an MCP server, stop and tell me.",
			`Run it with \`npx -y ${v}\` (Node.js must be installed; check \`node --version\`). Only fall back to another way when that cannot work.`
		],
		zh: (v) => [
			`请安装 npm 包 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
			"查看这个包（npm 页面、README、源码仓库），确认它是 MCP 服务器，弄清传输方式、启动参数和需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。",
			`用 \`npx -y ${v}\` 运行（需要已安装 Node.js，先用 \`node --version\` 确认）。只有这样行不通时才换别的方式。`
		]
	},
	pypi: {
		en: (v) => [
			`Install the MCP server published as the PyPI package \`${v}\` and connect it to this DeepSeek Harness profile.`,
			"Read the package (its PyPI page, README, and source repository) and confirm it is an MCP server. Work out its transport, its arguments, and the environment variables it needs. If it is not an MCP server, stop and tell me.",
			`Run it with \`uvx ${v}\` when uv is installed (check \`uvx --version\`); otherwise tell me and offer \`pipx run\` or a virtual environment with \`pip install\`.`
		],
		zh: (v) => [
			`请安装 PyPI 包 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
			"查看这个包（PyPI 页面、README、源码仓库），确认它是 MCP 服务器，弄清传输方式、启动参数和需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。",
			`已安装 uv 时用 \`uvx ${v}\` 运行（先用 \`uvx --version\` 确认）；没有的话告诉我，并给出 \`pipx run\` 或虚拟环境 \`pip install\` 的方案。`
		]
	},
	package: {
		en: (v) => [
			`Install the MCP server published as the package \`${v}\` and connect it to this DeepSeek Harness profile.`,
			`Find out whether \`${v}\` is an npm or a PyPI package (check both registries) and confirm it is an MCP server. Work out its transport, its arguments, and the environment variables it needs. If it is neither, or not an MCP server, stop and tell me.`,
			"Run an npm package with `npx -y <package>`, a PyPI package with `uvx <package>`; check that Node.js or uv is installed first."
		],
		zh: (v) => [
			`请安装包 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
			`先查清 \`${v}\` 是 npm 包还是 PyPI 包（两个仓库都查），并确认它是 MCP 服务器，弄清传输方式、启动参数和需要的环境变量。都找不到或不是 MCP 服务器，就停下来告诉我。`,
			"npm 包用 `npx -y <包名>` 运行，PyPI 包用 `uvx <包名>` 运行；先确认已安装 Node.js 或 uv。"
		]
	},
	docker: {
		en: (v) => [
			`Install the MCP server from the Docker image or command \`${v}\` and connect it to this DeepSeek Harness profile.`,
			"Read the image's documentation (Docker Hub page, README, source repository) and confirm it is an MCP server. Work out its transport, the options it needs, and its environment variables. If it is not an MCP server, stop and tell me.",
			"Run it with `docker run -i --rm <image>` for stdio (keep `-i`; pass each variable with `-e NAME` and set it in the config `env`). Check that Docker is installed and running first (`docker version`)."
		],
		zh: (v) => [
			`请安装 Docker 镜像或命令 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
			"查看这个镜像的文档（Docker Hub 页面、README、源码仓库），确认它是 MCP 服务器，弄清传输方式、需要的参数和环境变量。如果它不是 MCP 服务器，就停下来告诉我。",
			"stdio 方式用 `docker run -i --rm <镜像>` 运行（必须带 `-i`；环境变量用 `-e 变量名` 传入，并写进配置的 `env`）。先用 `docker version` 确认 Docker 已安装并在运行。"
		]
	},
	url: {
		en: (v) => [
			`Connect the MCP server described at ${v} to this DeepSeek Harness profile.`,
			"Find out what this link is. If it is a remote MCP endpoint, connect it directly with `transport: streamable-http` (SSE-only servers are not supported) and work out the headers it needs, such as an API key. If it is a web page (a README, a registry or directory entry, documentation), read it and work out how the server runs: transport, command or URL, and environment variables. If there is no MCP server, stop and tell me.",
			"For a local server choose the simplest reliable way to run it: `npx -y`, `uvx`, or a published Docker image first; otherwise clone it into this workspace and build it."
		],
		zh: (v) => [
			`请把 ${v} 对应的 MCP 服务器接入当前 DeepSeek Harness profile。`,
			"先判断这个链接是什么：如果是远程 MCP 端点，直接用 `transport: streamable-http` 接入（只支持 SSE 的服务器不能接），弄清需要的请求头（如 API Key）；如果是网页（README、MCP 目录/注册表详情页、文档），阅读它，弄清服务器怎么运行：传输方式、启动命令或 URL、环境变量。找不到 MCP 服务器就停下来告诉我。",
			"本地运行的服务器选最简单可靠的方式：优先 `npx -y`、`uvx` 或已发布的 Docker 镜像；否则克隆到当前工作区再构建。"
		]
	}
};
/**
* The prompt for installing and connecting an MCP server.
* @param options - the source (from `classifySource`; a bare
*   `repositoryUrl` is taken as a repository), the person's notes, the
*   configured server names, where bundles go, and the UI locale (`zh` | `en`).
* @returns the prompt text.
*/
function quickAddPrompt({ source, repositoryUrl, notes, existingNames = [], bundleDir, locale = "zh" }) {
	const from = source ?? {
		kind: "repository",
		value: repositoryUrl,
		link: repositoryUrl
	};
	const lang = locale === "en" ? "en" : "zh";
	const [intro, read, run] = (SOURCE_STEPS[from.kind] ?? SOURCE_STEPS.url)[lang](from.value);
	const extra = typeof notes === "string" && notes.trim() !== "" ? notes.trim().slice(0, 2e3) : "";
	const confirm = lang === "en" ? "Tell me what you are about to run before any install command, and do not run install scripts I have not seen." : "执行任何安装命令前先告诉我要运行什么，不要运行我没看过的安装脚本。";
	const tryIt = lang === "en" ? "Start it once locally to confirm it launches (for a remote endpoint, check that it answers)." : "在本机先启动一次，确认能正常运行（远程端点则确认能连通）。";
	return [
		intro,
		"",
		existingLine(lang, existingNames),
		...extra === "" ? [] : ["", lang === "en" ? `My notes: ${extra}` : `我的补充说明：${extra}`],
		"",
		numbered([
			read,
			`${run} ${confirm}`,
			tryIt,
			...bundleSteps(lang, {
				bundleDir,
				source: from
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
			...bundleSteps("en", { bundleDir })
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
			...bundleSteps("zh", { bundleDir })
		]),
		"",
		`清单${truncated ? "（已截断）" : ""}：`,
		"```text",
		text,
		"```"
	].join("\n");
}
//#endregion
//#region src/repository.js
/**
* Repository links, shared by the host and the page (no Node imports).
*
* @module dsh-mcp-console/repository
*/
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
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
//#endregion
//#region src/sources.js
/**
* What AI quick add accepts: where an MCP server comes from.
*
* The person may paste a repository page, a package name, a Docker image, a
* launch command copied from a README, or any web page (a registry entry, a
* remote endpoint). Each input is classified so the prompt can tell the agent
* what it is looking at and which way to run it first. The text only ever
* reaches the prompt; nothing here runs it.
*
* @module dsh-mcp-console/sources
*/
const MAX_SOURCE_CHARS = 500;
const CODE_HOST = /^(?:www\.)?(?:github\.com|gitlab\.com|gitee\.com|codeberg\.org|bitbucket\.org)$/u;
const NPM_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(?:@[\w.^~<>=*-]+)?$/iu;
const PYPI_NAME = /^[a-z0-9][\w.-]*(?:\[[\w,.-]+\])?(?:[=<>~!]=?[\w.*]+)?$/iu;
const IMAGE_WITH_REGISTRY = /^[a-z0-9.-]+\.[a-z]{2,}(?::\d+)?\/[\w./-]+(?::[\w.-]+)?(?:@sha256:[a-f0-9]{64})?$/iu;
const IMAGE_WITH_TAG = /^[a-z0-9][\w.-]*\/[\w.-]+:[\w.-]+$/iu;
const IMAGE_MCP_HUB = /^mcp\/[\w.-]+(?::[\w.-]+)?$/iu;
const OWNER_REPO = /^[A-Za-z0-9][\w.-]*\/[\w.-]+$/u;
const fail = () => {
	throw new Error("MCP console: enter a repository or web page link, an npm or PyPI package name, a Docker image, or a launch command such as npx -y <package>");
};
/** The package name without a version, for its registry page. */
const npmBase = (name) => name.replace(/^(@[^/]+\/[^@]+|[^@]+)@.*$/u, "$1");
const pypiBase = (name) => name.replace(/[[=<>~!].*$/u, "");
const npm = (name) => {
	if (!NPM_NAME.test(name)) fail();
	return {
		kind: "npm",
		value: name,
		label: name,
		link: `https://www.npmjs.com/package/${npmBase(name)}`
	};
};
const pypi = (name) => {
	if (!PYPI_NAME.test(name)) fail();
	return {
		kind: "pypi",
		value: name,
		label: name,
		link: `https://pypi.org/project/${pypiBase(name)}/`
	};
};
const docker = (value, image) => ({
	kind: "docker",
	value,
	label: image ?? value
});
const repository = (url) => ({
	kind: "repository",
	value: url,
	label: url.replace(/^https?:\/\/(?:www\.)?github\.com\//u, ""),
	link: url
});
/** The image of a `docker run` command: the first token that is neither an option nor an option's value. */
function dockerImage(tokens) {
	const valued = /* @__PURE__ */ new Set([
		"-e",
		"--env",
		"-v",
		"--volume",
		"-p",
		"--publish",
		"--name",
		"--network",
		"--env-file",
		"-w",
		"--workdir",
		"-u",
		"--user",
		"--mount",
		"--entrypoint",
		"--platform",
		"-l",
		"--label"
	]);
	for (let i = 2; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (valued.has(token)) i += 1;
		else if (!token.startsWith("-")) return token;
	}
}
/** A link: a code host repository, a registry package page, or any other page. */
function fromUrl(text) {
	let url;
	try {
		url = new URL(text);
	} catch {
		fail();
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") fail();
	const host = url.hostname.toLowerCase();
	const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
	if (CODE_HOST.test(host) && parts.length >= 2) return repository(normalizeRepository(text) ?? text);
	if (/(?:^|\.)npmjs\.(?:com|org)$/u.test(host) && parts[0] === "package" && parts.length >= 2) return npm(parts[1].startsWith("@") ? `${parts[1]}/${parts[2] ?? ""}` : parts[1]);
	if (/^(?:www\.)?pypi\.org$/u.test(host) && parts[0] === "project" && parts.length >= 2) return pypi(parts[1]);
	if (host === "hub.docker.com" && parts[0] === "r" && parts.length >= 3) return docker(`${parts[1]}/${parts[2]}`);
	if (host === "hub.docker.com" && parts[0] === "_" && parts.length >= 2) return docker(parts[1]);
	return {
		kind: "url",
		value: url.toString(),
		label: `${host}${url.pathname === "/" ? "" : url.pathname}`,
		link: url.toString()
	};
}
/**
* Classify what the person entered.
* @param input - the text from the quick-add field.
* @returns `{ kind, value, label, link? }` where `kind` is `repository`,
*   `npm`, `pypi`, `package` (npm or PyPI, unknown which), `docker`, or `url`.
*/
function classifySource(input) {
	const text = typeof input === "string" ? input.trim() : "";
	if (text === "" || text.length > MAX_SOURCE_CHARS || /[\r\n]/u.test(text)) fail();
	const tokens = text.split(/\s+/u);
	const [first, second] = tokens;
	if (first === "npx" || first === "pnpm" && second === "dlx" || first === "bunx") {
		const name = tokens.slice(first === "pnpm" ? 2 : 1).find((token) => !token.startsWith("-"));
		return name === void 0 ? fail() : npm(name);
	}
	if (first === "uvx" || first === "pipx" && second === "run") {
		const name = tokens.slice(first === "pipx" ? 2 : 1).find((token) => !token.startsWith("-"));
		return name === void 0 ? fail() : pypi(name);
	}
	if (/^(?:pip3?|uv)$/u.test(first) && tokens.includes("install")) {
		const name = tokens.slice(tokens.indexOf("install") + 1).find((token) => !token.startsWith("-"));
		return name === void 0 ? fail() : pypi(name);
	}
	if (first === "docker" && (second === "run" || second === "pull")) {
		const image = second === "pull" ? tokens.slice(2).find((token) => !token.startsWith("-")) : dockerImage(tokens);
		return image === void 0 ? fail() : docker(text, image);
	}
	if (tokens.length > 1) fail();
	if (/^https?:\/\//iu.test(text)) return fromUrl(text);
	if (/^(?:git@|github:|git\+https:)/u.test(text)) {
		const url = normalizeRepository(text);
		return url === void 0 ? fail() : repository(url);
	}
	if (text.startsWith("npm:")) return npm(text.slice(4));
	if (text.startsWith("pypi:")) return pypi(text.slice(5));
	if (text.startsWith("docker:")) return docker(text.slice(7));
	if (text.startsWith("@")) return npm(text);
	if (IMAGE_WITH_REGISTRY.test(text) || IMAGE_WITH_TAG.test(text) || IMAGE_MCP_HUB.test(text)) return docker(text);
	if (OWNER_REPO.test(text)) return repository(`https://github.com/${text}`);
	if (NPM_NAME.test(text)) return {
		kind: "package",
		value: text,
		label: text
	};
	return fail();
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
const SAFE_MESSAGE = /^(?:MCP console:|unknown-plugin|management-required|unaddressable|operation-error|not-removable|bundle-in-use|stop-profile|invalid-spec|incompatible-version)[\s\S]{0,300}$/u;
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
function createConsoleRpc({ status, toggle, remove, importServer, addServer, wait, setRepository, models, quickAdd, scan, lastScan, analyze }) {
	const endpoints = {
		status: () => status(),
		"servers/toggle": (payload) => toggle(String(payload?.entryId ?? ""), payload?.enabled === true),
		"servers/remove": (payload) => remove(String(payload?.entryId ?? "")),
		"servers/import": (payload) => importServer({
			client: String(payload?.client ?? ""),
			name: String(payload?.name ?? "")
		}),
		"status/wait": (payload, signal) => wait({ revision: Number(payload?.revision) }, signal),
		"servers/repository": (payload) => setRepository(String(payload?.rowId ?? ""), typeof payload?.url === "string" ? payload.url : ""),
		"servers/add": (payload) => addServer({
			name: payload?.name,
			transport: payload?.transport,
			commandLine: payload?.commandLine,
			cwd: payload?.cwd,
			env: payload?.env,
			url: payload?.url,
			headers: payload?.headers
		}),
		"quick-add": (payload, signal) => quickAdd({
			source: classifySource(typeof payload?.source === "string" ? payload.source : payload?.repositoryUrl),
			notes: typeof payload?.notes === "string" ? payload.notes : "",
			locale: payload?.locale === "en" ? "en" : "zh",
			model: payload?.model
		}, signal),
		models: () => typeof models === "function" ? models() : { providers: [] },
		scan: (_payload, signal) => scan(signal),
		"scan/last": () => typeof lastScan === "function" ? lastScan() : null,
		"scan/analyze": (payload, signal) => analyze({
			locale: payload?.locale === "en" ? "en" : "zh",
			model: payload?.model
		}, signal)
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
				...bundle.version === void 0 ? {} : { version: bundle.version },
				mcpRows: (bundle.rows ?? []).filter((item) => item?.moduleName === MCP_MODULE).length
			} },
			removable: pluginManager !== void 0 && bundle?.removable === true,
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
/** Whether `child` lies strictly inside `parent`. */
function isInside(parent, child) {
	if (typeof parent !== "string" || typeof child !== "string" || parent === "" || child === "") return false;
	const rel = relative(resolve(parent), resolve(child));
	return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}
/**
* The local directory a bundle was installed from, when the profile names one
* (`file:` or `link:` dependency), resolved against the profile directory.
*/
async function bundleSourceDir(profileDir, bundleName) {
	try {
		const spec = JSON.parse(await readFile(join(profileDir, "package.json"), "utf8"))?.dependencies?.[bundleName];
		const match = typeof spec === "string" ? /^(?:file|link):(.+)$/u.exec(spec) : null;
		if (match === null || match[1].endsWith(".tgz")) return void 0;
		return resolve(profileDir, match[1]);
	} catch {
		return;
	}
}
/**
* Remove the bundle a server row comes from, through the Plugin Manager, and
* delete its source directory when it lies inside the plugin's own bundle
* directory (where AI quick add and import write). Nothing outside it is
* ever deleted.
* @param options - the Plugin Manager, the row's entry id, the profile
*   directory, and the bundle directory.
* @returns `{ bundle, application, removedDirectory? }`.
*/
async function deleteServer({ pluginManager, entryId, profileDir, bundleDir }) {
	if (pluginManager === void 0) throw new Error("MCP console: the Plugin Manager is not available in this profile");
	const bundle = (await pluginManager.listBundles()).find((item) => (item?.rows ?? []).some((row) => row?.entryId === entryId));
	if (bundle === void 0) throw new Error("MCP console: this server is not provided by a removable bundle; switch it off instead");
	if (bundle.removable !== true) throw new Error("MCP console: this bundle comes with DSH and cannot be removed; switch it off instead");
	const source = typeof profileDir === "string" ? await bundleSourceDir(profileDir, bundle.name) : void 0;
	const result = await pluginManager.removeBundle(bundle.name);
	let removedDirectory;
	if (source !== void 0 && isInside(bundleDir, source)) {
		await rm(source, {
			recursive: true,
			force: true
		});
		removedDirectory = source;
	}
	return {
		bundle: bundle.name,
		application: typeof result?.application === "string" ? result.application : "applied",
		...removedDirectory === void 0 ? {} : { removedDirectory }
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
* Select a model for one Session without changing the person's default.
*
* `selectModel` is what DSH's own picker calls, and it also saves the choice
* as the default model. The default is read first and saved back afterwards;
* saves are applied in submission order, so the restore lands after the
* picker's own save.
* @param options - the session controller, the default-model service, the
*   Session, and the `{ provider, model }` to use.
*/
async function selectSessionModel({ sessionController, agentDefaultModel, sessionId, model }) {
	if (typeof sessionController?.selectModel !== "function") throw new Error("MCP console: this profile cannot choose a model for a session");
	const previous = typeof agentDefaultModel?.currentSelection === "function" ? agentDefaultModel.currentSelection() : void 0;
	try {
		await sessionController.selectModel({
			sessionId,
			provider: model.provider,
			model: model.model
		});
	} catch (error) {
		const reason = typeof error?.code === "string" ? error.code : error instanceof Error ? error.message : String(error);
		throw new Error(`MCP console: the model ${model.provider} / ${model.model} cannot be used (${reason.slice(0, 120)})`);
	}
	if (previous !== void 0 && typeof agentDefaultModel.saveSelection === "function") await agentDefaultModel.saveSelection(previous);
}
/** A `{ provider, model }` the person picked, or undefined for the default model. */
function pickedModel(value) {
	if (value === null || typeof value !== "object") return void 0;
	const provider = typeof value.provider === "string" ? value.provider.trim() : "";
	const model = typeof value.model === "string" ? value.model.trim() : "";
	return provider === "" || model === "" ? void 0 : {
		provider,
		model
	};
}
/**
* Create a Session in the default Workspace and send it `text`.
* @param options - the session controller, the Workspace registry, the
*   default-model service, the Agent preset, the model to use (the default
*   when absent), the Session title, the prompt, and cancellation.
* @returns `{ sessionId, workspaceId? }`.
*/
async function openPromptSession({ sessionController, workspaceRegistry, agentDefaultModel, agentPreset, model, title, text, signal }) {
	if (sessionController === void 0) throw new Error("MCP console: the session controller is not available in this profile");
	if (typeof text !== "string" || text.trim() === "") throw new Error("MCP console: the prompt is empty");
	const workspace = await resolveDefaultWorkspace(workspaceRegistry);
	const preset = typeof agentPreset === "string" && agentPreset.trim() !== "" ? agentPreset.trim() : void 0;
	const sessionId = (await sessionController.create({
		...workspace === void 0 ? {} : { workspaceId: workspace.id },
		...preset === void 0 ? {} : { agentPreset: preset }
	})).sessionId;
	if (model !== void 0) await selectSessionModel({
		sessionController,
		agentDefaultModel,
		sessionId,
		model
	});
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
* server from a repository, package, image, or page, and researching what
* local software could be connected. It never edits the profile's own patch:
* every server it adds (imported, added by hand, or installed by an agent
* with the person's approval) arrives as a configuration-only bundle
* installed through the Plugin Manager.
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
	const openSession = (title, text, signal, model) => openPromptSession({
		sessionController: service("sessionController"),
		workspaceRegistry: service("workspaceRegistry"),
		agentDefaultModel: service("agentDefaultModel"),
		agentPreset: fieldValue((source() ?? {}).agentPreset) ?? "cordis",
		model: pickedModel(model),
		title,
		text,
		signal
	});
	/**
	* What the page waits on: the tool registry and the Plugin Manager announce
	* the changes it shows, so the page refreshes on them instead of polling.
	*/
	const changes = createChangeFeed();
	ctx.on?.("tools/change", () => changes.bump());
	ctx.on?.("plugin-manager/changed", () => changes.bump());
	ctx.effect(() => () => changes.close(), "mcp-console: change feed");
	/** Run an action that changes the list, then announce it. */
	const changing = async (action) => {
		try {
			return await action();
		} finally {
			changes.bump();
		}
	};
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
			bundleDir: bundleDir(),
			version: PLUGIN_VERSION,
			revision: changes.current()
		}),
		toggle: (entryId, enabled) => changing(() => setServerEnabled(service("pluginManager"), entryId, enabled)),
		remove: (entryId) => changing(() => deleteServer({
			pluginManager: service("pluginManager"),
			entryId,
			profileDir: profile()?.dir,
			bundleDir: bundleDir()
		})),
		importServer: ({ client, name }) => changing(() => importClientServer({
			pluginManager: service("pluginManager"),
			client,
			name,
			existingNames: existingNames(),
			bundleDir: bundleDir()
		})),
		addServer: (request) => changing(() => {
			const config = manualConfig(request, existingNames());
			const what = config.transport === "stdio" ? config.command : config.url;
			return installConfigBundle({
				pluginManager: service("pluginManager"),
				config,
				bundleDir: bundleDir(),
				description: `MCP server "${config.serverName}" (${what}) added by hand`,
				origin: "Added by hand"
			});
		}),
		wait: ({ revision }, signal) => changes.wait(revision, { signal }),
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
		models: () => listModelChoices({
			llm: service("llm"),
			agentDefaultModel: service("agentDefaultModel")
		}),
		quickAdd: ({ source, notes, locale, model }, signal) => openSession(locale === "en" ? `Install MCP: ${source.label}` : `安装 MCP：${source.label}`, quickAddPrompt({
			source,
			notes,
			existingNames: existingNames(),
			bundleDir: bundleDir(),
			locale
		}), signal, model),
		scan: async (signal) => {
			const run = createRunner(service("subprocess"), { timeoutMs: config?.scanTimeoutMs ?? 2e4 });
			signal?.throwIfAborted?.();
			lastScan = await scanLocal({ run });
			await saveLastScan(lastScan);
			return withSize(lastScan);
		},
		lastScan: async () => withSize(await loadLastScan()),
		analyze: async ({ locale, model }, signal) => {
			if (await loadLastScan() === void 0) throw new Error("MCP console: scan this computer first");
			return openSession(locale === "en" ? "Find MCP-capable software" : "检索可接入 MCP 的本机软件", discoveryPrompt({
				inventory: inventoryText(lastScan),
				existingNames: existingNames(),
				bundleDir: bundleDir(),
				locale
			}), signal, model);
		}
	});
	ctx.inject(["connection", "webServer"], (connectionCtx) => {
		const connection = connectionCtx.connection;
		connectionCtx.effect(() => typeof connection.register === "function" ? connection.register(connectionCtx, CHANNEL, handler) : connection.rpc.handle(CHANNEL, handler), "mcp-console: loopback RPC");
	});
}
//#endregion
export { Config, MASK, acceptRepositoryUrl, apply, bundleFiles, bundleSourceDir, classifySource, clientConfigPaths, createChangeFeed, createConsoleRpc, createRunner, deleteServer, discoveryPrompt, environmentExpression, flowYaml, importClientServer, inject, installConfigBundle, inventoryText, isInside, listModelChoices, listServers, manualConfig, name, normalizeRepository, openPromptSession, parseClientServers, pickedModel, quickAddPrompt, readClientServer, readClientServers, readMcpRows, redactArgs, redactConfig, redactMap, resolveDefaultWorkspace, scanLocal, selectSessionModel, serverNameFor, serverStatus, setServerEnabled, splitCommandLine, toMcpClientConfig, toolPrefix, toolsByServer };

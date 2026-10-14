import { createRequire } from "node:module";
import { access, appendFile, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import z from "@deepseek-ai/schemastery";
import { randomUUID } from "node:crypto";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region src/constants.js
/**
* Identities and defaults this plugin owns.
*
* @module dsh-mcp-console/constants
*/
/** This build's version; `dev` when running from source (tests). */
const PLUGIN_VERSION = "0.1.11";
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
/** Bound on trying a local server before it is added (a first `npx`/`uvx`/`docker` run downloads). */
const DEFAULT_TEST_TIMEOUT_MS = 9e4;
/** Bound on trying a remote endpoint. */
const REMOTE_TEST_TIMEOUT_MS = 2e4;
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
const SERVER_NAME$1 = /^[A-Za-z0-9_-]{1,32}$/u;
const ENV_NAME$1 = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const PLACEHOLDER = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu;
const MAX_PAIRS = 50;
const MAX_TEXT = 4e3;
const text = (value) => typeof value === "string" ? value.trim() : "";
const fail$2 = (message) => {
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
	if (quote !== void 0) fail$2("the command has an unclosed quote");
	if (started) tokens.push(current);
	return tokens;
}
/**
* The inverse of `splitCommandLine`, for showing a stored command in the
* form: tokens with spaces or quotes are quoted.
* @param tokens - the executable and its arguments.
* @returns the command line, or undefined when a token cannot be quoted.
*/
function joinCommandLine(tokens) {
	const out = [];
	for (const token of tokens) {
		const text = String(token);
		if (text !== "" && !/[\s"']/u.test(text)) out.push(text);
		else if (!text.includes("\"")) out.push(`"${text}"`);
		else if (!text.includes("'")) out.push(`'${text}'`);
		else return void 0;
	}
	return out.join(" ");
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
	if (ENV_NAME$1.test(value)) return { __jsExpr: `process.env.${value} ?? ''` };
	const parts = [];
	let last = 0;
	for (const match of value.matchAll(PLACEHOLDER)) {
		if (match.index > last) parts.push(JSON.stringify(value.slice(last, match.index)));
		parts.push(`(process.env.${match[1]} ?? '')`);
		last = match.index + match[0].length;
	}
	if (parts.length === 0) fail$2(`"${value.slice(0, 40)}" names no environment variable; enter a name such as API_TOKEN, or a template such as Bearer \${API_TOKEN}`);
	if (last < value.length) parts.push(JSON.stringify(value.slice(last)));
	return { __jsExpr: parts.join(" + ") };
}
/** Name/value pairs from the page as a config map; `fromEnv` pairs become expressions. */
function pairs(list, { pattern, what }) {
	const out = {};
	if (!Array.isArray(list)) return out;
	const filled = list.filter((item) => text(item?.name) !== "" || text(item?.value) !== "");
	if (filled.length > MAX_PAIRS) fail$2(`at most ${MAX_PAIRS} ${what}`);
	for (const item of filled) {
		const name = text(item.name);
		if (!pattern.test(name)) fail$2(`"${name.slice(0, 40)}" is not a valid ${what.replace(/s$/u, "")} name`);
		if (Object.hasOwn(out, name)) fail$2(`${what.replace(/s$/u, "")} "${name}" is given twice`);
		const value = typeof item.value === "string" ? item.value : "";
		if (value.length > MAX_TEXT) fail$2(`the value of "${name}" is too long`);
		out[name] = item.fromEnv === true ? environmentExpression(value) : value;
	}
	return out;
}
/** The variable mcp-remote reads the n-th header value from. */
const bridgeHeaderVariable = (index) => `MCP_REMOTE_HEADER_${index + 1}`;
/**
* Reach a remote server through mcp-remote, a local stdio process: it speaks
* streamable-http and SSE and runs the OAuth sign-in in the browser, which
* DSH's own client does not. Header values travel as environment variables
* mcp-remote expands (`Name:${VAR}`, no spaces, as its README advises for
* Windows), and are passed explicitly because DSH scrubs credential-shaped
* names from a child's environment.
*/
function bridgeConfig(serverName, url, headers) {
	const args = [
		"-y",
		"mcp-remote",
		url.toString()
	];
	const env = {};
	Object.entries(headers).forEach(([name, value], index) => {
		const variable = bridgeHeaderVariable(index);
		args.push("--header", `${name}:\${${variable}}`);
		env[variable] = value;
	});
	const local = /^(?:localhost|127\.0\.0\.1|\[::1\])$/u.test(url.hostname);
	if (url.protocol === "http:" && !local) args.push("--allow-http");
	return {
		serverName,
		transport: "stdio",
		command: "npx",
		args,
		env
	};
}
/**
* Build the dsh-mcp-client config the person described.
* @param request - `{ name, transport, commandLine, cwd, env, url, headers,
*   bridge }` where `env` and `headers` are `{ name, value, fromEnv }` lists
*   and `bridge` routes a remote server through mcp-remote.
* @param existingNames - the configured server names.
* @returns the config.
*/
function manualConfig(request, existingNames = []) {
	const serverName = text(request?.name);
	if (!SERVER_NAME$1.test(serverName)) fail$2("the name must be 1-32 letters, digits, \"-\" or \"_\"");
	if (existingNames.includes(serverName)) fail$2(`a server named "${serverName}" already exists`);
	if (request?.transport === "streamable-http") {
		const url = text(request.url);
		let parsed;
		try {
			parsed = new URL(url);
		} catch {
			fail$2("enter the endpoint as an http(s) URL");
		}
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:") fail$2("enter the endpoint as an http(s) URL");
		const headers = pairs(request.headers, {
			pattern: HEADER_NAME,
			what: "headers"
		});
		if (request.bridge === true) return bridgeConfig(serverName, parsed, headers);
		return {
			serverName,
			transport: "streamable-http",
			url: parsed.toString(),
			headers
		};
	}
	if (request?.transport !== "stdio") fail$2("choose a local command or a remote endpoint");
	const line = typeof request.commandLine === "string" ? request.commandLine : "";
	if (line.length > MAX_TEXT) fail$2("the command is too long");
	const [command, ...args] = splitCommandLine(line);
	if (command === void 0 || command === "") fail$2("enter the command that starts the server");
	const cwd = text(request.cwd);
	return {
		serverName,
		transport: "stdio",
		command,
		args,
		env: pairs(request.env, {
			pattern: ENV_NAME$1,
			what: "environment variables"
		}),
		...cwd === "" ? {} : { cwd }
	};
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
const SECRET_NAME$2 = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu;
/** A long opaque run that reads as a credential rather than a word or path. */
const OPAQUE$1 = /^(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA|eyJ)[-_A-Za-z0-9.]{8,}$|^[A-Za-z0-9+/_=-]{32,}$/u;
const record$8 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** A `!!js` node as the loader keeps it in raw rows. */
function jsExpression(value) {
	if (record$8(value) && typeof value.__jsExpr === "string") return value.__jsExpr;
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
		if (pair !== null && SECRET_NAME$2.test(pair[1])) {
			out.push(`${pair[1]}=${MASK}`);
			continue;
		}
		if (/^--?[A-Za-z]/u.test(text) && SECRET_NAME$2.test(text)) {
			out.push(text);
			maskNext = true;
			continue;
		}
		out.push(OPAQUE$1.test(text) ? MASK : text);
	}
	return out;
}
/**
* Keep the names of a map and say where each value comes from, never what it is.
* @param map - `env` or `headers`.
* @returns `[{ name, source }]`, source `expression` (a `!!js` value) or `literal`.
*/
function redactMap(map) {
	if (!record$8(map)) return [];
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
	const value = record$8(config) ? config : {};
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
			for (const key of [...parsed.searchParams.keys()]) if (SECRET_NAME$2.test(key)) parsed.searchParams.set(key, MASK);
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
//#region src/audit.js
/**
* What the log records for each endpoint: a summary of the request (names,
* not values), a summary of the outcome, and the raw error when it fails.
* Polling and lookups the page makes on its own are not logged unless they
* fail.
*
* @module dsh-mcp-console/audit
*/
/** Endpoints the page calls by itself all the time; only their failures are logged. */
const QUIET = /* @__PURE__ */ new Set([
	"status",
	"status/wait",
	"env/check",
	"scan/last",
	"models",
	"runtimes",
	"diagnostics",
	"servers/config",
	"log/client"
]);
const record$7 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const short = (value, limit = 200) => typeof value === "string" ? value.slice(0, limit) : void 0;
/** A URL without its query and fragment, which may carry a key. */
function safeUrl(value) {
	try {
		const url = new URL(String(value));
		return `${url.origin}${url.pathname}${url.search === "" ? "" : "?…"}`;
	} catch {
		return short(value, 100);
	}
}
/** A command line with credential-looking arguments masked. */
function safeCommand(line) {
	try {
		const [command, ...args] = splitCommandLine(String(line ?? ""));
		return command === void 0 ? "" : [command, ...redactArgs(args)].join(" ");
	} catch {
		return "(unparsable command)";
	}
}
/** Name/value rows as names and where each value comes from. */
const rows = (list) => Array.isArray(list) ? list.filter((item) => record$7(item) && String(item.name ?? "") !== "").map((item) => `${item.name}${item.expression ? "(expression)" : item.fromEnv ? "(env)" : "(literal)"}`) : void 0;
/** The literal values a form carries, to register with the log's mask. */
function formSecrets(form) {
	const values = [];
	for (const item of [...Array.isArray(form?.env) ? form.env : [], ...Array.isArray(form?.headers) ? form.headers : []]) if (record$7(item) && item.fromEnv !== true && typeof item.value === "string") values.push(item.value);
	return values;
}
function formSummary(form) {
	if (!record$7(form)) return {};
	const remote = form.transport === "streamable-http";
	return {
		name: short(form.name, 40),
		transport: short(form.transport, 20),
		...remote ? {
			url: safeUrl(form.url),
			headers: rows(form.headers),
			bridge: form.bridge === true
		} : {
			command: safeCommand(form.commandLine),
			env: rows(form.env),
			cwd: form.cwd ? "set" : void 0
		}
	};
}
const REQUEST = {
	"servers/toggle": (p) => ({
		entryId: p?.entryId,
		enabled: p?.enabled === true
	}),
	"servers/remove": (p) => ({ entryId: p?.entryId }),
	"servers/import": (p) => ({
		client: short(p?.client, 40),
		name: short(p?.name, 60)
	}),
	"servers/add": formSummary,
	"servers/test": formSummary,
	"servers/update": (p) => ({
		entryId: p?.entryId,
		...formSummary(p)
	}),
	"servers/config": (p) => ({ entryId: p?.entryId }),
	"servers/repository": (p) => ({
		rowId: p?.rowId,
		url: p?.url ? safeUrl(p.url) : "(cleared)"
	}),
	"quick-add": (p) => ({
		source: short(p?.source ?? p?.repositoryUrl, 300),
		notes: typeof p?.notes === "string" && p.notes.trim() !== "" ? `${p.notes.length} chars` : void 0,
		locale: p?.locale,
		model: record$7(p?.model) ? `${p.model.provider}/${p.model.model}` : "default"
	}),
	"registry/search": (p) => ({
		query: short(p?.query, 100),
		page: p?.cursor ? "next" : "first"
	}),
	"scan/analyze": (p) => ({
		locale: p?.locale,
		model: record$7(p?.model) ? `${p.model.provider}/${p.model.model}` : "default"
	}),
	runtimes: (p) => ({ refresh: p?.refresh === true })
};
const RESULT = {
	"servers/toggle": (v) => ({
		application: v?.application,
		warnings: v?.warnings
	}),
	"servers/remove": (v) => ({
		bundle: v?.bundle,
		application: v?.application,
		removedDirectory: v?.removedDirectory
	}),
	"servers/import": (v) => ({
		serverName: v?.serverName,
		bundle: v?.bundle,
		application: v?.application
	}),
	"servers/add": (v) => ({
		serverName: v?.serverName,
		bundle: v?.bundle,
		application: v?.application
	}),
	"servers/update": (v) => ({
		serverName: v?.serverName,
		bundle: v?.bundle,
		application: v?.application
	}),
	"servers/test": (v) => v?.ok ? {
		ok: true,
		server: v.server,
		toolCount: v.toolCount,
		ms: v.ms
	} : {
		ok: false,
		reason: v?.reason,
		message: v?.message,
		output: v?.output
	},
	"servers/config": (v) => ({
		editable: v?.editable,
		reason: v?.reason
	}),
	"servers/export": (v) => ({
		count: v?.count,
		notes: v?.notes?.length
	}),
	"quick-add": (v) => ({
		sessionId: v?.sessionId,
		workspaceId: v?.workspaceId
	}),
	"scan/analyze": (v) => ({ sessionId: v?.sessionId }),
	"registry/search": (v) => ({
		results: v?.results?.length,
		more: v?.nextCursor !== void 0
	}),
	scan: (v) => ({
		apps: v?.apps?.length,
		services: v?.services?.length,
		ports: v?.ports?.length,
		containers: v?.containers?.length,
		clients: v?.clients?.length
	})
};
const summarizeRequest = (endpoint, payload) => (REQUEST[endpoint] ?? (() => ({})))(payload);
const summarizeResult = (endpoint, value) => (RESULT[endpoint] ?? (() => ({})))(value);
/** The raw failure: its message, code, and what the Plugin Manager attached. */
function failureFields(error) {
	const fields = {
		message: String(error instanceof Error ? error.message : error),
		...typeof error?.code === "string" ? { code: error.code } : {}
	};
	if (record$7(error?.details) && Object.keys(error.details).length > 0) fields.details = error.details;
	if (error instanceof Error && !/^MCP console:/u.test(error.message) && typeof error.stack === "string") fields.stack = error.stack.split("\n").slice(1, 5).map((line) => line.trim()).join(" | ");
	return fields;
}
//#endregion
//#region src/diagnostics.js
/**
* The diagnostics text the page offers to copy: versions, the environment,
* every server's state, and the recent problems from the log. It is meant to
* be pasted to whoever helps; it carries no configured value (servers appear
* as their redacted projection, and the text goes through the log's mask).
*
* @module dsh-mcp-console/diagnostics
*/
const line = (label, value) => `${label}: ${value === void 0 || value === null || value === "" ? "—" : value}`;
/**
* Build the text.
* @param facts - versions, platform, the listing from `listServers`, the
*   runtimes, the recent log entries, and the log location.
* @returns the diagnostics text.
*/
function buildDiagnostics({ pluginVersion, pageVersion, dshVersion, platform, arch, nodeVersion, manageable, sessions, servers = [], runtimes, recent = [], logFile, bundleDir, time = /* @__PURE__ */ new Date() }) {
	const out = [
		"## dsh-mcp-console diagnostics",
		line("time", time.toISOString()),
		line("plugin (host)", pluginVersion),
		line("plugin (page)", pageVersion),
		line("DSH", dshVersion),
		line("system", `${platform} ${arch}, node ${nodeVersion}`),
		line("plugin manager", manageable ? "available" : "missing"),
		line("sessions", sessions ? "available" : "missing"),
		line("bundle directory", bundleDir),
		line("log file", logFile)
	];
	if (runtimes !== void 0 && runtimes !== null) out.push(line("runtimes", Object.entries(runtimes).map(([name, item]) => `${name}=${item.found ? item.version ?? "yes" : "no"}`).join(" ")));
	out.push("", `## servers (${servers.length})`);
	for (const server of servers) {
		const config = server.config ?? {};
		const target = config.transport === "streamable-http" ? safeUrl(config.url) : [config.command, ...config.args ?? []].filter(Boolean).join(" ");
		const facts = [
			server.status,
			config.transport,
			`${server.toolCount ?? 0} tools`,
			server.enabled ? "on" : "off",
			server.toggleable ? `switch:${server.toggleVia ?? "row"}` : `read-only${server.readOnlyReason ? `(${server.readOnlyReason})` : ""}`,
			server.bundle ? `bundle ${server.bundle.name}${server.bundle.version ? `@${server.bundle.version}` : ""}${server.bundle.disabled ? " (off)" : ""}` : "profile row"
		];
		out.push(`- ${server.name}: ${facts.join(" · ")}`);
		if (target) out.push(`    ${target}`);
		if (config.env?.length) out.push(`    env: ${config.env.map((item) => `${item.name}(${item.source})`).join(" ")}`);
		if (config.headers?.length) out.push(`    headers: ${config.headers.map((item) => `${item.name}(${item.source})`).join(" ")}`);
		if (server.error) out.push(`    error: ${String(server.error).split("\n").slice(0, 3).join(" / ")}`);
	}
	out.push("", `## recent problems (${recent.length})`);
	if (recent.length === 0) out.push("none");
	for (const entry of recent) {
		const detail = entry.error?.message ?? entry.result?.message ?? entry.result?.reason ?? entry.detail ?? "";
		const code = entry.error?.code ? ` [${entry.error.code}]` : "";
		out.push(`- ${entry.time} ${entry.level} ${entry.event}${code}: ${String(detail).split("\n").slice(0, 4).join(" / ").slice(0, 600)}`);
		if (entry.request && Object.keys(entry.request).length > 0) out.push(`    request: ${JSON.stringify(entry.request).slice(0, 400)}`);
		if (entry.result?.output) out.push(`    output: ${String(entry.result.output).split("\n").slice(-6).join(" / ").slice(0, 600)}`);
	}
	return `${out.join("\n")}\n`;
}
const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
const SEGMENT_BYTES = 1024 * 1024;
const MAX_FIELD_CHARS = 4e3;
const MEMORY_ENTRIES = 300;
const MAX_SECRETS = 500;
/** A segment (`2026-10-14-001.log`), or a single-file day from before segments (`2026-10-14.log`). */
const FILE_NAME = /^(\d{4}-\d{2}-\d{2})(?:-(\d{3}))?\.log$/u;
/** Credentials in free text: bearer values, `key=value` pairs with a credential name, and opaque tokens. */
const TEXT_SECRETS = [
	/(\bBearer\s+)[A-Za-z0-9._~+/=-]{8,}/giu,
	/(\b[\w-]*(?:key|token|secret|password|passwd|auth|credential|cookie)[\w-]*["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/giu,
	/()\b(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA)[-_A-Za-z0-9]{12,}/gu,
	/()\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/gu
];
const day = (date) => date.toISOString().slice(0, 10);
const segmentName = (date, index) => `${date}-${String(index).padStart(3, "0")}.log`;
/** Order segments oldest first; a single-file day counts as its first segment. */
const segmentKey = (name) => {
	const match = FILE_NAME.exec(name);
	return `${match[1]}-${match[2] ?? "000"}`;
};
/**
* Create the log.
* @param options - the log directory (a function, so it follows DSH_HOME),
*   the console logger to mirror to, a clock, and the limits (for tests).
* @returns `{ write, info, warn, error, mask, clean, recent, directory, file, flush }`.
*/
function createLog({ directory, mirror, now = () => /* @__PURE__ */ new Date(), retentionDays = 7, maxBytes = MAX_TOTAL_BYTES, segmentBytes = SEGMENT_BYTES } = {}) {
	const secrets = /* @__PURE__ */ new Set();
	const memory = [];
	let queue = Promise.resolve();
	/** The segments on disk, oldest first, with their sizes; read once, then kept up to date. */
	let segments;
	let segmentsDir;
	/** Remember configured values so they never appear in the log. */
	const mask = (values) => {
		for (const value of Array.isArray(values) ? values : [values]) {
			if (typeof value !== "string" || value.length < 6 || secrets.has(value)) continue;
			if (secrets.size >= MAX_SECRETS) secrets.delete(secrets.values().next().value);
			secrets.add(value);
		}
	};
	/** A text with every registered value and every credential-looking run masked, and bounded. */
	const clean = (text, limit = MAX_FIELD_CHARS) => {
		let out = String(text ?? "");
		for (const secret of [...secrets].sort((x, y) => y.length - x.length)) out = out.split(secret).join(MASK);
		for (const pattern of TEXT_SECRETS) out = out.replace(pattern, (_match, prefix) => `${prefix}${MASK}`);
		return out.length > limit ? `${out.slice(0, limit)}… (${out.length - limit} more)` : out;
	};
	const cleanValue = (value) => {
		if (typeof value === "string") return clean(value);
		if (Array.isArray(value)) return value.slice(0, 50).map(cleanValue);
		if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key, cleanValue(item)]));
		return value;
	};
	/** Read the segments once: names and sizes, oldest first. */
	const load = async (dir) => {
		await mkdir(dir, { recursive: true }).catch(() => void 0);
		let names = [];
		try {
			names = (await readdir(dir)).filter((name) => FILE_NAME.test(name));
		} catch {}
		names.sort((x, y) => segmentKey(x) < segmentKey(y) ? -1 : 1);
		return Promise.all(names.map(async (name) => ({
			name,
			bytes: await stat(join(dir, name)).then((info) => info.size, () => 0)
		})));
	};
	/** Delete segments past the retention, then the oldest while the log is over the cap. */
	const roll = async (dir) => {
		const oldest = day(/* @__PURE__ */ new Date(now().getTime() - (retentionDays - 1) * 864e5));
		while (segments.length > 1 && segments[0].name.slice(0, 10) < oldest) await unlink(join(dir, segments.shift().name)).catch(() => void 0);
		let total = segments.reduce((sum, item) => sum + item.bytes, 0);
		while (segments.length > 1 && total > maxBytes) {
			const gone = segments.shift();
			total -= gone.bytes;
			await unlink(join(dir, gone.name)).catch(() => void 0);
		}
	};
	/** The segment the next line goes to: today's last one, or a new one when it is full or from another day. */
	const target = (lineBytes) => {
		const today = day(now());
		const last = segments.at(-1);
		const sameDay = last !== void 0 && last.name.startsWith(today);
		if (sameDay && last.bytes + lineBytes <= segmentBytes) return last;
		const index = sameDay ? Number(FILE_NAME.exec(last.name)[2] ?? "0") + 1 : 1;
		const fresh = {
			name: segmentName(today, index),
			bytes: 0
		};
		segments.push(fresh);
		return fresh;
	};
	/** The segment being written, for the diagnostics and "open folder". */
	const file = () => join(directory(), segments?.at(-1)?.name ?? segmentName(day(now()), 1));
	/**
	* Write one entry.
	* @param level - `info` | `warn` | `error`.
	* @param event - a short dotted name, e.g. `servers/add`.
	* @param fields - what to record (cleaned before it is kept).
	*/
	const write = (level, event, fields = {}) => {
		const entry = {
			time: now().toISOString(),
			level,
			event,
			...cleanValue(fields)
		};
		memory.push(entry);
		if (memory.length > MEMORY_ENTRIES) memory.shift();
		const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
		try {
			mirror?.[method]?.("mcp-console: %s %s", event, JSON.stringify(fields).slice(0, 500));
		} catch {}
		const line = `${JSON.stringify(entry)}\n`;
		const lineBytes = Buffer.byteLength(line, "utf8");
		queue = queue.then(async () => {
			const dir = directory();
			if (segments === void 0 || segmentsDir !== dir) {
				segments = await load(dir);
				segmentsDir = dir;
			}
			const segment = target(lineBytes);
			await appendFile(join(dir, segment.name), line, "utf8");
			segment.bytes += lineBytes;
			await roll(dir);
		}).catch(() => void 0);
		return entry;
	};
	return {
		write,
		info: (event, fields) => write("info", event, fields),
		warn: (event, fields) => write("warn", event, fields),
		error: (event, fields) => write("error", event, fields),
		mask,
		clean,
		/** The last entries in memory, newest last; `errors` keeps only warnings and errors. */
		recent: ({ limit = 50, errors = false } = {}) => memory.filter((entry) => !errors || entry.level !== "info").slice(-limit),
		directory,
		file,
		/** Resolves once every queued write reached the file (for tests and shutdown). */
		flush: () => queue
	};
}
/** The environment and header values of a config, to register with `mask()`. */
function configValues(config) {
	const values = [];
	const collect = (map) => {
		if (map === null || typeof map !== "object") return;
		for (const value of Object.values(map)) if (typeof value === "string") values.push(value);
	};
	collect(config?.env);
	collect(config?.headers);
	return values;
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
const record$6 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
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
	if (record$6(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers);
	const servers = /* @__PURE__ */ new Map();
	for (const map of maps) {
		if (!record$6(map)) continue;
		for (const [name, value] of Object.entries(map)) {
			if (!record$6(value) || servers.has(name)) continue;
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
	if (scan.runtimes !== void 0 && scan.runtimes !== null) {
		const found = Object.entries(scan.runtimes).map(([name, item]) => `${name} ${item.found ? item.version ?? "found" : "missing"}`);
		if (found.length > 0) out.push(`runtimes on DSH's PATH: ${found.join(", ")}`);
	}
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
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js
var require_identity = /* @__PURE__ */ __commonJSMin(((exports) => {
	const ALIAS = Symbol.for("yaml.alias");
	const DOC = Symbol.for("yaml.document");
	const MAP = Symbol.for("yaml.map");
	const PAIR = Symbol.for("yaml.pair");
	const SCALAR = Symbol.for("yaml.scalar");
	const SEQ = Symbol.for("yaml.seq");
	const NODE_TYPE = Symbol.for("yaml.node.type");
	const isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
	const isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
	const isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
	const isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
	const isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
	const isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
	function isCollection(node) {
		if (node && typeof node === "object") switch (node[NODE_TYPE]) {
			case MAP:
			case SEQ: return true;
		}
		return false;
	}
	function isNode(node) {
		if (node && typeof node === "object") switch (node[NODE_TYPE]) {
			case ALIAS:
			case MAP:
			case SCALAR:
			case SEQ: return true;
		}
		return false;
	}
	const hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
	exports.ALIAS = ALIAS;
	exports.DOC = DOC;
	exports.MAP = MAP;
	exports.NODE_TYPE = NODE_TYPE;
	exports.PAIR = PAIR;
	exports.SCALAR = SCALAR;
	exports.SEQ = SEQ;
	exports.hasAnchor = hasAnchor;
	exports.isAlias = isAlias;
	exports.isCollection = isCollection;
	exports.isDocument = isDocument;
	exports.isMap = isMap;
	exports.isNode = isNode;
	exports.isPair = isPair;
	exports.isScalar = isScalar;
	exports.isSeq = isSeq;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/visit.js
var require_visit = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	const BREAK = Symbol("break visit");
	const SKIP = Symbol("skip children");
	const REMOVE = Symbol("remove node");
	/**
	* Apply a visitor to an AST node or document.
	*
	* Walks through the tree (depth-first) starting from `node`, calling a
	* `visitor` function with three arguments:
	*   - `key`: For sequence values and map `Pair`, the node's index in the
	*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
	*     `null` for the root node.
	*   - `node`: The current node.
	*   - `path`: The ancestry of the current node.
	*
	* The return value of the visitor may be used to control the traversal:
	*   - `undefined` (default): Do nothing and continue
	*   - `visit.SKIP`: Do not visit the children of this node, continue with next
	*     sibling
	*   - `visit.BREAK`: Terminate traversal completely
	*   - `visit.REMOVE`: Remove the current node, then continue with the next one
	*   - `Node`: Replace the current node, then continue by visiting it
	*   - `number`: While iterating the items of a sequence or map, set the index
	*     of the next step. This is useful especially if the index of the current
	*     node has changed.
	*
	* If `visitor` is a single function, it will be called with all values
	* encountered in the tree, including e.g. `null` values. Alternatively,
	* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
	* `Alias` and `Scalar` node. To define the same visitor function for more than
	* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
	* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
	* specific defined one will be used for each node.
	*/
	function visit(node, visitor) {
		const visitor_ = initVisitor(visitor);
		if (identity.isDocument(node)) {
			if (visit_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE) node.contents = null;
		} else visit_(null, node, visitor_, Object.freeze([]));
	}
	/** Terminate visit traversal completely */
	visit.BREAK = BREAK;
	/** Do not visit the children of the current node */
	visit.SKIP = SKIP;
	/** Remove the current node */
	visit.REMOVE = REMOVE;
	function visit_(key, node, visitor, path) {
		const ctrl = callVisitor(key, node, visitor, path);
		if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
			replaceNode(key, path, ctrl);
			return visit_(key, ctrl, visitor, path);
		}
		if (typeof ctrl !== "symbol") {
			if (identity.isCollection(node)) {
				path = Object.freeze(path.concat(node));
				for (let i = 0; i < node.items.length; ++i) {
					const ci = visit_(i, node.items[i], visitor, path);
					if (typeof ci === "number") i = ci - 1;
					else if (ci === BREAK) return BREAK;
					else if (ci === REMOVE) {
						node.items.splice(i, 1);
						i -= 1;
					}
				}
			} else if (identity.isPair(node)) {
				path = Object.freeze(path.concat(node));
				const ck = visit_("key", node.key, visitor, path);
				if (ck === BREAK) return BREAK;
				else if (ck === REMOVE) node.key = null;
				const cv = visit_("value", node.value, visitor, path);
				if (cv === BREAK) return BREAK;
				else if (cv === REMOVE) node.value = null;
			}
		}
		return ctrl;
	}
	/**
	* Apply an async visitor to an AST node or document.
	*
	* Walks through the tree (depth-first) starting from `node`, calling a
	* `visitor` function with three arguments:
	*   - `key`: For sequence values and map `Pair`, the node's index in the
	*     collection. Within a `Pair`, `'key'` or `'value'`, correspondingly.
	*     `null` for the root node.
	*   - `node`: The current node.
	*   - `path`: The ancestry of the current node.
	*
	* The return value of the visitor may be used to control the traversal:
	*   - `Promise`: Must resolve to one of the following values
	*   - `undefined` (default): Do nothing and continue
	*   - `visit.SKIP`: Do not visit the children of this node, continue with next
	*     sibling
	*   - `visit.BREAK`: Terminate traversal completely
	*   - `visit.REMOVE`: Remove the current node, then continue with the next one
	*   - `Node`: Replace the current node, then continue by visiting it
	*   - `number`: While iterating the items of a sequence or map, set the index
	*     of the next step. This is useful especially if the index of the current
	*     node has changed.
	*
	* If `visitor` is a single function, it will be called with all values
	* encountered in the tree, including e.g. `null` values. Alternatively,
	* separate visitor functions may be defined for each `Map`, `Pair`, `Seq`,
	* `Alias` and `Scalar` node. To define the same visitor function for more than
	* one node type, use the `Collection` (map and seq), `Value` (map, seq & scalar)
	* and `Node` (alias, map, seq & scalar) targets. Of all these, only the most
	* specific defined one will be used for each node.
	*/
	async function visitAsync(node, visitor) {
		const visitor_ = initVisitor(visitor);
		if (identity.isDocument(node)) {
			if (await visitAsync_(null, node.contents, visitor_, Object.freeze([node])) === REMOVE) node.contents = null;
		} else await visitAsync_(null, node, visitor_, Object.freeze([]));
	}
	/** Terminate visit traversal completely */
	visitAsync.BREAK = BREAK;
	/** Do not visit the children of the current node */
	visitAsync.SKIP = SKIP;
	/** Remove the current node */
	visitAsync.REMOVE = REMOVE;
	async function visitAsync_(key, node, visitor, path) {
		const ctrl = await callVisitor(key, node, visitor, path);
		if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
			replaceNode(key, path, ctrl);
			return visitAsync_(key, ctrl, visitor, path);
		}
		if (typeof ctrl !== "symbol") {
			if (identity.isCollection(node)) {
				path = Object.freeze(path.concat(node));
				for (let i = 0; i < node.items.length; ++i) {
					const ci = await visitAsync_(i, node.items[i], visitor, path);
					if (typeof ci === "number") i = ci - 1;
					else if (ci === BREAK) return BREAK;
					else if (ci === REMOVE) {
						node.items.splice(i, 1);
						i -= 1;
					}
				}
			} else if (identity.isPair(node)) {
				path = Object.freeze(path.concat(node));
				const ck = await visitAsync_("key", node.key, visitor, path);
				if (ck === BREAK) return BREAK;
				else if (ck === REMOVE) node.key = null;
				const cv = await visitAsync_("value", node.value, visitor, path);
				if (cv === BREAK) return BREAK;
				else if (cv === REMOVE) node.value = null;
			}
		}
		return ctrl;
	}
	function initVisitor(visitor) {
		if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) return Object.assign({
			Alias: visitor.Node,
			Map: visitor.Node,
			Scalar: visitor.Node,
			Seq: visitor.Node
		}, visitor.Value && {
			Map: visitor.Value,
			Scalar: visitor.Value,
			Seq: visitor.Value
		}, visitor.Collection && {
			Map: visitor.Collection,
			Seq: visitor.Collection
		}, visitor);
		return visitor;
	}
	function callVisitor(key, node, visitor, path) {
		if (typeof visitor === "function") return visitor(key, node, path);
		if (identity.isMap(node)) return visitor.Map?.(key, node, path);
		if (identity.isSeq(node)) return visitor.Seq?.(key, node, path);
		if (identity.isPair(node)) return visitor.Pair?.(key, node, path);
		if (identity.isScalar(node)) return visitor.Scalar?.(key, node, path);
		if (identity.isAlias(node)) return visitor.Alias?.(key, node, path);
	}
	function replaceNode(key, path, node) {
		const parent = path[path.length - 1];
		if (identity.isCollection(parent)) parent.items[key] = node;
		else if (identity.isPair(parent)) if (key === "key") parent.key = node;
		else parent.value = node;
		else if (identity.isDocument(parent)) parent.contents = node;
		else {
			const pt = identity.isAlias(parent) ? "alias" : "scalar";
			throw new Error(`Cannot replace node with ${pt} parent`);
		}
	}
	exports.visit = visit;
	exports.visitAsync = visitAsync;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js
var require_directives = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var visit = require_visit();
	const escapeChars = {
		"!": "%21",
		",": "%2C",
		"[": "%5B",
		"]": "%5D",
		"{": "%7B",
		"}": "%7D"
	};
	const escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
	var Directives = class Directives {
		constructor(yaml, tags) {
			/**
			* The directives-end/doc-start marker `---`. If `null`, a marker may still be
			* included in the document's stringified representation.
			*/
			this.docStart = null;
			/** The doc-end marker `...`.  */
			this.docEnd = false;
			this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
			this.tags = Object.assign({}, Directives.defaultTags, tags);
		}
		clone() {
			const copy = new Directives(this.yaml, this.tags);
			copy.docStart = this.docStart;
			return copy;
		}
		/**
		* During parsing, get a Directives instance for the current document and
		* update the stream state according to the current version's spec.
		*/
		atDocument() {
			const res = new Directives(this.yaml, this.tags);
			switch (this.yaml.version) {
				case "1.1":
					this.atNextDocument = true;
					break;
				case "1.2":
					this.atNextDocument = false;
					this.yaml = {
						explicit: Directives.defaultYaml.explicit,
						version: "1.2"
					};
					this.tags = Object.assign({}, Directives.defaultTags);
					break;
			}
			return res;
		}
		/**
		* @param onError - May be called even if the action was successful
		* @returns `true` on success
		*/
		add(line, onError) {
			if (this.atNextDocument) {
				this.yaml = {
					explicit: Directives.defaultYaml.explicit,
					version: "1.1"
				};
				this.tags = Object.assign({}, Directives.defaultTags);
				this.atNextDocument = false;
			}
			const parts = line.trim().split(/[ \t]+/);
			const name = parts.shift();
			switch (name) {
				case "%TAG": {
					if (parts.length !== 2) {
						onError(0, "%TAG directive should contain exactly two parts");
						if (parts.length < 2) return false;
					}
					const [handle, prefix] = parts;
					this.tags[handle] = prefix;
					return true;
				}
				case "%YAML": {
					this.yaml.explicit = true;
					if (parts.length !== 1) {
						onError(0, "%YAML directive should contain exactly one part");
						return false;
					}
					const [version] = parts;
					if (version === "1.1" || version === "1.2") {
						this.yaml.version = version;
						return true;
					} else {
						const isValid = /^\d+\.\d+$/.test(version);
						onError(6, `Unsupported YAML version ${version}`, isValid);
						return false;
					}
				}
				default:
					onError(0, `Unknown directive ${name}`, true);
					return false;
			}
		}
		/**
		* Resolves a tag, matching handles to those defined in %TAG directives.
		*
		* @returns Resolved tag, which may also be the non-specific tag `'!'` or a
		*   `'!local'` tag, or `null` if unresolvable.
		*/
		tagName(source, onError) {
			if (source === "!") return "!";
			if (source[0] !== "!") {
				onError(`Not a valid tag: ${source}`);
				return null;
			}
			if (source[1] === "<") {
				const verbatim = source.slice(2, -1);
				if (verbatim === "!" || verbatim === "!!") {
					onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
					return null;
				}
				if (source[source.length - 1] !== ">") onError("Verbatim tags must end with a >");
				return verbatim;
			}
			const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
			if (!suffix) onError(`The ${source} tag has no suffix`);
			const prefix = this.tags[handle];
			if (prefix) try {
				return prefix + decodeURIComponent(suffix);
			} catch (error) {
				onError(String(error));
				return null;
			}
			if (handle === "!") return source;
			onError(`Could not resolve tag: ${source}`);
			return null;
		}
		/**
		* Given a fully resolved tag, returns its printable string form,
		* taking into account current tag prefixes and defaults.
		*/
		tagString(tag) {
			for (const [handle, prefix] of Object.entries(this.tags)) if (tag.startsWith(prefix)) return handle + escapeTagName(tag.substring(prefix.length));
			return tag[0] === "!" ? tag : `!<${tag}>`;
		}
		toString(doc) {
			const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
			const tagEntries = Object.entries(this.tags);
			let tagNames;
			if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
				const tags = {};
				visit.visit(doc.contents, (_key, node) => {
					if (identity.isNode(node) && node.tag) tags[node.tag] = true;
				});
				tagNames = Object.keys(tags);
			} else tagNames = [];
			for (const [handle, prefix] of tagEntries) {
				if (handle === "!!" && prefix === "tag:yaml.org,2002:") continue;
				if (!doc || tagNames.some((tn) => tn.startsWith(prefix))) lines.push(`%TAG ${handle} ${prefix}`);
			}
			return lines.join("\n");
		}
	};
	Directives.defaultYaml = {
		explicit: false,
		version: "1.2"
	};
	Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
	exports.Directives = Directives;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js
var require_anchors = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var visit = require_visit();
	/**
	* Verify that the input string is a valid anchor.
	*
	* Will throw on errors.
	*/
	function anchorIsValid(anchor) {
		if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
			const msg = `Anchor must not contain whitespace or control characters: ${JSON.stringify(anchor)}`;
			throw new Error(msg);
		}
		return true;
	}
	function anchorNames(root) {
		const anchors = /* @__PURE__ */ new Set();
		visit.visit(root, { Value(_key, node) {
			if (node.anchor) anchors.add(node.anchor);
		} });
		return anchors;
	}
	/** Find a new anchor name with the given `prefix` and a one-indexed suffix. */
	function findNewAnchor(prefix, exclude) {
		for (let i = 1;; ++i) {
			const name = `${prefix}${i}`;
			if (!exclude.has(name)) return name;
		}
	}
	function createNodeAnchors(doc, prefix) {
		const aliasObjects = [];
		const sourceObjects = /* @__PURE__ */ new Map();
		let prevAnchors = null;
		return {
			onAnchor: (source) => {
				aliasObjects.push(source);
				prevAnchors ?? (prevAnchors = anchorNames(doc));
				const anchor = findNewAnchor(prefix, prevAnchors);
				prevAnchors.add(anchor);
				return anchor;
			},
			/**
			* With circular references, the source node is only resolved after all
			* of its child nodes are. This is why anchors are set only after all of
			* the nodes have been created.
			*/
			setAnchors: () => {
				for (const source of aliasObjects) {
					const ref = sourceObjects.get(source);
					if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) ref.node.anchor = ref.anchor;
					else {
						const error = /* @__PURE__ */ new Error("Failed to resolve repeated object (this should not happen)");
						error.source = source;
						throw error;
					}
				}
			},
			sourceObjects
		};
	}
	exports.anchorIsValid = anchorIsValid;
	exports.anchorNames = anchorNames;
	exports.createNodeAnchors = createNodeAnchors;
	exports.findNewAnchor = findNewAnchor;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Applies the JSON.parse reviver algorithm as defined in the ECMA-262 spec,
	* in section 24.5.1.1 "Runtime Semantics: InternalizeJSONProperty" of the
	* 2021 edition: https://tc39.es/ecma262/#sec-json.parse
	*
	* Includes extensions for handling Map and Set objects.
	*/
	function applyReviver(reviver, obj, key, val) {
		if (val && typeof val === "object") if (Array.isArray(val)) for (let i = 0, len = val.length; i < len; ++i) {
			const v0 = val[i];
			const v1 = applyReviver(reviver, val, String(i), v0);
			if (v1 === void 0) delete val[i];
			else if (v1 !== v0) val[i] = v1;
		}
		else if (val instanceof Map) for (const k of Array.from(val.keys())) {
			const v0 = val.get(k);
			const v1 = applyReviver(reviver, val, k, v0);
			if (v1 === void 0) val.delete(k);
			else if (v1 !== v0) val.set(k, v1);
		}
		else if (val instanceof Set) for (const v0 of Array.from(val)) {
			const v1 = applyReviver(reviver, val, v0, v0);
			if (v1 === void 0) val.delete(v0);
			else if (v1 !== v0) {
				val.delete(v0);
				val.add(v1);
			}
		}
		else for (const [k, v0] of Object.entries(val)) {
			const v1 = applyReviver(reviver, val, k, v0);
			if (v1 === void 0) delete val[k];
			else if (v1 !== v0) val[k] = v1;
		}
		return reviver.call(obj, key, val);
	}
	exports.applyReviver = applyReviver;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	/**
	* Recursively convert any node or its contents to native JavaScript
	*
	* @param value - The input value
	* @param arg - If `value` defines a `toJSON()` method, use this
	*   as its first argument
	* @param ctx - Conversion context, originally set in Document#toJS(). If
	*   `{ keep: true }` is not set, output should be suitable for JSON
	*   stringification.
	*/
	function toJS(value, arg, ctx) {
		if (Array.isArray(value)) return value.map((v, i) => toJS(v, String(i), ctx));
		if (value && typeof value.toJSON === "function") {
			if (!ctx || !identity.hasAnchor(value)) return value.toJSON(arg, ctx);
			const data = {
				aliasCount: 0,
				count: 1,
				res: void 0
			};
			ctx.anchors.set(value, data);
			ctx.onCreate = (res) => {
				data.res = res;
				delete ctx.onCreate;
			};
			const res = value.toJSON(arg, ctx);
			if (ctx.onCreate) ctx.onCreate(res);
			return res;
		}
		if (typeof value === "bigint" && !ctx?.keep) return Number(value);
		return value;
	}
	exports.toJS = toJS;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js
var require_Node = /* @__PURE__ */ __commonJSMin(((exports) => {
	var applyReviver = require_applyReviver();
	var identity = require_identity();
	var toJS = require_toJS();
	var NodeBase = class {
		constructor(type) {
			Object.defineProperty(this, identity.NODE_TYPE, { value: type });
		}
		/** Create a copy of this node.  */
		clone() {
			const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
			if (this.range) copy.range = this.range.slice();
			return copy;
		}
		/** A plain JavaScript representation of this node. */
		toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
			if (!identity.isDocument(doc)) throw new TypeError("A document argument is required");
			const ctx = {
				anchors: /* @__PURE__ */ new Map(),
				doc,
				keep: true,
				mapAsMap: mapAsMap === true,
				mapKeyWarned: false,
				maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
			};
			const res = toJS.toJS(this, "", ctx);
			if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
			return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
		}
	};
	exports.NodeBase = NodeBase;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = /* @__PURE__ */ __commonJSMin(((exports) => {
	var anchors = require_anchors();
	var visit = require_visit();
	var identity = require_identity();
	var Node = require_Node();
	var toJS = require_toJS();
	var Alias = class extends Node.NodeBase {
		constructor(source) {
			super(identity.ALIAS);
			this.source = source;
			Object.defineProperty(this, "tag", { set() {
				throw new Error("Alias nodes cannot have tags");
			} });
		}
		/**
		* Resolve the value of this alias within `doc`, finding the last
		* instance of the `source` anchor before this node.
		*/
		resolve(doc, ctx) {
			if (ctx?.maxAliasCount === 0) throw new ReferenceError("Alias resolution is disabled");
			let nodes;
			if (ctx?.aliasResolveCache) nodes = ctx.aliasResolveCache;
			else {
				nodes = [];
				visit.visit(doc, { Node: (_key, node) => {
					if (identity.isAlias(node) || identity.hasAnchor(node)) nodes.push(node);
				} });
				if (ctx) ctx.aliasResolveCache = nodes;
			}
			let found = void 0;
			for (const node of nodes) {
				if (node === this) break;
				if (node.anchor === this.source) found = node;
			}
			if (found && ctx) {
				const { anchors, doc, maxAliasCount } = ctx;
				let data = anchors.get(found);
				if (!data) {
					toJS.toJS(found, null, ctx);
					data = anchors.get(found);
				}
				/* istanbul ignore if */
				if (data?.res === void 0) throw new ReferenceError("This should not happen: Alias anchor was not resolved?");
				if (maxAliasCount >= 0) {
					data.count += 1;
					if (data.aliasCount === 0) data.aliasCount = getAliasCount(doc, found, anchors);
					if (data.count * data.aliasCount > maxAliasCount) throw new ReferenceError("Excessive alias count indicates a resource exhaustion attack");
				}
			}
			return found;
		}
		toJSON(_arg, ctx) {
			if (!ctx) return { source: this.source };
			const source = this.resolve(ctx.doc, ctx);
			if (!source) {
				const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
				throw new ReferenceError(msg);
			}
			return ctx.anchors.get(source).res;
		}
		toString(ctx, _onComment, _onChompKeep) {
			const src = `*${this.source}`;
			if (ctx) {
				anchors.anchorIsValid(this.source);
				if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
					const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
					throw new Error(msg);
				}
				if (ctx.implicitKey) return `${src} `;
			}
			return src;
		}
	};
	function getAliasCount(doc, node, anchors) {
		if (identity.isAlias(node)) {
			const source = node.resolve(doc);
			const anchor = anchors && source && anchors.get(source);
			return anchor ? anchor.count * anchor.aliasCount : 0;
		} else if (identity.isCollection(node)) {
			let count = 0;
			for (const item of node.items) {
				const c = getAliasCount(doc, item, anchors);
				if (c > count) count = c;
			}
			return count;
		} else if (identity.isPair(node)) {
			const kc = getAliasCount(doc, node.key, anchors);
			const vc = getAliasCount(doc, node.value, anchors);
			return Math.max(kc, vc);
		}
		return 1;
	}
	exports.Alias = Alias;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Node = require_Node();
	var toJS = require_toJS();
	const isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
	var Scalar = class extends Node.NodeBase {
		constructor(value) {
			super(identity.SCALAR);
			this.value = value;
		}
		toJSON(arg, ctx) {
			return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
		}
		toString() {
			return String(this.value);
		}
	};
	Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
	Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
	Scalar.PLAIN = "PLAIN";
	Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
	Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
	exports.Scalar = Scalar;
	exports.isScalarValue = isScalarValue;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js
var require_createNode = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Alias = require_Alias();
	var identity = require_identity();
	var Scalar = require_Scalar();
	const defaultTagPrefix = "tag:yaml.org,2002:";
	function findTagObject(value, tagName, tags) {
		if (tagName) {
			const match = tags.filter((t) => t.tag === tagName);
			const tagObj = match.find((t) => !t.format) ?? match[0];
			if (!tagObj) throw new Error(`Tag ${tagName} not found`);
			return tagObj;
		}
		return tags.find((t) => t.identify?.(value) && !t.format);
	}
	function createNode(value, tagName, ctx) {
		if (identity.isDocument(value)) value = value.contents;
		if (identity.isNode(value)) return value;
		if (identity.isPair(value)) {
			const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
			map.items.push(value);
			return map;
		}
		if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) value = value.valueOf();
		const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
		let ref = void 0;
		if (aliasDuplicateObjects && value && typeof value === "object") {
			ref = sourceObjects.get(value);
			if (ref) {
				ref.anchor ?? (ref.anchor = onAnchor(value));
				return new Alias.Alias(ref.anchor);
			} else {
				ref = {
					anchor: null,
					node: null
				};
				sourceObjects.set(value, ref);
			}
		}
		if (tagName?.startsWith("!!")) tagName = defaultTagPrefix + tagName.slice(2);
		let tagObj = findTagObject(value, tagName, schema.tags);
		if (!tagObj) {
			if (value && typeof value.toJSON === "function") value = value.toJSON();
			if (!value || typeof value !== "object") {
				const node = new Scalar.Scalar(value);
				if (ref) ref.node = node;
				return node;
			}
			tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
		}
		if (onTagObj) {
			onTagObj(tagObj);
			delete ctx.onTagObj;
		}
		const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
		if (tagName) node.tag = tagName;
		else if (!tagObj.default) node.tag = tagObj.tag;
		if (ref) ref.node = node;
		return node;
	}
	exports.createNode = createNode;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = /* @__PURE__ */ __commonJSMin(((exports) => {
	var createNode = require_createNode();
	var identity = require_identity();
	var Node = require_Node();
	function collectionFromPath(schema, path, value) {
		let v = value;
		for (let i = path.length - 1; i >= 0; --i) {
			const k = path[i];
			if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
				const a = [];
				a[k] = v;
				v = a;
			} else v = /* @__PURE__ */ new Map([[k, v]]);
		}
		return createNode.createNode(v, void 0, {
			aliasDuplicateObjects: false,
			keepUndefined: false,
			onAnchor: () => {
				throw new Error("This should not happen, please report a bug.");
			},
			schema,
			sourceObjects: /* @__PURE__ */ new Map()
		});
	}
	const isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
	var Collection = class extends Node.NodeBase {
		constructor(type, schema) {
			super(type);
			Object.defineProperty(this, "schema", {
				value: schema,
				configurable: true,
				enumerable: false,
				writable: true
			});
		}
		/**
		* Create a copy of this collection.
		*
		* @param schema - If defined, overwrites the original's schema
		*/
		clone(schema) {
			const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
			if (schema) copy.schema = schema;
			copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
			if (this.range) copy.range = this.range.slice();
			return copy;
		}
		/**
		* Adds a value to the collection. For `!!map` and `!!omap` the value must
		* be a Pair instance or a `{ key, value }` object, which may not have a key
		* that already exists in the map.
		*/
		addIn(path, value) {
			if (isEmptyPath(path)) this.add(value);
			else {
				const [key, ...rest] = path;
				const node = this.get(key, true);
				if (identity.isCollection(node)) node.addIn(rest, value);
				else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
				else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
			}
		}
		/**
		* Removes a value from the collection.
		* @returns `true` if the item was found and removed.
		*/
		deleteIn(path) {
			const [key, ...rest] = path;
			if (rest.length === 0) return this.delete(key);
			const node = this.get(key, true);
			if (identity.isCollection(node)) return node.deleteIn(rest);
			else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
		}
		/**
		* Returns item at `key`, or `undefined` if not found. By default unwraps
		* scalar values from their surrounding node; to disable set `keepScalar` to
		* `true` (collections are always returned intact).
		*/
		getIn(path, keepScalar) {
			const [key, ...rest] = path;
			const node = this.get(key, true);
			if (rest.length === 0) return !keepScalar && identity.isScalar(node) ? node.value : node;
			else return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
		}
		hasAllNullValues(allowScalar) {
			return this.items.every((node) => {
				if (!identity.isPair(node)) return false;
				const n = node.value;
				return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
			});
		}
		/**
		* Checks if the collection includes a value with the key `key`.
		*/
		hasIn(path) {
			const [key, ...rest] = path;
			if (rest.length === 0) return this.has(key);
			const node = this.get(key, true);
			return identity.isCollection(node) ? node.hasIn(rest) : false;
		}
		/**
		* Sets a value in this collection. For `!!set`, `value` needs to be a
		* boolean to add/remove the item from the set.
		*/
		setIn(path, value) {
			const [key, ...rest] = path;
			if (rest.length === 0) this.set(key, value);
			else {
				const node = this.get(key, true);
				if (identity.isCollection(node)) node.setIn(rest, value);
				else if (node === void 0 && this.schema) this.set(key, collectionFromPath(this.schema, rest, value));
				else throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
			}
		}
	};
	exports.Collection = Collection;
	exports.collectionFromPath = collectionFromPath;
	exports.isEmptyPath = isEmptyPath;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Stringifies a comment.
	*
	* Empty comment lines are left empty,
	* lines consisting of a single space are replaced by `#`,
	* and all other lines are prefixed with a `#`.
	*/
	const stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
	function indentComment(comment, indent) {
		if (/^\n+$/.test(comment)) return comment.substring(1);
		return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
	}
	const lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
	exports.indentComment = indentComment;
	exports.lineComment = lineComment;
	exports.stringifyComment = stringifyComment;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = /* @__PURE__ */ __commonJSMin(((exports) => {
	const FOLD_FLOW = "flow";
	const FOLD_BLOCK = "block";
	const FOLD_QUOTED = "quoted";
	/**
	* Tries to keep input at up to `lineWidth` characters, splitting only on spaces
	* not followed by newlines or spaces unless `mode` is `'quoted'`. Lines are
	* terminated with `\n` and started with `indent`.
	*/
	function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
		if (!lineWidth || lineWidth < 0) return text;
		if (lineWidth < minContentWidth) minContentWidth = 0;
		const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
		if (text.length <= endStep) return text;
		const folds = [];
		const escapedFolds = {};
		let end = lineWidth - indent.length;
		if (typeof indentAtStart === "number") if (indentAtStart > lineWidth - Math.max(2, minContentWidth)) folds.push(0);
		else end = lineWidth - indentAtStart;
		let split = void 0;
		let prev = void 0;
		let overflow = false;
		let i = -1;
		let escStart = -1;
		let escEnd = -1;
		if (mode === FOLD_BLOCK) {
			i = consumeMoreIndentedLines(text, i, indent.length);
			if (i !== -1) end = i + endStep;
		}
		for (let ch; ch = text[i += 1];) {
			if (mode === FOLD_QUOTED && ch === "\\") {
				escStart = i;
				switch (text[i + 1]) {
					case "x":
						i += 3;
						break;
					case "u":
						i += 5;
						break;
					case "U":
						i += 9;
						break;
					default: i += 1;
				}
				escEnd = i;
			}
			if (ch === "\n") {
				if (mode === FOLD_BLOCK) i = consumeMoreIndentedLines(text, i, indent.length);
				end = i + indent.length + endStep;
				split = void 0;
			} else {
				if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
					const next = text[i + 1];
					if (next && next !== " " && next !== "\n" && next !== "	") split = i;
				}
				if (i >= end) if (split) {
					folds.push(split);
					end = split + endStep;
					split = void 0;
				} else if (mode === FOLD_QUOTED) {
					while (prev === " " || prev === "	") {
						prev = ch;
						ch = text[i += 1];
						overflow = true;
					}
					const j = i > escEnd + 1 ? i - 2 : escStart - 1;
					if (escapedFolds[j]) return text;
					folds.push(j);
					escapedFolds[j] = true;
					end = j + endStep;
					split = void 0;
				} else overflow = true;
			}
			prev = ch;
		}
		if (overflow && onOverflow) onOverflow();
		if (folds.length === 0) return text;
		if (onFold) onFold();
		let res = text.slice(0, folds[0]);
		for (let i = 0; i < folds.length; ++i) {
			const fold = folds[i];
			const end = folds[i + 1] || text.length;
			if (fold === 0) res = `\n${indent}${text.slice(0, end)}`;
			else {
				if (mode === FOLD_QUOTED && escapedFolds[fold]) res += `${text[fold]}\\`;
				res += `\n${indent}${text.slice(fold + 1, end)}`;
			}
		}
		return res;
	}
	/**
	* Presumes `i + 1` is at the start of a line
	* @returns index of last newline in more-indented block
	*/
	function consumeMoreIndentedLines(text, i, indent) {
		let end = i;
		let start = i + 1;
		let ch = text[start];
		while (ch === " " || ch === "	") if (i < start + indent) ch = text[++i];
		else {
			do
				ch = text[++i];
			while (ch && ch !== "\n");
			end = i;
			start = i + 1;
			ch = text[start];
		}
		return end;
	}
	exports.FOLD_BLOCK = FOLD_BLOCK;
	exports.FOLD_FLOW = FOLD_FLOW;
	exports.FOLD_QUOTED = FOLD_QUOTED;
	exports.foldFlowLines = foldFlowLines;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	var foldFlowLines = require_foldFlowLines();
	const getFoldOptions = (ctx, isBlock) => ({
		indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
		lineWidth: ctx.options.lineWidth,
		minContentWidth: ctx.options.minContentWidth
	});
	const containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
	function lineLengthOverLimit(str, lineWidth, indentLength) {
		if (!lineWidth || lineWidth < 0) return false;
		const limit = lineWidth - indentLength;
		const strLen = str.length;
		if (strLen <= limit) return false;
		for (let i = 0, start = 0; i < strLen; ++i) if (str[i] === "\n") {
			if (i - start > limit) return true;
			start = i + 1;
			if (strLen - start <= limit) return false;
		}
		return true;
	}
	function doubleQuotedString(value, ctx) {
		const json = JSON.stringify(value);
		if (ctx.options.doubleQuotedAsJSON) return json;
		const { implicitKey } = ctx;
		const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
		const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
		let str = "";
		let start = 0;
		for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
			if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
				str += json.slice(start, i) + "\\ ";
				i += 1;
				start = i;
				ch = "\\";
			}
			if (ch === "\\") switch (json[i + 1]) {
				case "u":
					{
						str += json.slice(start, i);
						const code = json.substr(i + 2, 4);
						switch (code) {
							case "0000":
								str += "\\0";
								break;
							case "0007":
								str += "\\a";
								break;
							case "000b":
								str += "\\v";
								break;
							case "001b":
								str += "\\e";
								break;
							case "0085":
								str += "\\N";
								break;
							case "00a0":
								str += "\\_";
								break;
							case "2028":
								str += "\\L";
								break;
							case "2029":
								str += "\\P";
								break;
							default: if (code.substr(0, 2) === "00") str += "\\x" + code.substr(2);
							else str += json.substr(i, 6);
						}
						i += 5;
						start = i + 1;
					}
					break;
				case "n":
					if (implicitKey || json[i + 2] === "\"" || json.length < minMultiLineLength) i += 1;
					else {
						str += json.slice(start, i) + "\n\n";
						while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== "\"") {
							str += "\n";
							i += 2;
						}
						str += indent;
						if (json[i + 2] === " ") str += "\\";
						i += 1;
						start = i + 1;
					}
					break;
				default: i += 1;
			}
		}
		str = start ? str + json.slice(start) : json;
		return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
	}
	function singleQuotedString(value, ctx) {
		if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value)) return doubleQuotedString(value, ctx);
		const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
		const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&\n${indent}`) + "'";
		return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
	}
	function quotedString(value, ctx) {
		const { singleQuote } = ctx.options;
		let qs;
		if (singleQuote === false) qs = doubleQuotedString;
		else {
			const hasDouble = value.includes("\"");
			const hasSingle = value.includes("'");
			if (hasDouble && !hasSingle) qs = singleQuotedString;
			else if (hasSingle && !hasDouble) qs = doubleQuotedString;
			else qs = singleQuote ? singleQuotedString : doubleQuotedString;
		}
		return qs(value, ctx);
	}
	let blockEndNewlines;
	try {
		blockEndNewlines = /* @__PURE__ */ new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
	} catch {
		blockEndNewlines = /\n+(?!\n|$)/g;
	}
	function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
		const { blockQuote, commentString, lineWidth } = ctx.options;
		if (!blockQuote || /\n[\t ]+$/.test(value)) return quotedString(value, ctx);
		const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
		const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
		if (!value) return literal ? "|\n" : ">\n";
		let chomp;
		let endStart;
		for (endStart = value.length; endStart > 0; --endStart) {
			const ch = value[endStart - 1];
			if (ch !== "\n" && ch !== "	" && ch !== " ") break;
		}
		let end = value.substring(endStart);
		const endNlPos = end.indexOf("\n");
		if (endNlPos === -1) chomp = "-";
		else if (value === end || endNlPos !== end.length - 1) {
			chomp = "+";
			if (onChompKeep) onChompKeep();
		} else chomp = "";
		if (end) {
			value = value.slice(0, -end.length);
			if (end[end.length - 1] === "\n") end = end.slice(0, -1);
			end = end.replace(blockEndNewlines, `$&${indent}`);
		}
		let startWithSpace = false;
		let startEnd;
		let startNlPos = -1;
		for (startEnd = 0; startEnd < value.length; ++startEnd) {
			const ch = value[startEnd];
			if (ch === " ") startWithSpace = true;
			else if (ch === "\n") startNlPos = startEnd;
			else break;
		}
		let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
		if (start) {
			value = value.substring(start.length);
			start = start.replace(/\n+/g, `$&${indent}`);
		}
		let header = (startWithSpace ? indent ? "2" : "1" : "") + chomp;
		if (comment) {
			header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
			if (onComment) onComment();
		}
		if (!literal) {
			const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
			let literalFallback = false;
			const foldOptions = getFoldOptions(ctx, true);
			if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) foldOptions.onOverflow = () => {
				literalFallback = true;
			};
			const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
			if (!literalFallback) return `>${header}\n${indent}${body}`;
		}
		value = value.replace(/\n+/g, `$&${indent}`);
		return `|${header}\n${indent}${start}${value}${end}`;
	}
	function plainString(item, ctx, onComment, onChompKeep) {
		const { type, value } = item;
		const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
		if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) return quotedString(value, ctx);
		if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
		if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) return blockString(item, ctx, onComment, onChompKeep);
		if (containsDocumentMarker(value)) {
			if (indent === "") {
				ctx.forceBlockIndent = true;
				return blockString(item, ctx, onComment, onChompKeep);
			} else if (implicitKey && indent === indentStep) return quotedString(value, ctx);
		}
		const str = value.replace(/\n+/g, `$&\n${indent}`);
		if (actualString) {
			const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
			const { compat, tags } = ctx.doc.schema;
			if (tags.some(test) || compat?.some(test)) return quotedString(value, ctx);
		}
		return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
	}
	function stringifyString(item, ctx, onComment, onChompKeep) {
		const { implicitKey, inFlow } = ctx;
		const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
		let { type } = item;
		if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
			if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value)) type = Scalar.Scalar.QUOTE_DOUBLE;
		}
		const _stringify = (_type) => {
			switch (_type) {
				case Scalar.Scalar.BLOCK_FOLDED:
				case Scalar.Scalar.BLOCK_LITERAL: return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
				case Scalar.Scalar.QUOTE_DOUBLE: return doubleQuotedString(ss.value, ctx);
				case Scalar.Scalar.QUOTE_SINGLE: return singleQuotedString(ss.value, ctx);
				case Scalar.Scalar.PLAIN: return plainString(ss, ctx, onComment, onChompKeep);
				default: return null;
			}
		};
		let res = _stringify(type);
		if (res === null) {
			const { defaultKeyType, defaultStringType } = ctx.options;
			const t = implicitKey && defaultKeyType || defaultStringType;
			res = _stringify(t);
			if (res === null) throw new Error(`Unsupported default string type ${t}`);
		}
		return res;
	}
	exports.stringifyString = stringifyString;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = /* @__PURE__ */ __commonJSMin(((exports) => {
	var anchors = require_anchors();
	var identity = require_identity();
	var stringifyComment = require_stringifyComment();
	var stringifyString = require_stringifyString();
	function createStringifyContext(doc, options) {
		const opt = Object.assign({
			blockQuote: true,
			commentString: stringifyComment.stringifyComment,
			defaultKeyType: null,
			defaultStringType: "PLAIN",
			directives: null,
			doubleQuotedAsJSON: false,
			doubleQuotedMinMultiLineLength: 40,
			falseStr: "false",
			flowCollectionPadding: true,
			indentSeq: true,
			lineWidth: 80,
			minContentWidth: 20,
			nullStr: "null",
			simpleKeys: false,
			singleQuote: null,
			trailingComma: false,
			trueStr: "true",
			verifyAliasOrder: true
		}, doc.schema.toStringOptions, options);
		let inFlow;
		switch (opt.collectionStyle) {
			case "block":
				inFlow = false;
				break;
			case "flow":
				inFlow = true;
				break;
			default: inFlow = null;
		}
		return {
			anchors: /* @__PURE__ */ new Set(),
			doc,
			flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
			indent: "",
			indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
			inFlow,
			options: opt
		};
	}
	function getTagObject(tags, item) {
		if (item.tag) {
			const match = tags.filter((t) => t.tag === item.tag);
			if (match.length > 0) return match.find((t) => t.format === item.format) ?? match[0];
		}
		let tagObj = void 0;
		let obj;
		if (identity.isScalar(item)) {
			obj = item.value;
			let match = tags.filter((t) => t.identify?.(obj));
			if (match.length > 1) {
				const testMatch = match.filter((t) => t.test);
				if (testMatch.length > 0) match = testMatch;
			}
			tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
		} else {
			obj = item;
			tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
		}
		if (!tagObj) {
			const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
			throw new Error(`Tag not resolved for ${name} value`);
		}
		return tagObj;
	}
	function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
		if (!doc.directives) return "";
		const props = [];
		const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
		if (anchor && anchors.anchorIsValid(anchor)) {
			anchors$1.add(anchor);
			props.push(`&${anchor}`);
		}
		const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
		if (tag) props.push(doc.directives.tagString(tag));
		return props.join(" ");
	}
	function stringify(item, ctx, onComment, onChompKeep) {
		if (identity.isPair(item)) return item.toString(ctx, onComment, onChompKeep);
		if (identity.isAlias(item)) {
			if (ctx.doc.directives) return item.toString(ctx);
			if (ctx.resolvedAliases?.has(item)) throw new TypeError(`Cannot stringify circular structure without alias nodes`);
			else {
				if (ctx.resolvedAliases) ctx.resolvedAliases.add(item);
				else ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
				item = item.resolve(ctx.doc);
			}
		}
		let tagObj = void 0;
		const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
		tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
		const props = stringifyProps(node, tagObj, ctx);
		if (props.length > 0) ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
		const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
		if (!props) return str;
		return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}\n${ctx.indent}${str}`;
	}
	exports.createStringifyContext = createStringifyContext;
	exports.stringify = stringify;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Scalar = require_Scalar();
	var stringify = require_stringify();
	var stringifyComment = require_stringifyComment();
	function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
		const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
		let keyComment = identity.isNode(key) && key.comment || null;
		if (simpleKeys) {
			if (keyComment) throw new Error("With simple keys, key nodes cannot have comments");
			if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") throw new Error("With simple keys, collection cannot be used as a key value");
		}
		let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
		ctx = Object.assign({}, ctx, {
			allNullValues: false,
			implicitKey: !explicitKey && (simpleKeys || !allNullValues),
			indent: indent + indentStep
		});
		let keyCommentDone = false;
		let chompKeep = false;
		let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
		if (!explicitKey && !ctx.inFlow && str.length > 1024) {
			if (simpleKeys) throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
			explicitKey = true;
		}
		if (ctx.inFlow) {
			if (allNullValues || value == null) {
				if (keyCommentDone && onComment) onComment();
				return str === "" ? "?" : explicitKey ? `? ${str}` : str;
			}
		} else if (allNullValues && !simpleKeys || value == null && explicitKey) {
			str = `? ${str}`;
			if (keyComment && !keyCommentDone) str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
			else if (chompKeep && onChompKeep) onChompKeep();
			return str;
		}
		if (keyCommentDone) keyComment = null;
		if (explicitKey) {
			if (keyComment) str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
			str = `? ${str}\n${indent}:`;
		} else {
			str = `${str}:`;
			if (keyComment) str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
		}
		let vsb, vcb, valueComment;
		if (identity.isNode(value)) {
			vsb = !!value.spaceBefore;
			vcb = value.commentBefore;
			valueComment = value.comment;
		} else {
			vsb = false;
			vcb = null;
			valueComment = null;
			if (value && typeof value === "object") value = doc.createNode(value);
		}
		ctx.implicitKey = false;
		if (!explicitKey && !keyComment && identity.isScalar(value)) ctx.indentAtStart = str.length + 1;
		chompKeep = false;
		if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) ctx.indent = ctx.indent.substring(2);
		let valueCommentDone = false;
		const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
		let ws = " ";
		if (keyComment || vsb || vcb) {
			ws = vsb ? "\n" : "";
			if (vcb) {
				const cs = commentString(vcb);
				ws += `\n${stringifyComment.indentComment(cs, ctx.indent)}`;
			}
			if (valueStr === "" && !ctx.inFlow) {
				if (ws === "\n" && valueComment) ws = "\n\n";
			} else ws += `\n${ctx.indent}`;
		} else if (!explicitKey && identity.isCollection(value)) {
			const vs0 = valueStr[0];
			const nl0 = valueStr.indexOf("\n");
			const hasNewline = nl0 !== -1;
			const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
			if (hasNewline || !flow) {
				let hasPropsLine = false;
				if (hasNewline && (vs0 === "&" || vs0 === "!")) {
					let sp0 = valueStr.indexOf(" ");
					if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") sp0 = valueStr.indexOf(" ", sp0 + 1);
					if (sp0 === -1 || nl0 < sp0) hasPropsLine = true;
				}
				if (!hasPropsLine) ws = `\n${ctx.indent}`;
			}
		} else if (valueStr === "" || valueStr[0] === "\n") ws = "";
		str += ws + valueStr;
		if (ctx.inFlow) {
			if (valueCommentDone && onComment) onComment();
		} else if (valueComment && !valueCommentDone) str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
		else if (chompKeep && onChompKeep) onChompKeep();
		return str;
	}
	exports.stringifyPair = stringifyPair;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/log.js
var require_log = /* @__PURE__ */ __commonJSMin(((exports) => {
	var node_process$2 = __require("process");
	function debug(logLevel, ...messages) {
		if (logLevel === "debug") console.log(...messages);
	}
	function warn(logLevel, warning) {
		if (logLevel === "debug" || logLevel === "warn") if (typeof node_process$2.emitWarning === "function") node_process$2.emitWarning(warning);
		else console.warn(warning);
	}
	exports.debug = debug;
	exports.warn = warn;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Scalar = require_Scalar();
	const MERGE_KEY = "<<";
	const merge = {
		identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
		default: "key",
		tag: "tag:yaml.org,2002:merge",
		test: /^<<$/,
		resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), { addToJSMap: addMergeToJSMap }),
		stringify: () => MERGE_KEY
	};
	const isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
	function addMergeToJSMap(ctx, map, value) {
		const source = resolveAliasValue(ctx, value);
		if (identity.isSeq(source)) for (const it of source.items) mergeValue(ctx, map, it);
		else if (Array.isArray(source)) for (const it of source) mergeValue(ctx, map, it);
		else mergeValue(ctx, map, source);
	}
	function mergeValue(ctx, map, value) {
		const source = resolveAliasValue(ctx, value);
		if (!identity.isMap(source)) throw new Error("Merge sources must be maps or map aliases");
		const srcMap = source.toJSON(null, ctx, Map);
		for (const [key, value] of srcMap) if (map instanceof Map) {
			if (!map.has(key)) map.set(key, value);
		} else if (map instanceof Set) map.add(key);
		else if (!Object.prototype.hasOwnProperty.call(map, key)) Object.defineProperty(map, key, {
			value,
			writable: true,
			enumerable: true,
			configurable: true
		});
		return map;
	}
	function resolveAliasValue(ctx, value) {
		return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
	}
	exports.addMergeToJSMap = addMergeToJSMap;
	exports.isMergeKey = isMergeKey;
	exports.merge = merge;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = /* @__PURE__ */ __commonJSMin(((exports) => {
	var log = require_log();
	var merge = require_merge();
	var stringify = require_stringify();
	var identity = require_identity();
	var toJS = require_toJS();
	function addPairToJSMap(ctx, map, { key, value }) {
		if (identity.isNode(key) && key.addToJSMap) key.addToJSMap(ctx, map, value);
		else if (merge.isMergeKey(ctx, key)) merge.addMergeToJSMap(ctx, map, value);
		else {
			const jsKey = toJS.toJS(key, "", ctx);
			if (map instanceof Map) map.set(jsKey, toJS.toJS(value, jsKey, ctx));
			else if (map instanceof Set) map.add(jsKey);
			else {
				const stringKey = stringifyKey(key, jsKey, ctx);
				const jsValue = toJS.toJS(value, stringKey, ctx);
				if (stringKey in map) Object.defineProperty(map, stringKey, {
					value: jsValue,
					writable: true,
					enumerable: true,
					configurable: true
				});
				else map[stringKey] = jsValue;
			}
		}
		return map;
	}
	function stringifyKey(key, jsKey, ctx) {
		if (jsKey === null) return "";
		if (typeof jsKey !== "object") return String(jsKey);
		if (identity.isNode(key) && ctx?.doc) {
			const strCtx = stringify.createStringifyContext(ctx.doc, {});
			strCtx.anchors = /* @__PURE__ */ new Set();
			for (const node of ctx.anchors.keys()) strCtx.anchors.add(node.anchor);
			strCtx.inFlow = true;
			strCtx.inStringifyKey = true;
			const strKey = key.toString(strCtx);
			if (!ctx.mapKeyWarned) {
				let jsonStr = JSON.stringify(strKey);
				if (jsonStr.length > 40) jsonStr = jsonStr.substring(0, 36) + "...\"";
				log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
				ctx.mapKeyWarned = true;
			}
			return strKey;
		}
		return JSON.stringify(jsKey);
	}
	exports.addPairToJSMap = addPairToJSMap;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = /* @__PURE__ */ __commonJSMin(((exports) => {
	var createNode = require_createNode();
	var stringifyPair = require_stringifyPair();
	var addPairToJSMap = require_addPairToJSMap();
	var identity = require_identity();
	function createPair(key, value, ctx) {
		return new Pair(createNode.createNode(key, void 0, ctx), createNode.createNode(value, void 0, ctx));
	}
	var Pair = class Pair {
		constructor(key, value = null) {
			Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
			this.key = key;
			this.value = value;
		}
		clone(schema) {
			let { key, value } = this;
			if (identity.isNode(key)) key = key.clone(schema);
			if (identity.isNode(value)) value = value.clone(schema);
			return new Pair(key, value);
		}
		toJSON(_, ctx) {
			const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
			return addPairToJSMap.addPairToJSMap(ctx, pair, this);
		}
		toString(ctx, onComment, onChompKeep) {
			return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
		}
	};
	exports.Pair = Pair;
	exports.createPair = createPair;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var stringify = require_stringify();
	var stringifyComment = require_stringifyComment();
	function stringifyCollection(collection, ctx, options) {
		return (ctx.inFlow ?? collection.flow ? stringifyFlowCollection : stringifyBlockCollection)(collection, ctx, options);
	}
	function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
		const { indent, options: { commentString } } = ctx;
		const itemCtx = Object.assign({}, ctx, {
			indent: itemIndent,
			type: null
		});
		let chompKeep = false;
		const lines = [];
		for (let i = 0; i < items.length; ++i) {
			const item = items[i];
			let comment = null;
			if (identity.isNode(item)) {
				if (!chompKeep && item.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
				if (item.comment) comment = item.comment;
			} else if (identity.isPair(item)) {
				const ik = identity.isNode(item.key) ? item.key : null;
				if (ik) {
					if (!chompKeep && ik.spaceBefore) lines.push("");
					addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
				}
			}
			chompKeep = false;
			let str = stringify.stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
			if (comment) str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
			if (chompKeep && comment) chompKeep = false;
			lines.push(blockItemPrefix + str);
		}
		let str;
		if (lines.length === 0) str = flowChars.start + flowChars.end;
		else {
			str = lines[0];
			for (let i = 1; i < lines.length; ++i) {
				const line = lines[i];
				str += line ? `\n${indent}${line}` : "\n";
			}
		}
		if (comment) {
			str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
			if (onComment) onComment();
		} else if (chompKeep && onChompKeep) onChompKeep();
		return str;
	}
	function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
		const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
		itemIndent += indentStep;
		const itemCtx = Object.assign({}, ctx, {
			indent: itemIndent,
			inFlow: true,
			type: null
		});
		let reqNewline = false;
		let linesAtValue = 0;
		const lines = [];
		for (let i = 0; i < items.length; ++i) {
			const item = items[i];
			let comment = null;
			if (identity.isNode(item)) {
				if (item.spaceBefore) lines.push("");
				addCommentBefore(ctx, lines, item.commentBefore, false);
				if (item.comment) comment = item.comment;
			} else if (identity.isPair(item)) {
				const ik = identity.isNode(item.key) ? item.key : null;
				if (ik) {
					if (ik.spaceBefore) lines.push("");
					addCommentBefore(ctx, lines, ik.commentBefore, false);
					if (ik.comment) reqNewline = true;
				}
				const iv = identity.isNode(item.value) ? item.value : null;
				if (iv) {
					if (iv.comment) comment = iv.comment;
					if (iv.commentBefore) reqNewline = true;
				} else if (item.value == null && ik?.comment) comment = ik.comment;
			}
			if (comment) reqNewline = true;
			let str = stringify.stringify(item, itemCtx, () => comment = null);
			reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
			if (i < items.length - 1) str += ",";
			else if (ctx.options.trailingComma) {
				if (ctx.options.lineWidth > 0) reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
				if (reqNewline) str += ",";
			}
			if (comment) str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
			lines.push(str);
			linesAtValue = lines.length;
		}
		const { start, end } = flowChars;
		if (lines.length === 0) return start + end;
		else {
			if (!reqNewline) {
				const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
				reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
			}
			if (reqNewline) {
				let str = start;
				for (const line of lines) str += line ? `\n${indentStep}${indent}${line}` : "\n";
				return `${str}\n${indent}${end}`;
			} else return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
		}
	}
	function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
		if (comment && chompKeep) comment = comment.replace(/^\n+/, "");
		if (comment) {
			const ic = stringifyComment.indentComment(commentString(comment), indent);
			lines.push(ic.trimStart());
		}
	}
	exports.stringifyCollection = stringifyCollection;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = /* @__PURE__ */ __commonJSMin(((exports) => {
	var stringifyCollection = require_stringifyCollection();
	var addPairToJSMap = require_addPairToJSMap();
	var Collection = require_Collection();
	var identity = require_identity();
	var Pair = require_Pair();
	var Scalar = require_Scalar();
	function findPair(items, key) {
		const k = identity.isScalar(key) ? key.value : key;
		for (const it of items) if (identity.isPair(it)) {
			if (it.key === key || it.key === k) return it;
			if (identity.isScalar(it.key) && it.key.value === k) return it;
		}
	}
	var YAMLMap = class extends Collection.Collection {
		static get tagName() {
			return "tag:yaml.org,2002:map";
		}
		constructor(schema) {
			super(identity.MAP, schema);
			this.items = [];
		}
		/**
		* A generic collection parsing method that can be extended
		* to other node classes that inherit from YAMLMap
		*/
		static from(schema, obj, ctx) {
			const { keepUndefined, replacer } = ctx;
			const map = new this(schema);
			const add = (key, value) => {
				if (typeof replacer === "function") value = replacer.call(obj, key, value);
				else if (Array.isArray(replacer) && !replacer.includes(key)) return;
				if (value !== void 0 || keepUndefined) map.items.push(Pair.createPair(key, value, ctx));
			};
			if (obj instanceof Map) for (const [key, value] of obj) add(key, value);
			else if (obj && typeof obj === "object") for (const key of Object.keys(obj)) add(key, obj[key]);
			if (typeof schema.sortMapEntries === "function") map.items.sort(schema.sortMapEntries);
			return map;
		}
		/**
		* Adds a value to the collection.
		*
		* @param overwrite - If not set `true`, using a key that is already in the
		*   collection will throw. Otherwise, overwrites the previous value.
		*/
		add(pair, overwrite) {
			let _pair;
			if (identity.isPair(pair)) _pair = pair;
			else if (!pair || typeof pair !== "object" || !("key" in pair)) _pair = new Pair.Pair(pair, pair?.value);
			else _pair = new Pair.Pair(pair.key, pair.value);
			const prev = findPair(this.items, _pair.key);
			const sortEntries = this.schema?.sortMapEntries;
			if (prev) {
				if (!overwrite) throw new Error(`Key ${_pair.key} already set`);
				if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value)) prev.value.value = _pair.value;
				else prev.value = _pair.value;
			} else if (sortEntries) {
				const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
				if (i === -1) this.items.push(_pair);
				else this.items.splice(i, 0, _pair);
			} else this.items.push(_pair);
		}
		delete(key) {
			const it = findPair(this.items, key);
			if (!it) return false;
			return this.items.splice(this.items.indexOf(it), 1).length > 0;
		}
		get(key, keepScalar) {
			const node = findPair(this.items, key)?.value;
			return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
		}
		has(key) {
			return !!findPair(this.items, key);
		}
		set(key, value) {
			this.add(new Pair.Pair(key, value), true);
		}
		/**
		* @param ctx - Conversion context, originally set in Document#toJS()
		* @param {Class} Type - If set, forces the returned collection type
		* @returns Instance of Type, Map, or Object
		*/
		toJSON(_, ctx, Type) {
			const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
			if (ctx?.onCreate) ctx.onCreate(map);
			for (const item of this.items) addPairToJSMap.addPairToJSMap(ctx, map, item);
			return map;
		}
		toString(ctx, onComment, onChompKeep) {
			if (!ctx) return JSON.stringify(this);
			for (const item of this.items) if (!identity.isPair(item)) throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
			if (!ctx.allNullValues && this.hasAllNullValues(false)) ctx = Object.assign({}, ctx, { allNullValues: true });
			return stringifyCollection.stringifyCollection(this, ctx, {
				blockItemPrefix: "",
				flowChars: {
					start: "{",
					end: "}"
				},
				itemIndent: ctx.indent || "",
				onChompKeep,
				onComment
			});
		}
	};
	exports.YAMLMap = YAMLMap;
	exports.findPair = findPair;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js
var require_map = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var YAMLMap = require_YAMLMap();
	exports.map = {
		collection: "map",
		default: true,
		nodeClass: YAMLMap.YAMLMap,
		tag: "tag:yaml.org,2002:map",
		resolve(map, onError) {
			if (!identity.isMap(map)) onError("Expected a mapping for this tag");
			return map;
		},
		createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
	};
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = /* @__PURE__ */ __commonJSMin(((exports) => {
	var createNode = require_createNode();
	var stringifyCollection = require_stringifyCollection();
	var Collection = require_Collection();
	var identity = require_identity();
	var Scalar = require_Scalar();
	var toJS = require_toJS();
	var YAMLSeq = class extends Collection.Collection {
		static get tagName() {
			return "tag:yaml.org,2002:seq";
		}
		constructor(schema) {
			super(identity.SEQ, schema);
			this.items = [];
		}
		add(value) {
			this.items.push(value);
		}
		/**
		* Removes a value from the collection.
		*
		* `key` must contain a representation of an integer for this to succeed.
		* It may be wrapped in a `Scalar`.
		*
		* @returns `true` if the item was found and removed.
		*/
		delete(key) {
			const idx = asItemIndex(key);
			if (typeof idx !== "number") return false;
			return this.items.splice(idx, 1).length > 0;
		}
		get(key, keepScalar) {
			const idx = asItemIndex(key);
			if (typeof idx !== "number") return void 0;
			const it = this.items[idx];
			return !keepScalar && identity.isScalar(it) ? it.value : it;
		}
		/**
		* Checks if the collection includes a value with the key `key`.
		*
		* `key` must contain a representation of an integer for this to succeed.
		* It may be wrapped in a `Scalar`.
		*/
		has(key) {
			const idx = asItemIndex(key);
			return typeof idx === "number" && idx < this.items.length;
		}
		/**
		* Sets a value in this collection. For `!!set`, `value` needs to be a
		* boolean to add/remove the item from the set.
		*
		* If `key` does not contain a representation of an integer, this will throw.
		* It may be wrapped in a `Scalar`.
		*/
		set(key, value) {
			const idx = asItemIndex(key);
			if (typeof idx !== "number") throw new Error(`Expected a valid index, not ${key}.`);
			const prev = this.items[idx];
			if (identity.isScalar(prev) && Scalar.isScalarValue(value)) prev.value = value;
			else this.items[idx] = value;
		}
		toJSON(_, ctx) {
			const seq = [];
			if (ctx?.onCreate) ctx.onCreate(seq);
			let i = 0;
			for (const item of this.items) seq.push(toJS.toJS(item, String(i++), ctx));
			return seq;
		}
		toString(ctx, onComment, onChompKeep) {
			if (!ctx) return JSON.stringify(this);
			return stringifyCollection.stringifyCollection(this, ctx, {
				blockItemPrefix: "- ",
				flowChars: {
					start: "[",
					end: "]"
				},
				itemIndent: (ctx.indent || "") + "  ",
				onChompKeep,
				onComment
			});
		}
		static from(schema, obj, ctx) {
			const { replacer } = ctx;
			const seq = new this(schema);
			if (obj && Symbol.iterator in Object(obj)) {
				let i = 0;
				for (let it of obj) {
					if (typeof replacer === "function") {
						const key = obj instanceof Set ? it : String(i++);
						it = replacer.call(obj, key, it);
					}
					seq.items.push(createNode.createNode(it, void 0, ctx));
				}
			}
			return seq;
		}
	};
	function asItemIndex(key) {
		let idx = identity.isScalar(key) ? key.value : key;
		if (idx && typeof idx === "string") idx = Number(idx);
		return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
	}
	exports.YAMLSeq = YAMLSeq;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js
var require_seq = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var YAMLSeq = require_YAMLSeq();
	exports.seq = {
		collection: "seq",
		default: true,
		nodeClass: YAMLSeq.YAMLSeq,
		tag: "tag:yaml.org,2002:seq",
		resolve(seq, onError) {
			if (!identity.isSeq(seq)) onError("Expected a sequence for this tag");
			return seq;
		},
		createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
	};
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js
var require_string = /* @__PURE__ */ __commonJSMin(((exports) => {
	var stringifyString = require_stringifyString();
	exports.string = {
		identify: (value) => typeof value === "string",
		default: true,
		tag: "tag:yaml.org,2002:str",
		resolve: (str) => str,
		stringify(item, ctx, onComment, onChompKeep) {
			ctx = Object.assign({ actualString: true }, ctx);
			return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js
var require_null = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	const nullTag = {
		identify: (value) => value == null,
		createNode: () => new Scalar.Scalar(null),
		default: true,
		tag: "tag:yaml.org,2002:null",
		test: /^(?:~|[Nn]ull|NULL)?$/,
		resolve: () => new Scalar.Scalar(null),
		stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
	};
	exports.nullTag = nullTag;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js
var require_bool$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	const boolTag = {
		identify: (value) => typeof value === "boolean",
		default: true,
		tag: "tag:yaml.org,2002:bool",
		test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
		resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
		stringify({ source, value }, ctx) {
			if (source && boolTag.test.test(source)) {
				if (value === (source[0] === "t" || source[0] === "T")) return source;
			}
			return value ? ctx.options.trueStr : ctx.options.falseStr;
		}
	};
	exports.boolTag = boolTag;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = /* @__PURE__ */ __commonJSMin(((exports) => {
	function stringifyNumber({ format, minFractionDigits, tag, value }) {
		if (typeof value === "bigint") return String(value);
		const num = typeof value === "number" ? value : Number(value);
		if (!isFinite(num)) return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
		let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
		if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
			let i = n.indexOf(".");
			if (i < 0) {
				i = n.length;
				n += ".";
			}
			let d = minFractionDigits - (n.length - i - 1);
			while (d-- > 0) n += "0";
		}
		return n;
	}
	exports.stringifyNumber = stringifyNumber;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js
var require_float$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	var stringifyNumber = require_stringifyNumber();
	const floatNaN = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
		resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
		stringify: stringifyNumber.stringifyNumber
	};
	const floatExp = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		format: "EXP",
		test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
		resolve: (str) => parseFloat(str),
		stringify(node) {
			const num = Number(node.value);
			return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
		}
	};
	exports.float = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
		resolve(str) {
			const node = new Scalar.Scalar(parseFloat(str));
			const dot = str.indexOf(".");
			if (dot !== -1 && str[str.length - 1] === "0") node.minFractionDigits = str.length - dot - 1;
			return node;
		},
		stringify: stringifyNumber.stringifyNumber
	};
	exports.floatExp = floatExp;
	exports.floatNaN = floatNaN;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js
var require_int$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var stringifyNumber = require_stringifyNumber();
	const intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
	const intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
	function intStringify(node, radix, prefix) {
		const { value } = node;
		if (intIdentify(value) && value >= 0) return prefix + value.toString(radix);
		return stringifyNumber.stringifyNumber(node);
	}
	const intOct = {
		identify: (value) => intIdentify(value) && value >= 0,
		default: true,
		tag: "tag:yaml.org,2002:int",
		format: "OCT",
		test: /^0o[0-7]+$/,
		resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
		stringify: (node) => intStringify(node, 8, "0o")
	};
	const int = {
		identify: intIdentify,
		default: true,
		tag: "tag:yaml.org,2002:int",
		test: /^[-+]?[0-9]+$/,
		resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
		stringify: stringifyNumber.stringifyNumber
	};
	const intHex = {
		identify: (value) => intIdentify(value) && value >= 0,
		default: true,
		tag: "tag:yaml.org,2002:int",
		format: "HEX",
		test: /^0x[0-9a-fA-F]+$/,
		resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
		stringify: (node) => intStringify(node, 16, "0x")
	};
	exports.int = int;
	exports.intHex = intHex;
	exports.intOct = intOct;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js
var require_schema$2 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var map = require_map();
	var _null = require_null();
	var seq = require_seq();
	var string = require_string();
	var bool = require_bool$1();
	var float = require_float$1();
	var int = require_int$1();
	exports.schema = [
		map.map,
		seq.seq,
		string.string,
		_null.nullTag,
		bool.boolTag,
		int.intOct,
		int.int,
		int.intHex,
		float.floatNaN,
		float.floatExp,
		float.float
	];
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js
var require_schema$1 = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	var map = require_map();
	var seq = require_seq();
	function intIdentify(value) {
		return typeof value === "bigint" || Number.isInteger(value);
	}
	const stringifyJSON = ({ value }) => JSON.stringify(value);
	const jsonScalars = [
		{
			identify: (value) => typeof value === "string",
			default: true,
			tag: "tag:yaml.org,2002:str",
			resolve: (str) => str,
			stringify: stringifyJSON
		},
		{
			identify: (value) => value == null,
			createNode: () => new Scalar.Scalar(null),
			default: true,
			tag: "tag:yaml.org,2002:null",
			test: /^null$/,
			resolve: () => null,
			stringify: stringifyJSON
		},
		{
			identify: (value) => typeof value === "boolean",
			default: true,
			tag: "tag:yaml.org,2002:bool",
			test: /^true$|^false$/,
			resolve: (str) => str === "true",
			stringify: stringifyJSON
		},
		{
			identify: intIdentify,
			default: true,
			tag: "tag:yaml.org,2002:int",
			test: /^-?(?:0|[1-9][0-9]*)$/,
			resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
			stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
		},
		{
			identify: (value) => typeof value === "number",
			default: true,
			tag: "tag:yaml.org,2002:float",
			test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
			resolve: (str) => parseFloat(str),
			stringify: stringifyJSON
		}
	];
	exports.schema = [map.map, seq.seq].concat(jsonScalars, {
		default: true,
		tag: "",
		test: /^/,
		resolve(str, onError) {
			onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
			return str;
		}
	});
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = /* @__PURE__ */ __commonJSMin(((exports) => {
	var node_buffer = __require("buffer");
	var Scalar = require_Scalar();
	var stringifyString = require_stringifyString();
	exports.binary = {
		identify: (value) => value instanceof Uint8Array,
		default: false,
		tag: "tag:yaml.org,2002:binary",
		/**
		* Returns a Buffer in node and an Uint8Array in browsers
		*
		* To use the resulting buffer as an image, you'll want to do something like:
		*
		*   const blob = new Blob([buffer], { type: 'image/jpeg' })
		*   document.querySelector('#photo').src = URL.createObjectURL(blob)
		*/
		resolve(src, onError) {
			if (typeof node_buffer.Buffer === "function") return node_buffer.Buffer.from(src, "base64");
			else if (typeof atob === "function") {
				const str = atob(src.replace(/[\n\r]/g, ""));
				const buffer = new Uint8Array(str.length);
				for (let i = 0; i < str.length; ++i) buffer[i] = str.charCodeAt(i);
				return buffer;
			} else {
				onError("This environment does not support reading binary tags; either Buffer or atob is required");
				return src;
			}
		},
		stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
			if (!value) return "";
			const buf = value;
			let str;
			if (typeof node_buffer.Buffer === "function") str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
			else if (typeof btoa === "function") {
				let s = "";
				for (let i = 0; i < buf.length; ++i) s += String.fromCharCode(buf[i]);
				str = btoa(s);
			} else throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
			type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
			if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
				const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
				const n = Math.ceil(str.length / lineWidth);
				const lines = new Array(n);
				for (let i = 0, o = 0; i < n; ++i, o += lineWidth) lines[i] = str.substr(o, lineWidth);
				str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
			}
			return stringifyString.stringifyString({
				comment,
				type,
				value: str
			}, ctx, onComment, onChompKeep);
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Pair = require_Pair();
	var Scalar = require_Scalar();
	var YAMLSeq = require_YAMLSeq();
	function resolvePairs(seq, onError) {
		if (identity.isSeq(seq)) for (let i = 0; i < seq.items.length; ++i) {
			let item = seq.items[i];
			if (identity.isPair(item)) continue;
			else if (identity.isMap(item)) {
				if (item.items.length > 1) onError("Each pair must have its own sequence indicator");
				const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
				if (item.commentBefore) pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}\n${pair.key.commentBefore}` : item.commentBefore;
				if (item.comment) {
					const cn = pair.value ?? pair.key;
					cn.comment = cn.comment ? `${item.comment}\n${cn.comment}` : item.comment;
				}
				item = pair;
			}
			seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
		}
		else onError("Expected a sequence for this tag");
		return seq;
	}
	function createPairs(schema, iterable, ctx) {
		const { replacer } = ctx;
		const pairs = new YAMLSeq.YAMLSeq(schema);
		pairs.tag = "tag:yaml.org,2002:pairs";
		let i = 0;
		if (iterable && Symbol.iterator in Object(iterable)) for (let it of iterable) {
			if (typeof replacer === "function") it = replacer.call(iterable, String(i++), it);
			let key, value;
			if (Array.isArray(it)) if (it.length === 2) {
				key = it[0];
				value = it[1];
			} else throw new TypeError(`Expected [key, value] tuple: ${it}`);
			else if (it && it instanceof Object) {
				const keys = Object.keys(it);
				if (keys.length === 1) {
					key = keys[0];
					value = it[key];
				} else throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
			} else key = it;
			pairs.items.push(Pair.createPair(key, value, ctx));
		}
		return pairs;
	}
	const pairs = {
		collection: "seq",
		default: false,
		tag: "tag:yaml.org,2002:pairs",
		resolve: resolvePairs,
		createNode: createPairs
	};
	exports.createPairs = createPairs;
	exports.pairs = pairs;
	exports.resolvePairs = resolvePairs;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var toJS = require_toJS();
	var YAMLMap = require_YAMLMap();
	var YAMLSeq = require_YAMLSeq();
	var pairs = require_pairs();
	var YAMLOMap = class YAMLOMap extends YAMLSeq.YAMLSeq {
		constructor() {
			super();
			this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
			this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
			this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
			this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
			this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
			this.tag = YAMLOMap.tag;
		}
		/**
		* If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
		* but TypeScript won't allow widening the signature of a child method.
		*/
		toJSON(_, ctx) {
			if (!ctx) return super.toJSON(_);
			const map = /* @__PURE__ */ new Map();
			if (ctx?.onCreate) ctx.onCreate(map);
			for (const pair of this.items) {
				let key, value;
				if (identity.isPair(pair)) {
					key = toJS.toJS(pair.key, "", ctx);
					value = toJS.toJS(pair.value, key, ctx);
				} else key = toJS.toJS(pair, "", ctx);
				if (map.has(key)) throw new Error("Ordered maps must not include duplicate keys");
				map.set(key, value);
			}
			return map;
		}
		static from(schema, iterable, ctx) {
			const pairs$1 = pairs.createPairs(schema, iterable, ctx);
			const omap = new this();
			omap.items = pairs$1.items;
			return omap;
		}
	};
	YAMLOMap.tag = "tag:yaml.org,2002:omap";
	const omap = {
		collection: "seq",
		identify: (value) => value instanceof Map,
		nodeClass: YAMLOMap,
		default: false,
		tag: "tag:yaml.org,2002:omap",
		resolve(seq, onError) {
			const pairs$1 = pairs.resolvePairs(seq, onError);
			const seenKeys = [];
			for (const { key } of pairs$1.items) if (identity.isScalar(key)) if (seenKeys.includes(key.value)) onError(`Ordered maps must not include duplicate keys: ${key.value}`);
			else seenKeys.push(key.value);
			return Object.assign(new YAMLOMap(), pairs$1);
		},
		createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
	};
	exports.YAMLOMap = YAMLOMap;
	exports.omap = omap;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	function boolStringify({ value, source }, ctx) {
		if (source && (value ? trueTag : falseTag).test.test(source)) return source;
		return value ? ctx.options.trueStr : ctx.options.falseStr;
	}
	const trueTag = {
		identify: (value) => value === true,
		default: true,
		tag: "tag:yaml.org,2002:bool",
		test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
		resolve: () => new Scalar.Scalar(true),
		stringify: boolStringify
	};
	const falseTag = {
		identify: (value) => value === false,
		default: true,
		tag: "tag:yaml.org,2002:bool",
		test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
		resolve: () => new Scalar.Scalar(false),
		stringify: boolStringify
	};
	exports.falseTag = falseTag;
	exports.trueTag = trueTag;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	var stringifyNumber = require_stringifyNumber();
	const floatNaN = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
		resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
		stringify: stringifyNumber.stringifyNumber
	};
	const floatExp = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		format: "EXP",
		test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
		resolve: (str) => parseFloat(str.replace(/_/g, "")),
		stringify(node) {
			const num = Number(node.value);
			return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
		}
	};
	exports.float = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
		resolve(str) {
			const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
			const dot = str.indexOf(".");
			if (dot !== -1) {
				const f = str.substring(dot + 1).replace(/_/g, "");
				if (f[f.length - 1] === "0") node.minFractionDigits = f.length;
			}
			return node;
		},
		stringify: stringifyNumber.stringifyNumber
	};
	exports.floatExp = floatExp;
	exports.floatNaN = floatNaN;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int = /* @__PURE__ */ __commonJSMin(((exports) => {
	var stringifyNumber = require_stringifyNumber();
	const intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
	function intResolve(str, offset, radix, { intAsBigInt }) {
		const sign = str[0];
		if (sign === "-" || sign === "+") offset += 1;
		str = str.substring(offset).replace(/_/g, "");
		if (intAsBigInt) {
			switch (radix) {
				case 2:
					str = `0b${str}`;
					break;
				case 8:
					str = `0o${str}`;
					break;
				case 16:
					str = `0x${str}`;
					break;
			}
			const n = BigInt(str);
			return sign === "-" ? BigInt(-1) * n : n;
		}
		const n = parseInt(str, radix);
		return sign === "-" ? -1 * n : n;
	}
	function intStringify(node, radix, prefix) {
		const { value } = node;
		if (intIdentify(value)) {
			const str = value.toString(radix);
			return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
		}
		return stringifyNumber.stringifyNumber(node);
	}
	const intBin = {
		identify: intIdentify,
		default: true,
		tag: "tag:yaml.org,2002:int",
		format: "BIN",
		test: /^[-+]?0b[0-1_]+$/,
		resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
		stringify: (node) => intStringify(node, 2, "0b")
	};
	const intOct = {
		identify: intIdentify,
		default: true,
		tag: "tag:yaml.org,2002:int",
		format: "OCT",
		test: /^[-+]?0[0-7_]+$/,
		resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
		stringify: (node) => intStringify(node, 8, "0")
	};
	const int = {
		identify: intIdentify,
		default: true,
		tag: "tag:yaml.org,2002:int",
		test: /^[-+]?[0-9][0-9_]*$/,
		resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
		stringify: stringifyNumber.stringifyNumber
	};
	const intHex = {
		identify: intIdentify,
		default: true,
		tag: "tag:yaml.org,2002:int",
		format: "HEX",
		test: /^[-+]?0x[0-9a-fA-F_]+$/,
		resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
		stringify: (node) => intStringify(node, 16, "0x")
	};
	exports.int = int;
	exports.intBin = intBin;
	exports.intHex = intHex;
	exports.intOct = intOct;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Pair = require_Pair();
	var YAMLMap = require_YAMLMap();
	var YAMLSet = class YAMLSet extends YAMLMap.YAMLMap {
		constructor(schema) {
			super(schema);
			this.tag = YAMLSet.tag;
		}
		add(key) {
			let pair;
			if (identity.isPair(key)) pair = key;
			else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null) pair = new Pair.Pair(key.key, null);
			else pair = new Pair.Pair(key, null);
			if (!YAMLMap.findPair(this.items, pair.key)) this.items.push(pair);
		}
		/**
		* If `keepPair` is `true`, returns the Pair matching `key`.
		* Otherwise, returns the value of that Pair's key.
		*/
		get(key, keepPair) {
			const pair = YAMLMap.findPair(this.items, key);
			return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
		}
		set(key, value) {
			if (typeof value !== "boolean") throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
			const prev = YAMLMap.findPair(this.items, key);
			if (prev && !value) this.items.splice(this.items.indexOf(prev), 1);
			else if (!prev && value) this.items.push(new Pair.Pair(key));
		}
		toJSON(_, ctx) {
			return super.toJSON(_, ctx, Set);
		}
		toString(ctx, onComment, onChompKeep) {
			if (!ctx) return JSON.stringify(this);
			if (this.hasAllNullValues(true)) return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
			else throw new Error("Set items must all have null values");
		}
		static from(schema, iterable, ctx) {
			const { replacer } = ctx;
			const set = new this(schema);
			if (iterable && Symbol.iterator in Object(iterable)) for (let value of iterable) {
				if (typeof replacer === "function") value = replacer.call(iterable, value, value);
				set.items.push(Pair.createPair(value, null, ctx));
			}
			return set;
		}
	};
	YAMLSet.tag = "tag:yaml.org,2002:set";
	const set = {
		collection: "map",
		identify: (value) => value instanceof Set,
		nodeClass: YAMLSet,
		default: false,
		tag: "tag:yaml.org,2002:set",
		createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
		resolve(map, onError) {
			if (identity.isMap(map)) if (map.hasAllNullValues(true)) return Object.assign(new YAMLSet(), map);
			else onError("Set items must all have null values");
			else onError("Expected a mapping for this tag");
			return map;
		}
	};
	exports.YAMLSet = YAMLSet;
	exports.set = set;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = /* @__PURE__ */ __commonJSMin(((exports) => {
	var stringifyNumber = require_stringifyNumber();
	/** Internal types handle bigint as number, because TS can't figure it out. */
	function parseSexagesimal(str, asBigInt) {
		const sign = str[0];
		const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
		const num = (n) => asBigInt ? BigInt(n) : Number(n);
		const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
		return sign === "-" ? num(-1) * res : res;
	}
	/**
	* hhhh:mm:ss.sss
	*
	* Internal types handle bigint as number, because TS can't figure it out.
	*/
	function stringifySexagesimal(node) {
		let { value } = node;
		let num = (n) => n;
		if (typeof value === "bigint") num = (n) => BigInt(n);
		else if (isNaN(value) || !isFinite(value)) return stringifyNumber.stringifyNumber(node);
		let sign = "";
		if (value < 0) {
			sign = "-";
			value *= num(-1);
		}
		const _60 = num(60);
		const parts = [value % _60];
		if (value < 60) parts.unshift(0);
		else {
			value = (value - parts[0]) / _60;
			parts.unshift(value % _60);
			if (value >= 60) {
				value = (value - parts[0]) / _60;
				parts.unshift(value);
			}
		}
		return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
	}
	const intTime = {
		identify: (value) => typeof value === "bigint" || Number.isInteger(value),
		default: true,
		tag: "tag:yaml.org,2002:int",
		format: "TIME",
		test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
		resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
		stringify: stringifySexagesimal
	};
	const floatTime = {
		identify: (value) => typeof value === "number",
		default: true,
		tag: "tag:yaml.org,2002:float",
		format: "TIME",
		test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
		resolve: (str) => parseSexagesimal(str, false),
		stringify: stringifySexagesimal
	};
	const timestamp = {
		identify: (value) => value instanceof Date,
		default: true,
		tag: "tag:yaml.org,2002:timestamp",
		test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
		resolve(str) {
			const match = str.match(timestamp.test);
			if (!match) throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
			const [, year, month, day, hour, minute, second] = match.map(Number);
			const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
			let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
			const tz = match[8];
			if (tz && tz !== "Z") {
				let d = parseSexagesimal(tz, false);
				if (Math.abs(d) < 30) d *= 60;
				date -= 6e4 * d;
			}
			return new Date(date);
		},
		stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
	};
	exports.floatTime = floatTime;
	exports.intTime = intTime;
	exports.timestamp = timestamp;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema = /* @__PURE__ */ __commonJSMin(((exports) => {
	var map = require_map();
	var _null = require_null();
	var seq = require_seq();
	var string = require_string();
	var binary = require_binary();
	var bool = require_bool();
	var float = require_float();
	var int = require_int();
	var merge = require_merge();
	var omap = require_omap();
	var pairs = require_pairs();
	var set = require_set();
	var timestamp = require_timestamp();
	exports.schema = [
		map.map,
		seq.seq,
		string.string,
		_null.nullTag,
		bool.trueTag,
		bool.falseTag,
		int.intBin,
		int.intOct,
		int.int,
		int.intHex,
		float.floatNaN,
		float.floatExp,
		float.float,
		binary.binary,
		merge.merge,
		omap.omap,
		pairs.pairs,
		set.set,
		timestamp.intTime,
		timestamp.floatTime,
		timestamp.timestamp
	];
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js
var require_tags = /* @__PURE__ */ __commonJSMin(((exports) => {
	var map = require_map();
	var _null = require_null();
	var seq = require_seq();
	var string = require_string();
	var bool = require_bool$1();
	var float = require_float$1();
	var int = require_int$1();
	var schema = require_schema$2();
	var schema$1 = require_schema$1();
	var binary = require_binary();
	var merge = require_merge();
	var omap = require_omap();
	var pairs = require_pairs();
	var schema$2 = require_schema();
	var set = require_set();
	var timestamp = require_timestamp();
	const schemas = /* @__PURE__ */ new Map([
		["core", schema.schema],
		["failsafe", [
			map.map,
			seq.seq,
			string.string
		]],
		["json", schema$1.schema],
		["yaml11", schema$2.schema],
		["yaml-1.1", schema$2.schema]
	]);
	const tagsByName = {
		binary: binary.binary,
		bool: bool.boolTag,
		float: float.float,
		floatExp: float.floatExp,
		floatNaN: float.floatNaN,
		floatTime: timestamp.floatTime,
		int: int.int,
		intHex: int.intHex,
		intOct: int.intOct,
		intTime: timestamp.intTime,
		map: map.map,
		merge: merge.merge,
		null: _null.nullTag,
		omap: omap.omap,
		pairs: pairs.pairs,
		seq: seq.seq,
		set: set.set,
		timestamp: timestamp.timestamp
	};
	const coreKnownTags = {
		"tag:yaml.org,2002:binary": binary.binary,
		"tag:yaml.org,2002:merge": merge.merge,
		"tag:yaml.org,2002:omap": omap.omap,
		"tag:yaml.org,2002:pairs": pairs.pairs,
		"tag:yaml.org,2002:set": set.set,
		"tag:yaml.org,2002:timestamp": timestamp.timestamp
	};
	function getTags(customTags, schemaName, addMergeTag) {
		const schemaTags = schemas.get(schemaName);
		if (schemaTags && !customTags) return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
		let tags = schemaTags;
		if (!tags) if (Array.isArray(customTags)) tags = [];
		else {
			const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
			throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
		}
		if (Array.isArray(customTags)) for (const tag of customTags) tags = tags.concat(tag);
		else if (typeof customTags === "function") tags = customTags(tags.slice());
		if (addMergeTag) tags = tags.concat(merge.merge);
		return tags.reduce((tags, tag) => {
			const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
			if (!tagObj) {
				const tagName = JSON.stringify(tag);
				const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
				throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
			}
			if (!tags.includes(tagObj)) tags.push(tagObj);
			return tags;
		}, []);
	}
	exports.coreKnownTags = coreKnownTags;
	exports.getTags = getTags;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js
var require_Schema = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var map = require_map();
	var seq = require_seq();
	var string = require_string();
	var tags = require_tags();
	const sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
	exports.Schema = class Schema {
		constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
			this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
			this.name = typeof schema === "string" && schema || "core";
			this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
			this.tags = tags.getTags(customTags, this.name, merge);
			this.toStringOptions = toStringDefaults ?? null;
			Object.defineProperty(this, identity.MAP, { value: map.map });
			Object.defineProperty(this, identity.SCALAR, { value: string.string });
			Object.defineProperty(this, identity.SEQ, { value: seq.seq });
			this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
		}
		clone() {
			const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
			copy.tags = this.tags.slice();
			return copy;
		}
	};
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var stringify = require_stringify();
	var stringifyComment = require_stringifyComment();
	function stringifyDocument(doc, options) {
		const lines = [];
		let hasDirectives = options.directives === true;
		if (options.directives !== false && doc.directives) {
			const dir = doc.directives.toString(doc);
			if (dir) {
				lines.push(dir);
				hasDirectives = true;
			} else if (doc.directives.docStart) hasDirectives = true;
		}
		if (hasDirectives) lines.push("---");
		const ctx = stringify.createStringifyContext(doc, options);
		const { commentString } = ctx.options;
		if (doc.commentBefore) {
			if (lines.length !== 1) lines.unshift("");
			const cs = commentString(doc.commentBefore);
			lines.unshift(stringifyComment.indentComment(cs, ""));
		}
		let chompKeep = false;
		let contentComment = null;
		if (doc.contents) {
			if (identity.isNode(doc.contents)) {
				if (doc.contents.spaceBefore && hasDirectives) lines.push("");
				if (doc.contents.commentBefore) {
					const cs = commentString(doc.contents.commentBefore);
					lines.push(stringifyComment.indentComment(cs, ""));
				}
				ctx.forceBlockIndent = !!doc.comment;
				contentComment = doc.contents.comment;
			}
			const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
			let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
			if (contentComment) body += stringifyComment.lineComment(body, "", commentString(contentComment));
			if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") lines[lines.length - 1] = `--- ${body}`;
			else lines.push(body);
		} else lines.push(stringify.stringify(doc.contents, ctx));
		if (doc.directives?.docEnd) if (doc.comment) {
			const cs = commentString(doc.comment);
			if (cs.includes("\n")) {
				lines.push("...");
				lines.push(stringifyComment.indentComment(cs, ""));
			} else lines.push(`... ${cs}`);
		} else lines.push("...");
		else {
			let dc = doc.comment;
			if (dc && chompKeep) dc = dc.replace(/^\n+/, "");
			if (dc) {
				if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "") lines.push("");
				lines.push(stringifyComment.indentComment(commentString(dc), ""));
			}
		}
		return lines.join("\n") + "\n";
	}
	exports.stringifyDocument = stringifyDocument;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js
var require_Document = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Alias = require_Alias();
	var Collection = require_Collection();
	var identity = require_identity();
	var Pair = require_Pair();
	var toJS = require_toJS();
	var Schema = require_Schema();
	var stringifyDocument = require_stringifyDocument();
	var anchors = require_anchors();
	var applyReviver = require_applyReviver();
	var createNode = require_createNode();
	var directives = require_directives();
	var Document = class Document {
		constructor(value, replacer, options) {
			/** A comment before this Document */
			this.commentBefore = null;
			/** A comment immediately after this Document */
			this.comment = null;
			/** Errors encountered during parsing. */
			this.errors = [];
			/** Warnings encountered during parsing. */
			this.warnings = [];
			Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
			let _replacer = null;
			if (typeof replacer === "function" || Array.isArray(replacer)) _replacer = replacer;
			else if (options === void 0 && replacer) {
				options = replacer;
				replacer = void 0;
			}
			const opt = Object.assign({
				intAsBigInt: false,
				keepSourceTokens: false,
				logLevel: "warn",
				prettyErrors: true,
				strict: true,
				stringKeys: false,
				uniqueKeys: true,
				version: "1.2"
			}, options);
			this.options = opt;
			let { version } = opt;
			if (options?._directives) {
				this.directives = options._directives.atDocument();
				if (this.directives.yaml.explicit) version = this.directives.yaml.version;
			} else this.directives = new directives.Directives({ version });
			this.setSchema(version, options);
			this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
		}
		/**
		* Create a deep copy of this Document and its contents.
		*
		* Custom Node values that inherit from `Object` still refer to their original instances.
		*/
		clone() {
			const copy = Object.create(Document.prototype, { [identity.NODE_TYPE]: { value: identity.DOC } });
			copy.commentBefore = this.commentBefore;
			copy.comment = this.comment;
			copy.errors = this.errors.slice();
			copy.warnings = this.warnings.slice();
			copy.options = Object.assign({}, this.options);
			if (this.directives) copy.directives = this.directives.clone();
			copy.schema = this.schema.clone();
			copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
			if (this.range) copy.range = this.range.slice();
			return copy;
		}
		/** Adds a value to the document. */
		add(value) {
			if (assertCollection(this.contents)) this.contents.add(value);
		}
		/** Adds a value to the document. */
		addIn(path, value) {
			if (assertCollection(this.contents)) this.contents.addIn(path, value);
		}
		/**
		* Create a new `Alias` node, ensuring that the target `node` has the required anchor.
		*
		* If `node` already has an anchor, `name` is ignored.
		* Otherwise, the `node.anchor` value will be set to `name`,
		* or if an anchor with that name is already present in the document,
		* `name` will be used as a prefix for a new unique anchor.
		* If `name` is undefined, the generated anchor will use 'a' as a prefix.
		*/
		createAlias(node, name) {
			if (!node.anchor) {
				const prev = anchors.anchorNames(this);
				node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
			}
			return new Alias.Alias(node.anchor);
		}
		createNode(value, replacer, options) {
			let _replacer = void 0;
			if (typeof replacer === "function") {
				value = replacer.call({ "": value }, "", value);
				_replacer = replacer;
			} else if (Array.isArray(replacer)) {
				const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
				const asStr = replacer.filter(keyToStr).map(String);
				if (asStr.length > 0) replacer = replacer.concat(asStr);
				_replacer = replacer;
			} else if (options === void 0 && replacer) {
				options = replacer;
				replacer = void 0;
			}
			const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
			const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
			const ctx = {
				aliasDuplicateObjects: aliasDuplicateObjects ?? true,
				keepUndefined: keepUndefined ?? false,
				onAnchor,
				onTagObj,
				replacer: _replacer,
				schema: this.schema,
				sourceObjects
			};
			const node = createNode.createNode(value, tag, ctx);
			if (flow && identity.isCollection(node)) node.flow = true;
			setAnchors();
			return node;
		}
		/**
		* Convert a key and a value into a `Pair` using the current schema,
		* recursively wrapping all values as `Scalar` or `Collection` nodes.
		*/
		createPair(key, value, options = {}) {
			const k = this.createNode(key, null, options);
			const v = this.createNode(value, null, options);
			return new Pair.Pair(k, v);
		}
		/**
		* Removes a value from the document.
		* @returns `true` if the item was found and removed.
		*/
		delete(key) {
			return assertCollection(this.contents) ? this.contents.delete(key) : false;
		}
		/**
		* Removes a value from the document.
		* @returns `true` if the item was found and removed.
		*/
		deleteIn(path) {
			if (Collection.isEmptyPath(path)) {
				if (this.contents == null) return false;
				this.contents = null;
				return true;
			}
			return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
		}
		/**
		* Returns item at `key`, or `undefined` if not found. By default unwraps
		* scalar values from their surrounding node; to disable set `keepScalar` to
		* `true` (collections are always returned intact).
		*/
		get(key, keepScalar) {
			return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
		}
		/**
		* Returns item at `path`, or `undefined` if not found. By default unwraps
		* scalar values from their surrounding node; to disable set `keepScalar` to
		* `true` (collections are always returned intact).
		*/
		getIn(path, keepScalar) {
			if (Collection.isEmptyPath(path)) return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
			return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
		}
		/**
		* Checks if the document includes a value with the key `key`.
		*/
		has(key) {
			return identity.isCollection(this.contents) ? this.contents.has(key) : false;
		}
		/**
		* Checks if the document includes a value at `path`.
		*/
		hasIn(path) {
			if (Collection.isEmptyPath(path)) return this.contents !== void 0;
			return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
		}
		/**
		* Sets a value in this document. For `!!set`, `value` needs to be a
		* boolean to add/remove the item from the set.
		*/
		set(key, value) {
			if (this.contents == null) this.contents = Collection.collectionFromPath(this.schema, [key], value);
			else if (assertCollection(this.contents)) this.contents.set(key, value);
		}
		/**
		* Sets a value in this document. For `!!set`, `value` needs to be a
		* boolean to add/remove the item from the set.
		*/
		setIn(path, value) {
			if (Collection.isEmptyPath(path)) this.contents = value;
			else if (this.contents == null) this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
			else if (assertCollection(this.contents)) this.contents.setIn(path, value);
		}
		/**
		* Change the YAML version and schema used by the document.
		* A `null` version disables support for directives, explicit tags, anchors, and aliases.
		* It also requires the `schema` option to be given as a `Schema` instance value.
		*
		* Overrides all previously set schema options.
		*/
		setSchema(version, options = {}) {
			if (typeof version === "number") version = String(version);
			let opt;
			switch (version) {
				case "1.1":
					if (this.directives) this.directives.yaml.version = "1.1";
					else this.directives = new directives.Directives({ version: "1.1" });
					opt = {
						resolveKnownTags: false,
						schema: "yaml-1.1"
					};
					break;
				case "1.2":
				case "next":
					if (this.directives) this.directives.yaml.version = version;
					else this.directives = new directives.Directives({ version });
					opt = {
						resolveKnownTags: true,
						schema: "core"
					};
					break;
				case null:
					if (this.directives) delete this.directives;
					opt = null;
					break;
				default: {
					const sv = JSON.stringify(version);
					throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
				}
			}
			if (options.schema instanceof Object) this.schema = options.schema;
			else if (opt) this.schema = new Schema.Schema(Object.assign(opt, options));
			else throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
		}
		toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
			const ctx = {
				anchors: /* @__PURE__ */ new Map(),
				doc: this,
				keep: !json,
				mapAsMap: mapAsMap === true,
				mapKeyWarned: false,
				maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
			};
			const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
			if (typeof onAnchor === "function") for (const { count, res } of ctx.anchors.values()) onAnchor(res, count);
			return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
		}
		/**
		* A JSON representation of the document `contents`.
		*
		* @param jsonArg Used by `JSON.stringify` to indicate the array index or
		*   property name.
		*/
		toJSON(jsonArg, onAnchor) {
			return this.toJS({
				json: true,
				jsonArg,
				mapAsMap: false,
				onAnchor
			});
		}
		/** A YAML representation of the document. */
		toString(options = {}) {
			if (this.errors.length > 0) throw new Error("Document with errors cannot be stringified");
			if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
				const s = JSON.stringify(options.indent);
				throw new Error(`"indent" option must be a positive integer, not ${s}`);
			}
			return stringifyDocument.stringifyDocument(this, options);
		}
	};
	function assertCollection(contents) {
		if (identity.isCollection(contents)) return true;
		throw new Error("Expected a YAML collection as document contents");
	}
	exports.Document = Document;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/errors.js
var require_errors = /* @__PURE__ */ __commonJSMin(((exports) => {
	var YAMLError = class extends Error {
		constructor(name, pos, code, message) {
			super();
			this.name = name;
			this.code = code;
			this.message = message;
			this.pos = pos;
		}
	};
	var YAMLParseError = class extends YAMLError {
		constructor(pos, code, message) {
			super("YAMLParseError", pos, code, message);
		}
	};
	var YAMLWarning = class extends YAMLError {
		constructor(pos, code, message) {
			super("YAMLWarning", pos, code, message);
		}
	};
	const prettifyError = (src, lc) => (error) => {
		if (error.pos[0] === -1) return;
		error.linePos = error.pos.map((pos) => lc.linePos(pos));
		const { line, col } = error.linePos[0];
		error.message += ` at line ${line}, column ${col}`;
		let ci = col - 1;
		let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
		if (ci >= 60 && lineStr.length > 80) {
			const trimStart = Math.min(ci - 39, lineStr.length - 79);
			lineStr = "…" + lineStr.substring(trimStart);
			ci -= trimStart - 1;
		}
		if (lineStr.length > 80) lineStr = lineStr.substring(0, 79) + "…";
		if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
			let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
			if (prev.length > 80) prev = prev.substring(0, 79) + "…\n";
			lineStr = prev + lineStr;
		}
		if (/[^ ]/.test(lineStr)) {
			let count = 1;
			const end = error.linePos[1];
			if (end?.line === line && end.col > col) count = Math.max(1, Math.min(end.col - col, 80 - ci));
			const pointer = " ".repeat(ci) + "^".repeat(count);
			error.message += `:\n\n${lineStr}\n${pointer}\n`;
		}
	};
	exports.YAMLError = YAMLError;
	exports.YAMLParseError = YAMLParseError;
	exports.YAMLWarning = YAMLWarning;
	exports.prettifyError = prettifyError;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = /* @__PURE__ */ __commonJSMin(((exports) => {
	function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
		let spaceBefore = false;
		let atNewline = startOnNewline;
		let hasSpace = startOnNewline;
		let comment = "";
		let commentSep = "";
		let hasNewline = false;
		let reqSpace = false;
		let tab = null;
		let anchor = null;
		let tag = null;
		let newlineAfterProp = null;
		let comma = null;
		let found = null;
		let start = null;
		for (const token of tokens) {
			if (reqSpace) {
				if (token.type !== "space" && token.type !== "newline" && token.type !== "comma") onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
				reqSpace = false;
			}
			if (tab) {
				if (atNewline && token.type !== "comment" && token.type !== "newline") onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
				tab = null;
			}
			switch (token.type) {
				case "space":
					if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) tab = token;
					hasSpace = true;
					break;
				case "comment": {
					if (!hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
					const cb = token.source.substring(1) || " ";
					if (!comment) comment = cb;
					else comment += commentSep + cb;
					commentSep = "";
					atNewline = false;
					break;
				}
				case "newline":
					if (atNewline) {
						if (comment) comment += token.source;
						else if (!found || indicator !== "seq-item-ind") spaceBefore = true;
					} else commentSep += token.source;
					atNewline = true;
					hasNewline = true;
					if (anchor || tag) newlineAfterProp = token;
					hasSpace = true;
					break;
				case "anchor":
					if (anchor) onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
					if (token.source.endsWith(":")) onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
					anchor = token;
					start ?? (start = token.offset);
					atNewline = false;
					hasSpace = false;
					reqSpace = true;
					break;
				case "tag":
					if (tag) onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
					tag = token;
					start ?? (start = token.offset);
					atNewline = false;
					hasSpace = false;
					reqSpace = true;
					break;
				case indicator:
					if (anchor || tag) onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
					if (found) onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
					found = token;
					atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
					hasSpace = false;
					break;
				case "comma": if (flow) {
					if (comma) onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
					comma = token;
					atNewline = false;
					hasSpace = false;
					break;
				}
				default:
					onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
					atNewline = false;
					hasSpace = false;
			}
		}
		const last = tokens[tokens.length - 1];
		const end = last ? last.offset + last.source.length : offset;
		if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
		if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq")) onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
		return {
			comma,
			found,
			spaceBefore,
			comment,
			hasNewline,
			anchor,
			tag,
			newlineAfterProp,
			end,
			start: start ?? end
		};
	}
	exports.resolveProps = resolveProps;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = /* @__PURE__ */ __commonJSMin(((exports) => {
	function containsNewline(key) {
		if (!key) return null;
		switch (key.type) {
			case "alias":
			case "scalar":
			case "double-quoted-scalar":
			case "single-quoted-scalar":
				if (key.source.includes("\n")) return true;
				if (key.end) {
					for (const st of key.end) if (st.type === "newline") return true;
				}
				return false;
			case "flow-collection":
				for (const it of key.items) {
					for (const st of it.start) if (st.type === "newline") return true;
					if (it.sep) {
						for (const st of it.sep) if (st.type === "newline") return true;
					}
					if (containsNewline(it.key) || containsNewline(it.value)) return true;
				}
				return false;
			default: return true;
		}
	}
	exports.containsNewline = containsNewline;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = /* @__PURE__ */ __commonJSMin(((exports) => {
	var utilContainsNewline = require_util_contains_newline();
	function flowIndentCheck(indent, fc, onError) {
		if (fc?.type === "flow-collection") {
			const end = fc.end[0];
			if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) onError(end, "BAD_INDENT", "Flow end indicator should be more indented than parent", true);
		}
	}
	exports.flowIndentCheck = flowIndentCheck;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	function mapIncludes(ctx, items, search) {
		const { uniqueKeys } = ctx.options;
		if (uniqueKeys === false) return false;
		const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
		return items.some((pair) => isEqual(pair.key, search));
	}
	exports.mapIncludes = mapIncludes;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Pair = require_Pair();
	var YAMLMap = require_YAMLMap();
	var resolveProps = require_resolve_props();
	var utilContainsNewline = require_util_contains_newline();
	var utilFlowIndentCheck = require_util_flow_indent_check();
	var utilMapIncludes = require_util_map_includes();
	const startColMsg = "All mapping items must start at the same column";
	function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
		const map = new ((tag?.nodeClass) ?? YAMLMap.YAMLMap)(ctx.schema);
		if (ctx.atRoot) ctx.atRoot = false;
		let offset = bm.offset;
		let commentEnd = null;
		for (const collItem of bm.items) {
			const { start, key, sep, value } = collItem;
			const keyProps = resolveProps.resolveProps(start, {
				indicator: "explicit-key-ind",
				next: key ?? sep?.[0],
				offset,
				onError,
				parentIndent: bm.indent,
				startOnNewline: true
			});
			const implicitKey = !keyProps.found;
			if (implicitKey) {
				if (key) {
					if (key.type === "block-seq") onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
					else if ("indent" in key && key.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
				}
				if (!keyProps.anchor && !keyProps.tag && !sep) {
					commentEnd = keyProps.end;
					if (keyProps.comment) if (map.comment) map.comment += "\n" + keyProps.comment;
					else map.comment = keyProps.comment;
					continue;
				}
				if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
			} else if (keyProps.found?.indent !== bm.indent) onError(offset, "BAD_INDENT", startColMsg);
			ctx.atKey = true;
			const keyStart = keyProps.end;
			const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
			if (ctx.schema.compat) utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
			ctx.atKey = false;
			if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
			const valueProps = resolveProps.resolveProps(sep ?? [], {
				indicator: "map-value-ind",
				next: value,
				offset: keyNode.range[2],
				onError,
				parentIndent: bm.indent,
				startOnNewline: !key || key.type === "block-scalar"
			});
			offset = valueProps.end;
			if (valueProps.found) {
				if (implicitKey) {
					if (value?.type === "block-map" && !valueProps.hasNewline) onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
					if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024) onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
				}
				const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
				if (ctx.schema.compat) utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
				offset = valueNode.range[2];
				const pair = new Pair.Pair(keyNode, valueNode);
				if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
				map.items.push(pair);
			} else {
				if (implicitKey) onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
				if (valueProps.comment) if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
				else keyNode.comment = valueProps.comment;
				const pair = new Pair.Pair(keyNode);
				if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
				map.items.push(pair);
			}
		}
		if (commentEnd && commentEnd < offset) onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
		map.range = [
			bm.offset,
			offset,
			commentEnd ?? offset
		];
		return map;
	}
	exports.resolveBlockMap = resolveBlockMap;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = /* @__PURE__ */ __commonJSMin(((exports) => {
	var YAMLSeq = require_YAMLSeq();
	var resolveProps = require_resolve_props();
	var utilFlowIndentCheck = require_util_flow_indent_check();
	function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
		const seq = new ((tag?.nodeClass) ?? YAMLSeq.YAMLSeq)(ctx.schema);
		if (ctx.atRoot) ctx.atRoot = false;
		if (ctx.atKey) ctx.atKey = false;
		let offset = bs.offset;
		let commentEnd = null;
		for (const { start, value } of bs.items) {
			const props = resolveProps.resolveProps(start, {
				indicator: "seq-item-ind",
				next: value,
				offset,
				onError,
				parentIndent: bs.indent,
				startOnNewline: true
			});
			if (!props.found) if (props.anchor || props.tag || value) if (value?.type === "block-seq") onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
			else onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
			else {
				commentEnd = props.end;
				if (props.comment) seq.comment = props.comment;
				continue;
			}
			const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
			if (ctx.schema.compat) utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
			offset = node.range[2];
			seq.items.push(node);
		}
		seq.range = [
			bs.offset,
			offset,
			commentEnd ?? offset
		];
		return seq;
	}
	exports.resolveBlockSeq = resolveBlockSeq;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = /* @__PURE__ */ __commonJSMin(((exports) => {
	function resolveEnd(end, offset, reqSpace, onError) {
		let comment = "";
		if (end) {
			let hasSpace = false;
			let sep = "";
			for (const token of end) {
				const { source, type } = token;
				switch (type) {
					case "space":
						hasSpace = true;
						break;
					case "comment": {
						if (reqSpace && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
						const cb = source.substring(1) || " ";
						if (!comment) comment = cb;
						else comment += sep + cb;
						sep = "";
						break;
					}
					case "newline":
						if (comment) sep += source;
						hasSpace = true;
						break;
					default: onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
				}
				offset += source.length;
			}
		}
		return {
			comment,
			offset
		};
	}
	exports.resolveEnd = resolveEnd;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Pair = require_Pair();
	var YAMLMap = require_YAMLMap();
	var YAMLSeq = require_YAMLSeq();
	var resolveEnd = require_resolve_end();
	var resolveProps = require_resolve_props();
	var utilContainsNewline = require_util_contains_newline();
	var utilMapIncludes = require_util_map_includes();
	const blockMsg = "Block collections are not allowed within flow collections";
	const isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
	function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
		const isMap = fc.start.source === "{";
		const fcName = isMap ? "flow map" : "flow sequence";
		const coll = new ((tag?.nodeClass) ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq))(ctx.schema);
		coll.flow = true;
		const atRoot = ctx.atRoot;
		if (atRoot) ctx.atRoot = false;
		if (ctx.atKey) ctx.atKey = false;
		let offset = fc.offset + fc.start.source.length;
		for (let i = 0; i < fc.items.length; ++i) {
			const collItem = fc.items[i];
			const { start, key, sep, value } = collItem;
			const props = resolveProps.resolveProps(start, {
				flow: fcName,
				indicator: "explicit-key-ind",
				next: key ?? sep?.[0],
				offset,
				onError,
				parentIndent: fc.indent,
				startOnNewline: false
			});
			if (!props.found) {
				if (!props.anchor && !props.tag && !sep && !value) {
					if (i === 0 && props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
					else if (i < fc.items.length - 1) onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
					if (props.comment) if (coll.comment) coll.comment += "\n" + props.comment;
					else coll.comment = props.comment;
					offset = props.end;
					continue;
				}
				if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key)) onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
			}
			if (i === 0) {
				if (props.comma) onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
			} else {
				if (!props.comma) onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
				if (props.comment) {
					let prevItemComment = "";
					loop: for (const st of start) switch (st.type) {
						case "comma":
						case "space": break;
						case "comment":
							prevItemComment = st.source.substring(1);
							break loop;
						default: break loop;
					}
					if (prevItemComment) {
						let prev = coll.items[coll.items.length - 1];
						if (identity.isPair(prev)) prev = prev.value ?? prev.key;
						if (prev.comment) prev.comment += "\n" + prevItemComment;
						else prev.comment = prevItemComment;
						props.comment = props.comment.substring(prevItemComment.length + 1);
					}
				}
			}
			if (!isMap && !sep && !props.found) {
				const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
				coll.items.push(valueNode);
				offset = valueNode.range[2];
				if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
			} else {
				ctx.atKey = true;
				const keyStart = props.end;
				const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
				if (isBlock(key)) onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
				ctx.atKey = false;
				const valueProps = resolveProps.resolveProps(sep ?? [], {
					flow: fcName,
					indicator: "map-value-ind",
					next: value,
					offset: keyNode.range[2],
					onError,
					parentIndent: fc.indent,
					startOnNewline: false
				});
				if (valueProps.found) {
					if (!isMap && !props.found && ctx.options.strict) {
						if (sep) for (const st of sep) {
							if (st === valueProps.found) break;
							if (st.type === "newline") {
								onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
								break;
							}
						}
						if (props.start < valueProps.found.offset - 1024) onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
					}
				} else if (value) if ("source" in value && value.source?.[0] === ":") onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
				else onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
				const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
				if (valueNode) {
					if (isBlock(value)) onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
				} else if (valueProps.comment) if (keyNode.comment) keyNode.comment += "\n" + valueProps.comment;
				else keyNode.comment = valueProps.comment;
				const pair = new Pair.Pair(keyNode, valueNode);
				if (ctx.options.keepSourceTokens) pair.srcToken = collItem;
				if (isMap) {
					const map = coll;
					if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode)) onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
					map.items.push(pair);
				} else {
					const map = new YAMLMap.YAMLMap(ctx.schema);
					map.flow = true;
					map.items.push(pair);
					const endRange = (valueNode ?? keyNode).range;
					map.range = [
						keyNode.range[0],
						endRange[1],
						endRange[2]
					];
					coll.items.push(map);
				}
				offset = valueNode ? valueNode.range[2] : valueProps.end;
			}
		}
		const expectedEnd = isMap ? "}" : "]";
		const [ce, ...ee] = fc.end;
		let cePos = offset;
		if (ce?.source === expectedEnd) cePos = ce.offset + ce.source.length;
		else {
			const name = fcName[0].toUpperCase() + fcName.substring(1);
			const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
			onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
			if (ce && ce.source.length !== 1) ee.unshift(ce);
		}
		if (ee.length > 0) {
			const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
			if (end.comment) if (coll.comment) coll.comment += "\n" + end.comment;
			else coll.comment = end.comment;
			coll.range = [
				fc.offset,
				cePos,
				end.offset
			];
		} else coll.range = [
			fc.offset,
			cePos,
			cePos
		];
		return coll;
	}
	exports.resolveFlowCollection = resolveFlowCollection;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Scalar = require_Scalar();
	var YAMLMap = require_YAMLMap();
	var YAMLSeq = require_YAMLSeq();
	var resolveBlockMap = require_resolve_block_map();
	var resolveBlockSeq = require_resolve_block_seq();
	var resolveFlowCollection = require_resolve_flow_collection();
	function resolveCollection(CN, ctx, token, onError, tagName, tag) {
		const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
		const Coll = coll.constructor;
		if (tagName === "!" || tagName === Coll.tagName) {
			coll.tag = Coll.tagName;
			return coll;
		}
		if (tagName) coll.tag = tagName;
		return coll;
	}
	function composeCollection(CN, ctx, token, props, onError) {
		const tagToken = props.tag;
		const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
		if (token.type === "block-seq") {
			const { anchor, newlineAfterProp: nl } = props;
			const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
			if (lastProp && (!nl || nl.offset < lastProp.offset)) onError(lastProp, "MISSING_CHAR", "Missing newline after block sequence props");
		}
		const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
		if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") return resolveCollection(CN, ctx, token, onError, tagName);
		let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
		if (!tag) {
			const kt = ctx.schema.knownTags[tagName];
			if (kt?.collection === expType) {
				ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
				tag = kt;
			} else {
				if (kt) onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
				else onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
				return resolveCollection(CN, ctx, token, onError, tagName);
			}
		}
		const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
		const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
		const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
		node.range = coll.range;
		node.tag = tagName;
		if (tag?.format) node.format = tag.format;
		return node;
	}
	exports.composeCollection = composeCollection;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	function resolveBlockScalar(ctx, scalar, onError) {
		const start = scalar.offset;
		const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
		if (!header) return {
			value: "",
			type: null,
			comment: "",
			range: [
				start,
				start,
				start
			]
		};
		const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
		const lines = scalar.source ? splitLines(scalar.source) : [];
		let chompStart = lines.length;
		for (let i = lines.length - 1; i >= 0; --i) {
			const content = lines[i][1];
			if (content === "" || content === "\r") chompStart = i;
			else break;
		}
		if (chompStart === 0) {
			const value = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
			let end = start + header.length;
			if (scalar.source) end += scalar.source.length;
			return {
				value,
				type,
				comment: header.comment,
				range: [
					start,
					end,
					end
				]
			};
		}
		let trimIndent = scalar.indent + header.indent;
		let offset = scalar.offset + header.length;
		let contentStart = 0;
		for (let i = 0; i < chompStart; ++i) {
			const [indent, content] = lines[i];
			if (content === "" || content === "\r") {
				if (header.indent === 0 && indent.length > trimIndent) trimIndent = indent.length;
			} else {
				if (indent.length < trimIndent) onError(offset + indent.length, "MISSING_CHAR", "Block scalars with more-indented leading empty lines must use an explicit indentation indicator");
				if (header.indent === 0) trimIndent = indent.length;
				contentStart = i;
				if (trimIndent === 0 && !ctx.atRoot) onError(offset, "BAD_INDENT", "Block scalar values in collections must be indented");
				break;
			}
			offset += indent.length + content.length + 1;
		}
		for (let i = lines.length - 1; i >= chompStart; --i) if (lines[i][0].length > trimIndent) chompStart = i + 1;
		let value = "";
		let sep = "";
		let prevMoreIndented = false;
		for (let i = 0; i < contentStart; ++i) value += lines[i][0].slice(trimIndent) + "\n";
		for (let i = contentStart; i < chompStart; ++i) {
			let [indent, content] = lines[i];
			offset += indent.length + content.length + 1;
			const crlf = content[content.length - 1] === "\r";
			if (crlf) content = content.slice(0, -1);
			/* istanbul ignore if already caught in lexer */
			if (content && indent.length < trimIndent) {
				const message = `Block scalar lines must not be less indented than their ${header.indent ? "explicit indentation indicator" : "first line"}`;
				onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
				indent = "";
			}
			if (type === Scalar.Scalar.BLOCK_LITERAL) {
				value += sep + indent.slice(trimIndent) + content;
				sep = "\n";
			} else if (indent.length > trimIndent || content[0] === "	") {
				if (sep === " ") sep = "\n";
				else if (!prevMoreIndented && sep === "\n") sep = "\n\n";
				value += sep + indent.slice(trimIndent) + content;
				sep = "\n";
				prevMoreIndented = true;
			} else if (content === "") if (sep === "\n") value += "\n";
			else sep = "\n";
			else {
				value += sep + content;
				sep = " ";
				prevMoreIndented = false;
			}
		}
		switch (header.chomp) {
			case "-": break;
			case "+":
				for (let i = chompStart; i < lines.length; ++i) value += "\n" + lines[i][0].slice(trimIndent);
				if (value[value.length - 1] !== "\n") value += "\n";
				break;
			default: value += "\n";
		}
		const end = start + header.length + scalar.source.length;
		return {
			value,
			type,
			comment: header.comment,
			range: [
				start,
				end,
				end
			]
		};
	}
	function parseBlockScalarHeader({ offset, props }, strict, onError) {
		/* istanbul ignore if should not happen */
		if (props[0].type !== "block-scalar-header") {
			onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
			return null;
		}
		const { source } = props[0];
		const mode = source[0];
		let indent = 0;
		let chomp = "";
		let error = -1;
		for (let i = 1; i < source.length; ++i) {
			const ch = source[i];
			if (!chomp && (ch === "-" || ch === "+")) chomp = ch;
			else {
				const n = Number(ch);
				if (!indent && n) indent = n;
				else if (error === -1) error = offset + i;
			}
		}
		if (error !== -1) onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
		let hasSpace = false;
		let comment = "";
		let length = source.length;
		for (let i = 1; i < props.length; ++i) {
			const token = props[i];
			switch (token.type) {
				case "space": hasSpace = true;
				case "newline":
					length += token.source.length;
					break;
				case "comment":
					if (strict && !hasSpace) onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
					length += token.source.length;
					comment = token.source.substring(1);
					break;
				case "error":
					onError(token, "UNEXPECTED_TOKEN", token.message);
					length += token.source.length;
					break;
				/* istanbul ignore next should not happen */
				default: {
					onError(token, "UNEXPECTED_TOKEN", `Unexpected token in block scalar header: ${token.type}`);
					const ts = token.source;
					if (ts && typeof ts === "string") length += ts.length;
				}
			}
		}
		return {
			mode,
			indent,
			chomp,
			comment,
			length
		};
	}
	/** @returns Array of lines split up as `[indent, content]` */
	function splitLines(source) {
		const split = source.split(/\n( *)/);
		const first = split[0];
		const m = first.match(/^( *)/);
		const lines = [m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first]];
		for (let i = 1; i < split.length; i += 2) lines.push([split[i], split[i + 1]]);
		return lines;
	}
	exports.resolveBlockScalar = resolveBlockScalar;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scalar = require_Scalar();
	var resolveEnd = require_resolve_end();
	function resolveFlowScalar(scalar, strict, onError) {
		const { offset, type, source, end } = scalar;
		let _type;
		let value;
		const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
		switch (type) {
			case "scalar":
				_type = Scalar.Scalar.PLAIN;
				value = plainValue(source, _onError);
				break;
			case "single-quoted-scalar":
				_type = Scalar.Scalar.QUOTE_SINGLE;
				value = singleQuotedValue(source, _onError);
				break;
			case "double-quoted-scalar":
				_type = Scalar.Scalar.QUOTE_DOUBLE;
				value = doubleQuotedValue(source, _onError);
				break;
			/* istanbul ignore next should not happen */
			default:
				onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
				return {
					value: "",
					type: null,
					comment: "",
					range: [
						offset,
						offset + source.length,
						offset + source.length
					]
				};
		}
		const valueEnd = offset + source.length;
		const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
		return {
			value,
			type: _type,
			comment: re.comment,
			range: [
				offset,
				valueEnd,
				re.offset
			]
		};
	}
	function plainValue(source, onError) {
		let badChar = "";
		switch (source[0]) {
			/* istanbul ignore next should not happen */
			case "	":
				badChar = "a tab character";
				break;
			case ",":
				badChar = "flow indicator character ,";
				break;
			case "%":
				badChar = "directive indicator character %";
				break;
			case "|":
			case ">":
				badChar = `block scalar indicator ${source[0]}`;
				break;
			case "@":
			case "`":
				badChar = `reserved character ${source[0]}`;
				break;
		}
		if (badChar) onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
		return unfoldLines(source);
	}
	function singleQuotedValue(source, onError) {
		if (source[source.length - 1] !== "'" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
		return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
	}
	function unfoldLines(source) {
		const line = /(.*?)\r?\n/sy;
		let match = line.exec(source);
		if (!match) return source;
		/**
		* The negative lookbehinds in these RegExps are to
		* prevent causing a polynomial search time in certain cases.
		*
		* The try-catch is for Safari < 16.4 and other old browsers:
		* https://caniuse.com/js-regexp-lookbehind
		*/
		let trimEnd, trimBoth;
		try {
			trimEnd = /* @__PURE__ */ new RegExp("(?<![ 	])[ 	]+$");
			trimBoth = /* @__PURE__ */ new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
		} catch {
			trimEnd = /[ \t]+$/;
			trimBoth = /^[ \t]+|[ \t]+$/g;
		}
		let res = match[1].replace(trimEnd, "");
		let sep = " ";
		let pos = line.lastIndex;
		while (match = line.exec(source)) {
			const lm = match[1].replace(trimBoth, "");
			if (lm === "") if (sep === "\n") res += sep;
			else sep = "\n";
			else {
				res += sep + lm;
				sep = " ";
			}
			pos = line.lastIndex;
		}
		const last = /[ \t]*(.*)/sy;
		last.lastIndex = pos;
		match = last.exec(source);
		return res + sep + (match?.[1] ?? "");
	}
	function doubleQuotedValue(source, onError) {
		let res = "";
		for (let i = 1; i < source.length - 1; ++i) {
			const ch = source[i];
			if (ch === "\r" && source[i + 1] === "\n") continue;
			if (ch === "\n") {
				const { fold, offset } = foldNewline(source, i);
				res += fold;
				i = offset;
			} else if (ch === "\\") {
				let next = source[++i];
				const cc = escapeCodes[next];
				if (cc) res += cc;
				else if (next === "\n") {
					next = source[i + 1];
					while (next === " " || next === "	") next = source[++i + 1];
				} else if (next === "\r" && source[i + 1] === "\n") {
					next = source[++i + 1];
					while (next === " " || next === "	") next = source[++i + 1];
				} else if (next === "x" || next === "u" || next === "U") {
					const length = next === "x" ? 2 : next === "u" ? 4 : 8;
					res += parseCharCode(source, i + 1, length, onError);
					i += length;
				} else {
					const raw = source.substr(i - 1, 2);
					onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
					res += raw;
				}
			} else if (ch === " " || ch === "	") {
				const wsStart = i;
				let next = source[i + 1];
				while (next === " " || next === "	") next = source[++i + 1];
				if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n")) res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
			} else res += ch;
		}
		if (source[source.length - 1] !== "\"" || source.length === 1) onError(source.length, "MISSING_CHAR", "Missing closing \"quote");
		return res;
	}
	/**
	* Fold a single newline into a space, multiple newlines to N - 1 newlines.
	* Presumes `source[offset] === '\n'`
	*/
	function foldNewline(source, offset) {
		let fold = "";
		let ch = source[offset + 1];
		while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
			if (ch === "\r" && source[offset + 2] !== "\n") break;
			if (ch === "\n") fold += "\n";
			offset += 1;
			ch = source[offset + 1];
		}
		if (!fold) fold = " ";
		return {
			fold,
			offset
		};
	}
	const escapeCodes = {
		"0": "\0",
		a: "\x07",
		b: "\b",
		e: "\x1B",
		f: "\f",
		n: "\n",
		r: "\r",
		t: "	",
		v: "\v",
		N: "",
		_: "\xA0",
		L: "\u2028",
		P: "\u2029",
		" ": " ",
		"\"": "\"",
		"/": "/",
		"\\": "\\",
		"	": "	"
	};
	function parseCharCode(source, offset, length, onError) {
		const cc = source.substr(offset, length);
		const code = cc.length === length && /^[0-9a-fA-F]+$/.test(cc) ? parseInt(cc, 16) : NaN;
		try {
			return String.fromCodePoint(code);
		} catch {
			const raw = source.substr(offset - 2, length + 2);
			onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
			return raw;
		}
	}
	exports.resolveFlowScalar = resolveFlowScalar;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = /* @__PURE__ */ __commonJSMin(((exports) => {
	var identity = require_identity();
	var Scalar = require_Scalar();
	var resolveBlockScalar = require_resolve_block_scalar();
	var resolveFlowScalar = require_resolve_flow_scalar();
	function composeScalar(ctx, token, tagToken, onError) {
		const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
		const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
		let tag;
		if (ctx.options.stringKeys && ctx.atKey) tag = ctx.schema[identity.SCALAR];
		else if (tagName) tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
		else if (token.type === "scalar") tag = findScalarTagByTest(ctx, value, token, onError);
		else tag = ctx.schema[identity.SCALAR];
		let scalar;
		try {
			const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
			scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
			scalar = new Scalar.Scalar(value);
		}
		scalar.range = range;
		scalar.source = value;
		if (type) scalar.type = type;
		if (tagName) scalar.tag = tagName;
		if (tag.format) scalar.format = tag.format;
		if (comment) scalar.comment = comment;
		return scalar;
	}
	function findScalarTagByName(schema, value, tagName, tagToken, onError) {
		if (tagName === "!") return schema[identity.SCALAR];
		const matchWithTest = [];
		for (const tag of schema.tags) if (!tag.collection && tag.tag === tagName) if (tag.default && tag.test) matchWithTest.push(tag);
		else return tag;
		for (const tag of matchWithTest) if (tag.test?.test(value)) return tag;
		const kt = schema.knownTags[tagName];
		if (kt && !kt.collection) {
			schema.tags.push(Object.assign({}, kt, {
				default: false,
				test: void 0
			}));
			return kt;
		}
		onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
		return schema[identity.SCALAR];
	}
	function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
		const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[identity.SCALAR];
		if (schema.compat) {
			const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[identity.SCALAR];
			if (tag.tag !== compat.tag) onError(token, "TAG_RESOLVE_FAILED", `Value may be parsed as either ${directives.tagString(tag.tag)} or ${directives.tagString(compat.tag)}`, true);
		}
		return tag;
	}
	exports.composeScalar = composeScalar;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = /* @__PURE__ */ __commonJSMin(((exports) => {
	function emptyScalarPosition(offset, before, pos) {
		if (before) {
			pos ?? (pos = before.length);
			for (let i = pos - 1; i >= 0; --i) {
				let st = before[i];
				switch (st.type) {
					case "space":
					case "comment":
					case "newline":
						offset -= st.source.length;
						continue;
				}
				st = before[++i];
				while (st?.type === "space") {
					offset += st.source.length;
					st = before[++i];
				}
				break;
			}
		}
		return offset;
	}
	exports.emptyScalarPosition = emptyScalarPosition;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Alias = require_Alias();
	var identity = require_identity();
	var composeCollection = require_compose_collection();
	var composeScalar = require_compose_scalar();
	var resolveEnd = require_resolve_end();
	var utilEmptyScalarPosition = require_util_empty_scalar_position();
	const CN = {
		composeNode,
		composeEmptyNode
	};
	function composeNode(ctx, token, props, onError) {
		const atKey = ctx.atKey;
		const { spaceBefore, comment, anchor, tag } = props;
		let node;
		let isSrcToken = true;
		switch (token.type) {
			case "alias":
				node = composeAlias(ctx, token, onError);
				if (anchor || tag) onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
				break;
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar":
			case "block-scalar":
				node = composeScalar.composeScalar(ctx, token, tag, onError);
				if (anchor) node.anchor = anchor.source.substring(1);
				break;
			case "block-map":
			case "block-seq":
			case "flow-collection":
				try {
					node = composeCollection.composeCollection(CN, ctx, token, props, onError);
					if (anchor) node.anchor = anchor.source.substring(1);
				} catch (error) {
					onError(token, "RESOURCE_EXHAUSTION", error instanceof Error ? error.message : String(error));
				}
				break;
			default:
				onError(token, "UNEXPECTED_TOKEN", token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`);
				isSrcToken = false;
		}
		node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
		if (anchor && node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
		if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) onError(tag ?? token, "NON_STRING_KEY", "With stringKeys, all keys must be strings");
		if (spaceBefore) node.spaceBefore = true;
		if (comment) if (token.type === "scalar" && token.source === "") node.comment = comment;
		else node.commentBefore = comment;
		if (ctx.options.keepSourceTokens && isSrcToken) node.srcToken = token;
		return node;
	}
	function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
		const token = {
			type: "scalar",
			offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
			indent: -1,
			source: ""
		};
		const node = composeScalar.composeScalar(ctx, token, tag, onError);
		if (anchor) {
			node.anchor = anchor.source.substring(1);
			if (node.anchor === "") onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
		}
		if (spaceBefore) node.spaceBefore = true;
		if (comment) {
			node.comment = comment;
			node.range[2] = end;
		}
		return node;
	}
	function composeAlias({ options }, { offset, source, end }, onError) {
		const alias = new Alias.Alias(source.substring(1));
		if (alias.source === "") onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
		if (alias.source.endsWith(":")) onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
		const valueEnd = offset + source.length;
		const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
		alias.range = [
			offset,
			valueEnd,
			re.offset
		];
		if (re.comment) alias.comment = re.comment;
		return alias;
	}
	exports.composeEmptyNode = composeEmptyNode;
	exports.composeNode = composeNode;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Document = require_Document();
	var composeNode = require_compose_node();
	var resolveEnd = require_resolve_end();
	var resolveProps = require_resolve_props();
	function composeDoc(options, directives, { offset, start, value, end }, onError) {
		const opts = Object.assign({ _directives: directives }, options);
		const doc = new Document.Document(void 0, opts);
		const ctx = {
			atKey: false,
			atRoot: true,
			directives: doc.directives,
			options: doc.options,
			schema: doc.schema
		};
		const props = resolveProps.resolveProps(start, {
			indicator: "doc-start",
			next: value ?? end?.[0],
			offset,
			onError,
			parentIndent: 0,
			startOnNewline: true
		});
		if (props.found) {
			doc.directives.docStart = true;
			if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline) onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
		}
		doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
		const contentEnd = doc.contents.range[2];
		const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
		if (re.comment) doc.comment = re.comment;
		doc.range = [
			offset,
			contentEnd,
			re.offset
		];
		return doc;
	}
	exports.composeDoc = composeDoc;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js
var require_composer = /* @__PURE__ */ __commonJSMin(((exports) => {
	var node_process$1 = __require("process");
	var directives = require_directives();
	var Document = require_Document();
	var errors = require_errors();
	var identity = require_identity();
	var composeDoc = require_compose_doc();
	var resolveEnd = require_resolve_end();
	function getErrorPos(src) {
		if (typeof src === "number") return [src, src + 1];
		if (Array.isArray(src)) return src.length === 2 ? src : [src[0], src[1]];
		const { offset, source } = src;
		return [offset, offset + (typeof source === "string" ? source.length : 1)];
	}
	function parsePrelude(prelude) {
		let comment = "";
		let atComment = false;
		let afterEmptyLine = false;
		for (let i = 0; i < prelude.length; ++i) {
			const source = prelude[i];
			switch (source[0]) {
				case "#":
					comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
					atComment = true;
					afterEmptyLine = false;
					break;
				case "%":
					if (prelude[i + 1]?.[0] !== "#") i += 1;
					atComment = false;
					break;
				default:
					if (!atComment) afterEmptyLine = true;
					atComment = false;
			}
		}
		return {
			comment,
			afterEmptyLine
		};
	}
	/**
	* Compose a stream of CST nodes into a stream of YAML Documents.
	*
	* ```ts
	* import { Composer, Parser } from 'yaml'
	*
	* const src: string = ...
	* const tokens = new Parser().parse(src)
	* const docs = new Composer().compose(tokens)
	* ```
	*/
	var Composer = class {
		constructor(options = {}) {
			this.doc = null;
			this.atDirectives = false;
			this.prelude = [];
			this.errors = [];
			this.warnings = [];
			this.onError = (source, code, message, warning) => {
				const pos = getErrorPos(source);
				if (warning) this.warnings.push(new errors.YAMLWarning(pos, code, message));
				else this.errors.push(new errors.YAMLParseError(pos, code, message));
			};
			this.directives = new directives.Directives({ version: options.version || "1.2" });
			this.options = options;
		}
		decorate(doc, afterDoc) {
			const { comment, afterEmptyLine } = parsePrelude(this.prelude);
			if (comment) {
				const dc = doc.contents;
				if (afterDoc) doc.comment = doc.comment ? `${doc.comment}\n${comment}` : comment;
				else if (afterEmptyLine || doc.directives.docStart || !dc) doc.commentBefore = comment;
				else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
					let it = dc.items[0];
					if (identity.isPair(it)) it = it.key;
					const cb = it.commentBefore;
					it.commentBefore = cb ? `${comment}\n${cb}` : comment;
				} else {
					const cb = dc.commentBefore;
					dc.commentBefore = cb ? `${comment}\n${cb}` : comment;
				}
			}
			if (afterDoc) {
				for (let i = 0; i < this.errors.length; ++i) doc.errors.push(this.errors[i]);
				for (let i = 0; i < this.warnings.length; ++i) doc.warnings.push(this.warnings[i]);
			} else {
				doc.errors = this.errors;
				doc.warnings = this.warnings;
			}
			this.prelude = [];
			this.errors = [];
			this.warnings = [];
		}
		/**
		* Current stream status information.
		*
		* Mostly useful at the end of input for an empty stream.
		*/
		streamInfo() {
			return {
				comment: parsePrelude(this.prelude).comment,
				directives: this.directives,
				errors: this.errors,
				warnings: this.warnings
			};
		}
		/**
		* Compose tokens into documents.
		*
		* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
		* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
		*/
		*compose(tokens, forceDoc = false, endOffset = -1) {
			for (const token of tokens) yield* this.next(token);
			yield* this.end(forceDoc, endOffset);
		}
		/** Advance the composer by one CST token. */
		*next(token) {
			if (node_process$1.env.LOG_STREAM) console.dir(token, { depth: null });
			switch (token.type) {
				case "directive":
					this.directives.add(token.source, (offset, message, warning) => {
						const pos = getErrorPos(token);
						pos[0] += offset;
						this.onError(pos, "BAD_DIRECTIVE", message, warning);
					});
					this.prelude.push(token.source);
					this.atDirectives = true;
					break;
				case "document": {
					const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
					if (this.atDirectives && !doc.directives.docStart) this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
					this.decorate(doc, false);
					if (this.doc) yield this.doc;
					this.doc = doc;
					this.atDirectives = false;
					break;
				}
				case "byte-order-mark":
				case "space": break;
				case "comment":
				case "newline":
					this.prelude.push(token.source);
					break;
				case "error": {
					const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
					const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
					if (this.atDirectives || !this.doc) this.errors.push(error);
					else this.doc.errors.push(error);
					break;
				}
				case "doc-end": {
					if (!this.doc) {
						this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", "Unexpected doc-end without preceding document"));
						break;
					}
					this.doc.directives.docEnd = true;
					const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
					this.decorate(this.doc, true);
					if (end.comment) {
						const dc = this.doc.comment;
						this.doc.comment = dc ? `${dc}\n${end.comment}` : end.comment;
					}
					this.doc.range[2] = end.offset;
					break;
				}
				default: this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
			}
		}
		/**
		* Call at end of input to yield any remaining document.
		*
		* @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
		* @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
		*/
		*end(forceDoc = false, endOffset = -1) {
			if (this.doc) {
				this.decorate(this.doc, true);
				yield this.doc;
				this.doc = null;
			} else if (forceDoc) {
				const opts = Object.assign({ _directives: this.directives }, this.options);
				const doc = new Document.Document(void 0, opts);
				if (this.atDirectives) this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
				doc.range = [
					0,
					endOffset,
					endOffset
				];
				this.decorate(doc, false);
				yield doc;
			}
		}
	};
	exports.Composer = Composer;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = /* @__PURE__ */ __commonJSMin(((exports) => {
	var resolveBlockScalar = require_resolve_block_scalar();
	var resolveFlowScalar = require_resolve_flow_scalar();
	var errors = require_errors();
	var stringifyString = require_stringifyString();
	function resolveAsScalar(token, strict = true, onError) {
		if (token) {
			const _onError = (pos, code, message) => {
				const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
				if (onError) onError(offset, code, message);
				else throw new errors.YAMLParseError([offset, offset + 1], code, message);
			};
			switch (token.type) {
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
				case "block-scalar": return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
			}
		}
		return null;
	}
	/**
	* Create a new scalar token with `value`
	*
	* Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
	* as this function does not support any schema operations and won't check for such conflicts.
	*
	* @param value The string representation of the value, which will have its content properly indented.
	* @param context.end Comments and whitespace after the end of the value, or after the block scalar header. If undefined, a newline will be added.
	* @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
	* @param context.indent The indent level of the token.
	* @param context.inFlow Is this scalar within a flow collection? This may affect the resolved type of the token's value.
	* @param context.offset The offset position of the token.
	* @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
	*/
	function createScalarToken(value, context) {
		const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
		const source = stringifyString.stringifyString({
			type,
			value
		}, {
			implicitKey,
			indent: indent > 0 ? " ".repeat(indent) : "",
			inFlow,
			options: {
				blockQuote: true,
				lineWidth: -1
			}
		});
		const end = context.end ?? [{
			type: "newline",
			offset: -1,
			indent,
			source: "\n"
		}];
		switch (source[0]) {
			case "|":
			case ">": {
				const he = source.indexOf("\n");
				const head = source.substring(0, he);
				const body = source.substring(he + 1) + "\n";
				const props = [{
					type: "block-scalar-header",
					offset,
					indent,
					source: head
				}];
				if (!addEndtoBlockProps(props, end)) props.push({
					type: "newline",
					offset: -1,
					indent,
					source: "\n"
				});
				return {
					type: "block-scalar",
					offset,
					indent,
					props,
					source: body
				};
			}
			case "\"": return {
				type: "double-quoted-scalar",
				offset,
				indent,
				source,
				end
			};
			case "'": return {
				type: "single-quoted-scalar",
				offset,
				indent,
				source,
				end
			};
			default: return {
				type: "scalar",
				offset,
				indent,
				source,
				end
			};
		}
	}
	/**
	* Set the value of `token` to the given string `value`, overwriting any previous contents and type that it may have.
	*
	* Best efforts are made to retain any comments previously associated with the `token`,
	* though all contents within a collection's `items` will be overwritten.
	*
	* Values that represent an actual string but may be parsed as a different type should use a `type` other than `'PLAIN'`,
	* as this function does not support any schema operations and won't check for such conflicts.
	*
	* @param token Any token. If it does not include an `indent` value, the value will be stringified as if it were an implicit key.
	* @param value The string representation of the value, which will have its content properly indented.
	* @param context.afterKey In most cases, values after a key should have an additional level of indentation.
	* @param context.implicitKey Being within an implicit key may affect the resolved type of the token's value.
	* @param context.inFlow Being within a flow collection may affect the resolved type of the token's value.
	* @param context.type The preferred type of the scalar token. If undefined, the previous type of the `token` will be used, defaulting to `'PLAIN'`.
	*/
	function setScalarValue(token, value, context = {}) {
		let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
		let indent = "indent" in token ? token.indent : null;
		if (afterKey && typeof indent === "number") indent += 2;
		if (!type) switch (token.type) {
			case "single-quoted-scalar":
				type = "QUOTE_SINGLE";
				break;
			case "double-quoted-scalar":
				type = "QUOTE_DOUBLE";
				break;
			case "block-scalar": {
				const header = token.props[0];
				if (header.type !== "block-scalar-header") throw new Error("Invalid block scalar header");
				type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
				break;
			}
			default: type = "PLAIN";
		}
		const source = stringifyString.stringifyString({
			type,
			value
		}, {
			implicitKey: implicitKey || indent === null,
			indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
			inFlow,
			options: {
				blockQuote: true,
				lineWidth: -1
			}
		});
		switch (source[0]) {
			case "|":
			case ">":
				setBlockScalarValue(token, source);
				break;
			case "\"":
				setFlowScalarValue(token, source, "double-quoted-scalar");
				break;
			case "'":
				setFlowScalarValue(token, source, "single-quoted-scalar");
				break;
			default: setFlowScalarValue(token, source, "scalar");
		}
	}
	function setBlockScalarValue(token, source) {
		const he = source.indexOf("\n");
		const head = source.substring(0, he);
		const body = source.substring(he + 1) + "\n";
		if (token.type === "block-scalar") {
			const header = token.props[0];
			if (header.type !== "block-scalar-header") throw new Error("Invalid block scalar header");
			header.source = head;
			token.source = body;
		} else {
			const { offset } = token;
			const indent = "indent" in token ? token.indent : -1;
			const props = [{
				type: "block-scalar-header",
				offset,
				indent,
				source: head
			}];
			if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0)) props.push({
				type: "newline",
				offset: -1,
				indent,
				source: "\n"
			});
			for (const key of Object.keys(token)) if (key !== "type" && key !== "offset") delete token[key];
			Object.assign(token, {
				type: "block-scalar",
				indent,
				props,
				source: body
			});
		}
	}
	/** @returns `true` if last token is a newline */
	function addEndtoBlockProps(props, end) {
		if (end) for (const st of end) switch (st.type) {
			case "space":
			case "comment":
				props.push(st);
				break;
			case "newline":
				props.push(st);
				return true;
		}
		return false;
	}
	function setFlowScalarValue(token, source, type) {
		switch (token.type) {
			case "scalar":
			case "double-quoted-scalar":
			case "single-quoted-scalar":
				token.type = type;
				token.source = source;
				break;
			case "block-scalar": {
				const end = token.props.slice(1);
				let oa = source.length;
				if (token.props[0].type === "block-scalar-header") oa -= token.props[0].source.length;
				for (const tok of end) tok.offset += oa;
				delete token.props;
				Object.assign(token, {
					type,
					source,
					end
				});
				break;
			}
			case "block-map":
			case "block-seq": {
				const nl = {
					type: "newline",
					offset: token.offset + source.length,
					indent: token.indent,
					source: "\n"
				};
				delete token.items;
				Object.assign(token, {
					type,
					source,
					end: [nl]
				});
				break;
			}
			default: {
				const indent = "indent" in token ? token.indent : -1;
				const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
				for (const key of Object.keys(token)) if (key !== "type" && key !== "offset") delete token[key];
				Object.assign(token, {
					type,
					indent,
					source,
					end
				});
			}
		}
	}
	exports.createScalarToken = createScalarToken;
	exports.resolveAsScalar = resolveAsScalar;
	exports.setScalarValue = setScalarValue;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Stringify a CST document, token, or collection item
	*
	* Fair warning: This applies no validation whatsoever, and
	* simply concatenates the sources in their logical order.
	*/
	const stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
	function stringifyToken(token) {
		switch (token.type) {
			case "block-scalar": {
				let res = "";
				for (const tok of token.props) res += stringifyToken(tok);
				return res + token.source;
			}
			case "block-map":
			case "block-seq": {
				let res = "";
				for (const item of token.items) res += stringifyItem(item);
				return res;
			}
			case "flow-collection": {
				let res = token.start.source;
				for (const item of token.items) res += stringifyItem(item);
				for (const st of token.end) res += st.source;
				return res;
			}
			case "document": {
				let res = stringifyItem(token);
				if (token.end) for (const st of token.end) res += st.source;
				return res;
			}
			default: {
				let res = token.source;
				if ("end" in token && token.end) for (const st of token.end) res += st.source;
				return res;
			}
		}
	}
	function stringifyItem({ start, key, sep, value }) {
		let res = "";
		for (const st of start) res += st.source;
		if (key) res += stringifyToken(key);
		if (sep) for (const st of sep) res += st.source;
		if (value) res += stringifyToken(value);
		return res;
	}
	exports.stringify = stringify;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = /* @__PURE__ */ __commonJSMin(((exports) => {
	const BREAK = Symbol("break visit");
	const SKIP = Symbol("skip children");
	const REMOVE = Symbol("remove item");
	/**
	* Apply a visitor to a CST document or item.
	*
	* Walks through the tree (depth-first) starting from the root, calling a
	* `visitor` function with two arguments when entering each item:
	*   - `item`: The current item, which included the following members:
	*     - `start: SourceToken[]` – Source tokens before the key or value,
	*       possibly including its anchor or tag.
	*     - `key?: Token | null` – Set for pair values. May then be `null`, if
	*       the key before the `:` separator is empty.
	*     - `sep?: SourceToken[]` – Source tokens between the key and the value,
	*       which should include the `:` map value indicator if `value` is set.
	*     - `value?: Token` – The value of a sequence item, or of a map pair.
	*   - `path`: The steps from the root to the current node, as an array of
	*     `['key' | 'value', number]` tuples.
	*
	* The return value of the visitor may be used to control the traversal:
	*   - `undefined` (default): Do nothing and continue
	*   - `visit.SKIP`: Do not visit the children of this token, continue with
	*      next sibling
	*   - `visit.BREAK`: Terminate traversal completely
	*   - `visit.REMOVE`: Remove the current item, then continue with the next one
	*   - `number`: Set the index of the next step. This is useful especially if
	*     the index of the current token has changed.
	*   - `function`: Define the next visitor for this item. After the original
	*     visitor is called on item entry, next visitors are called after handling
	*     a non-empty `key` and when exiting the item.
	*/
	function visit(cst, visitor) {
		if ("type" in cst && cst.type === "document") cst = {
			start: cst.start,
			value: cst.value
		};
		_visit(Object.freeze([]), cst, visitor);
	}
	/** Terminate visit traversal completely */
	visit.BREAK = BREAK;
	/** Do not visit the children of the current item */
	visit.SKIP = SKIP;
	/** Remove the current item */
	visit.REMOVE = REMOVE;
	/** Find the item at `path` from `cst` as the root */
	visit.itemAtPath = (cst, path) => {
		let item = cst;
		for (const [field, index] of path) {
			const tok = item?.[field];
			if (tok && "items" in tok) item = tok.items[index];
			else return void 0;
		}
		return item;
	};
	/**
	* Get the immediate parent collection of the item at `path` from `cst` as the root.
	*
	* Throws an error if the collection is not found, which should never happen if the item itself exists.
	*/
	visit.parentCollection = (cst, path) => {
		const parent = visit.itemAtPath(cst, path.slice(0, -1));
		const field = path[path.length - 1][0];
		const coll = parent?.[field];
		if (coll && "items" in coll) return coll;
		throw new Error("Parent collection not found");
	};
	function _visit(path, item, visitor) {
		let ctrl = visitor(item, path);
		if (typeof ctrl === "symbol") return ctrl;
		for (const field of ["key", "value"]) {
			const token = item[field];
			if (token && "items" in token) {
				for (let i = 0; i < token.items.length; ++i) {
					const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
					if (typeof ci === "number") i = ci - 1;
					else if (ci === BREAK) return BREAK;
					else if (ci === REMOVE) {
						token.items.splice(i, 1);
						i -= 1;
					}
				}
				if (typeof ctrl === "function" && field === "key") ctrl = ctrl(item, path);
			}
		}
		return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
	}
	exports.visit = visit;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js
var require_cst = /* @__PURE__ */ __commonJSMin(((exports) => {
	var cstScalar = require_cst_scalar();
	var cstStringify = require_cst_stringify();
	var cstVisit = require_cst_visit();
	/** The byte order mark */
	const BOM = "﻿";
	/** Start of doc-mode */
	const DOCUMENT = "";
	/** Unexpected end of flow-mode */
	const FLOW_END = "";
	/** Next token is a scalar value */
	const SCALAR = "";
	/** @returns `true` if `token` is a flow or block collection */
	const isCollection = (token) => !!token && "items" in token;
	/** @returns `true` if `token` is a flow or block scalar; not an alias */
	const isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
	/* istanbul ignore next */
	/** Get a printable representation of a lexer token */
	function prettyToken(token) {
		switch (token) {
			case BOM: return "<BOM>";
			case DOCUMENT: return "<DOC>";
			case FLOW_END: return "<FLOW_END>";
			case SCALAR: return "<SCALAR>";
			default: return JSON.stringify(token);
		}
	}
	/** Identify the type of a lexer token. May return `null` for unknown tokens. */
	function tokenType(source) {
		switch (source) {
			case BOM: return "byte-order-mark";
			case DOCUMENT: return "doc-mode";
			case FLOW_END: return "flow-error-end";
			case SCALAR: return "scalar";
			case "---": return "doc-start";
			case "...": return "doc-end";
			case "":
			case "\n":
			case "\r\n": return "newline";
			case "-": return "seq-item-ind";
			case "?": return "explicit-key-ind";
			case ":": return "map-value-ind";
			case "{": return "flow-map-start";
			case "}": return "flow-map-end";
			case "[": return "flow-seq-start";
			case "]": return "flow-seq-end";
			case ",": return "comma";
		}
		switch (source[0]) {
			case " ":
			case "	": return "space";
			case "#": return "comment";
			case "%": return "directive-line";
			case "*": return "alias";
			case "&": return "anchor";
			case "!": return "tag";
			case "'": return "single-quoted-scalar";
			case "\"": return "double-quoted-scalar";
			case "|":
			case ">": return "block-scalar-header";
		}
		return null;
	}
	exports.createScalarToken = cstScalar.createScalarToken;
	exports.resolveAsScalar = cstScalar.resolveAsScalar;
	exports.setScalarValue = cstScalar.setScalarValue;
	exports.stringify = cstStringify.stringify;
	exports.visit = cstVisit.visit;
	exports.BOM = BOM;
	exports.DOCUMENT = DOCUMENT;
	exports.FLOW_END = FLOW_END;
	exports.SCALAR = SCALAR;
	exports.isCollection = isCollection;
	exports.isScalar = isScalar;
	exports.prettyToken = prettyToken;
	exports.tokenType = tokenType;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js
var require_lexer = /* @__PURE__ */ __commonJSMin(((exports) => {
	var cst = require_cst();
	function isEmpty(ch) {
		switch (ch) {
			case void 0:
			case " ":
			case "\n":
			case "\r":
			case "	": return true;
			default: return false;
		}
	}
	const hexDigits = /* @__PURE__ */ new Set("0123456789ABCDEFabcdef");
	const tagChars = /* @__PURE__ */ new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
	const flowIndicatorChars = /* @__PURE__ */ new Set(",[]{}");
	const invalidAnchorChars = /* @__PURE__ */ new Set(" ,[]{}\n\r	");
	const isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
	/**
	* Splits an input string into lexical tokens, i.e. smaller strings that are
	* easily identifiable by `tokens.tokenType()`.
	*
	* Lexing starts always in a "stream" context. Incomplete input may be buffered
	* until a complete token can be emitted.
	*
	* In addition to slices of the original input, the following control characters
	* may also be emitted:
	*
	* - `\x02` (Start of Text): A document starts with the next token
	* - `\x18` (Cancel): Unexpected end of flow-mode (indicates an error)
	* - `\x1f` (Unit Separator): Next token is a scalar value
	* - `\u{FEFF}` (Byte order mark): Emitted separately outside documents
	*/
	var Lexer = class {
		constructor() {
			/**
			* Flag indicating whether the end of the current buffer marks the end of
			* all input
			*/
			this.atEnd = false;
			/**
			* Explicit indent set in block scalar header, as an offset from the current
			* minimum indent, so e.g. set to 1 from a header `|2+`. Set to -1 if not
			* explicitly set.
			*/
			this.blockScalarIndent = -1;
			/**
			* Block scalars that include a + (keep) chomping indicator in their header
			* include trailing empty lines, which are otherwise excluded from the
			* scalar's contents.
			*/
			this.blockScalarKeep = false;
			/** Current input */
			this.buffer = "";
			/**
			* Flag noting whether the map value indicator : can immediately follow this
			* node within a flow context.
			*/
			this.flowKey = false;
			/** Count of surrounding flow collection levels. */
			this.flowLevel = 0;
			/**
			* Minimum level of indentation required for next lines to be parsed as a
			* part of the current scalar value.
			*/
			this.indentNext = 0;
			/** Indentation level of the current line. */
			this.indentValue = 0;
			/** Position of the next \n character. */
			this.lineEndPos = null;
			/** Stores the state of the lexer if reaching the end of incpomplete input */
			this.next = null;
			/** A pointer to `buffer`; the current position of the lexer. */
			this.pos = 0;
		}
		/**
		* Generate YAML tokens from the `source` string. If `incomplete`,
		* a part of the last line may be left as a buffer for the next call.
		*
		* @returns A generator of lexical tokens
		*/
		*lex(source, incomplete = false) {
			if (source) {
				if (typeof source !== "string") throw TypeError("source is not a string");
				this.buffer = this.buffer ? this.buffer + source : source;
				this.lineEndPos = null;
			}
			this.atEnd = !incomplete;
			let next = this.next ?? "stream";
			while (next && (incomplete || this.hasChars(1))) next = yield* this.parseNext(next);
		}
		atLineEnd() {
			let i = this.pos;
			let ch = this.buffer[i];
			while (ch === " " || ch === "	") ch = this.buffer[++i];
			if (!ch || ch === "#" || ch === "\n") return true;
			if (ch === "\r") return this.buffer[i + 1] === "\n";
			return false;
		}
		charAt(n) {
			return this.buffer[this.pos + n];
		}
		continueScalar(offset) {
			let ch = this.buffer[offset];
			if (this.indentNext > 0) {
				let indent = 0;
				while (ch === " ") ch = this.buffer[++indent + offset];
				if (ch === "\r") {
					const next = this.buffer[indent + offset + 1];
					if (next === "\n" || !next && !this.atEnd) return offset + indent + 1;
				}
				return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
			}
			if (ch === "-" || ch === ".") {
				const dt = this.buffer.substr(offset, 3);
				if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3])) return -1;
			}
			return offset;
		}
		getLine() {
			let end = this.lineEndPos;
			if (typeof end !== "number" || end !== -1 && end < this.pos) {
				end = this.buffer.indexOf("\n", this.pos);
				this.lineEndPos = end;
			}
			if (end === -1) return this.atEnd ? this.buffer.substring(this.pos) : null;
			if (this.buffer[end - 1] === "\r") end -= 1;
			return this.buffer.substring(this.pos, end);
		}
		hasChars(n) {
			return this.pos + n <= this.buffer.length;
		}
		setNext(state) {
			this.buffer = this.buffer.substring(this.pos);
			this.pos = 0;
			this.lineEndPos = null;
			this.next = state;
			return null;
		}
		peek(n) {
			return this.buffer.substr(this.pos, n);
		}
		*parseNext(next) {
			switch (next) {
				case "stream": return yield* this.parseStream();
				case "line-start": return yield* this.parseLineStart();
				case "block-start": return yield* this.parseBlockStart();
				case "doc": return yield* this.parseDocument();
				case "flow": return yield* this.parseFlowCollection();
				case "quoted-scalar": return yield* this.parseQuotedScalar();
				case "block-scalar": return yield* this.parseBlockScalar();
				case "plain-scalar": return yield* this.parsePlainScalar();
			}
		}
		*parseStream() {
			let line = this.getLine();
			if (line === null) return this.setNext("stream");
			if (line[0] === cst.BOM) {
				yield* this.pushCount(1);
				line = line.substring(1);
			}
			if (line[0] === "%") {
				let dirEnd = line.length;
				let cs = line.indexOf("#");
				while (cs !== -1) {
					const ch = line[cs - 1];
					if (ch === " " || ch === "	") {
						dirEnd = cs - 1;
						break;
					} else cs = line.indexOf("#", cs + 1);
				}
				while (true) {
					const ch = line[dirEnd - 1];
					if (ch === " " || ch === "	") dirEnd -= 1;
					else break;
				}
				const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
				yield* this.pushCount(line.length - n);
				this.pushNewline();
				return "stream";
			}
			if (this.atLineEnd()) {
				const sp = yield* this.pushSpaces(true);
				yield* this.pushCount(line.length - sp);
				yield* this.pushNewline();
				return "stream";
			}
			yield cst.DOCUMENT;
			return yield* this.parseLineStart();
		}
		*parseLineStart() {
			const ch = this.charAt(0);
			if (!ch && !this.atEnd) return this.setNext("line-start");
			if (ch === "-" || ch === ".") {
				if (!this.atEnd && !this.hasChars(4)) return this.setNext("line-start");
				const s = this.peek(3);
				if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
					yield* this.pushCount(3);
					this.indentValue = 0;
					this.indentNext = 0;
					return s === "---" ? "doc" : "stream";
				}
			}
			this.indentValue = yield* this.pushSpaces(false);
			if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1))) this.indentNext = this.indentValue;
			return yield* this.parseBlockStart();
		}
		*parseBlockStart() {
			const [ch0, ch1] = this.peek(2);
			if (!ch1 && !this.atEnd) return this.setNext("block-start");
			if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
				const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
				this.indentNext = this.indentValue + 1;
				this.indentValue += n;
				return "block-start";
			}
			return "doc";
		}
		*parseDocument() {
			yield* this.pushSpaces(true);
			const line = this.getLine();
			if (line === null) return this.setNext("doc");
			let n = yield* this.pushIndicators();
			switch (line[n]) {
				case "#": yield* this.pushCount(line.length - n);
				case void 0:
					yield* this.pushNewline();
					return yield* this.parseLineStart();
				case "{":
				case "[":
					yield* this.pushCount(1);
					this.flowKey = false;
					this.flowLevel = 1;
					return "flow";
				case "}":
				case "]":
					yield* this.pushCount(1);
					return "doc";
				case "*":
					yield* this.pushUntil(isNotAnchorChar);
					return "doc";
				case "\"":
				case "'": return yield* this.parseQuotedScalar();
				case "|":
				case ">":
					n += yield* this.parseBlockScalarHeader();
					n += yield* this.pushSpaces(true);
					yield* this.pushCount(line.length - n);
					yield* this.pushNewline();
					return yield* this.parseBlockScalar();
				default: return yield* this.parsePlainScalar();
			}
		}
		*parseFlowCollection() {
			let nl, sp;
			let indent = -1;
			do {
				nl = yield* this.pushNewline();
				if (nl > 0) {
					sp = yield* this.pushSpaces(false);
					this.indentValue = indent = sp;
				} else sp = 0;
				sp += yield* this.pushSpaces(true);
			} while (nl + sp > 0);
			const line = this.getLine();
			if (line === null) return this.setNext("flow");
			if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
				if (!(indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}"))) {
					this.flowLevel = 0;
					yield cst.FLOW_END;
					return yield* this.parseLineStart();
				}
			}
			let n = 0;
			while (line[n] === ",") {
				n += yield* this.pushCount(1);
				n += yield* this.pushSpaces(true);
				this.flowKey = false;
			}
			n += yield* this.pushIndicators();
			switch (line[n]) {
				case void 0: return "flow";
				case "#":
					yield* this.pushCount(line.length - n);
					return "flow";
				case "{":
				case "[":
					yield* this.pushCount(1);
					this.flowKey = false;
					this.flowLevel += 1;
					return "flow";
				case "}":
				case "]":
					yield* this.pushCount(1);
					this.flowKey = true;
					this.flowLevel -= 1;
					return this.flowLevel ? "flow" : "doc";
				case "*":
					yield* this.pushUntil(isNotAnchorChar);
					return "flow";
				case "\"":
				case "'":
					this.flowKey = true;
					return yield* this.parseQuotedScalar();
				case ":": {
					const next = this.charAt(1);
					if (this.flowKey || isEmpty(next) || next === ",") {
						this.flowKey = false;
						yield* this.pushCount(1);
						yield* this.pushSpaces(true);
						return "flow";
					}
				}
				default:
					this.flowKey = false;
					return yield* this.parsePlainScalar();
			}
		}
		*parseQuotedScalar() {
			const quote = this.charAt(0);
			let end = this.buffer.indexOf(quote, this.pos + 1);
			if (quote === "'") while (end !== -1 && this.buffer[end + 1] === "'") end = this.buffer.indexOf("'", end + 2);
			else while (end !== -1) {
				let n = 0;
				while (this.buffer[end - 1 - n] === "\\") n += 1;
				if (n % 2 === 0) break;
				end = this.buffer.indexOf("\"", end + 1);
			}
			const qb = this.buffer.substring(0, end);
			let nl = qb.indexOf("\n", this.pos);
			if (nl !== -1) {
				while (nl !== -1) {
					const cs = this.continueScalar(nl + 1);
					if (cs === -1) break;
					nl = qb.indexOf("\n", cs);
				}
				if (nl !== -1) end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
			}
			if (end === -1) {
				if (!this.atEnd) return this.setNext("quoted-scalar");
				end = this.buffer.length;
			}
			yield* this.pushToIndex(end + 1, false);
			return this.flowLevel ? "flow" : "doc";
		}
		*parseBlockScalarHeader() {
			this.blockScalarIndent = -1;
			this.blockScalarKeep = false;
			let i = this.pos;
			while (true) {
				const ch = this.buffer[++i];
				if (ch === "+") this.blockScalarKeep = true;
				else if (ch > "0" && ch <= "9") this.blockScalarIndent = Number(ch) - 1;
				else if (ch !== "-") break;
			}
			return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
		}
		*parseBlockScalar() {
			let nl = this.pos - 1;
			let indent = 0;
			let ch;
			loop: for (let i = this.pos; ch = this.buffer[i]; ++i) switch (ch) {
				case " ":
					indent += 1;
					break;
				case "\n":
					nl = i;
					indent = 0;
					break;
				case "\r": {
					const next = this.buffer[i + 1];
					if (!next && !this.atEnd) return this.setNext("block-scalar");
					if (next === "\n") break;
				}
				default: break loop;
			}
			if (!ch && !this.atEnd) return this.setNext("block-scalar");
			if (indent >= this.indentNext) {
				if (this.blockScalarIndent === -1) this.indentNext = indent;
				else this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
				do {
					const cs = this.continueScalar(nl + 1);
					if (cs === -1) break;
					nl = this.buffer.indexOf("\n", cs);
				} while (nl !== -1);
				if (nl === -1) {
					if (!this.atEnd) return this.setNext("block-scalar");
					nl = this.buffer.length;
				}
			}
			let i = nl + 1;
			ch = this.buffer[i];
			while (ch === " ") ch = this.buffer[++i];
			if (ch === "	") {
				while (ch === "	" || ch === " " || ch === "\r" || ch === "\n") ch = this.buffer[++i];
				nl = i - 1;
			} else if (!this.blockScalarKeep) do {
				let i = nl - 1;
				let ch = this.buffer[i];
				if (ch === "\r") ch = this.buffer[--i];
				const lastChar = i;
				while (ch === " ") ch = this.buffer[--i];
				if (ch === "\n" && i >= this.pos && i + 1 + indent > lastChar) nl = i;
				else break;
			} while (true);
			yield cst.SCALAR;
			yield* this.pushToIndex(nl + 1, true);
			return yield* this.parseLineStart();
		}
		*parsePlainScalar() {
			const inFlow = this.flowLevel > 0;
			let end = this.pos - 1;
			let i = this.pos - 1;
			let ch;
			while (ch = this.buffer[++i]) if (ch === ":") {
				const next = this.buffer[i + 1];
				if (isEmpty(next) || inFlow && flowIndicatorChars.has(next)) break;
				end = i;
			} else if (isEmpty(ch)) {
				let next = this.buffer[i + 1];
				if (ch === "\r") if (next === "\n") {
					i += 1;
					ch = "\n";
					next = this.buffer[i + 1];
				} else end = i;
				if (next === "#" || inFlow && flowIndicatorChars.has(next)) break;
				if (ch === "\n") {
					const cs = this.continueScalar(i + 1);
					if (cs === -1) break;
					i = Math.max(i, cs - 2);
				}
			} else {
				if (inFlow && flowIndicatorChars.has(ch)) break;
				end = i;
			}
			if (!ch && !this.atEnd) return this.setNext("plain-scalar");
			yield cst.SCALAR;
			yield* this.pushToIndex(end + 1, true);
			return inFlow ? "flow" : "doc";
		}
		*pushCount(n) {
			if (n > 0) {
				yield this.buffer.substr(this.pos, n);
				this.pos += n;
				return n;
			}
			return 0;
		}
		*pushToIndex(i, allowEmpty) {
			const s = this.buffer.slice(this.pos, i);
			if (s) {
				yield s;
				this.pos += s.length;
				return s.length;
			} else if (allowEmpty) yield "";
			return 0;
		}
		*pushIndicators() {
			let n = 0;
			loop: while (true) {
				switch (this.charAt(0)) {
					case "!":
						n += yield* this.pushTag();
						n += yield* this.pushSpaces(true);
						continue loop;
					case "&":
						n += yield* this.pushUntil(isNotAnchorChar);
						n += yield* this.pushSpaces(true);
						continue loop;
					case "-":
					case "?":
					case ":": {
						const inFlow = this.flowLevel > 0;
						const ch1 = this.charAt(1);
						if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
							if (!inFlow) this.indentNext = this.indentValue + 1;
							else if (this.flowKey) this.flowKey = false;
							n += yield* this.pushCount(1);
							n += yield* this.pushSpaces(true);
							continue loop;
						}
					}
				}
				break loop;
			}
			return n;
		}
		*pushTag() {
			if (this.charAt(1) === "<") {
				let i = this.pos + 2;
				let ch = this.buffer[i];
				while (!isEmpty(ch) && ch !== ">") ch = this.buffer[++i];
				return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
			} else {
				let i = this.pos + 1;
				let ch = this.buffer[i];
				while (ch) if (tagChars.has(ch)) ch = this.buffer[++i];
				else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) ch = this.buffer[i += 3];
				else break;
				return yield* this.pushToIndex(i, false);
			}
		}
		*pushNewline() {
			const ch = this.buffer[this.pos];
			if (ch === "\n") return yield* this.pushCount(1);
			else if (ch === "\r" && this.charAt(1) === "\n") return yield* this.pushCount(2);
			else return 0;
		}
		*pushSpaces(allowTabs) {
			let i = this.pos - 1;
			let ch;
			do
				ch = this.buffer[++i];
			while (ch === " " || allowTabs && ch === "	");
			const n = i - this.pos;
			if (n > 0) {
				yield this.buffer.substr(this.pos, n);
				this.pos = i;
			}
			return n;
		}
		*pushUntil(test) {
			let i = this.pos;
			let ch = this.buffer[i];
			while (!test(ch)) ch = this.buffer[++i];
			return yield* this.pushToIndex(i, false);
		}
	};
	exports.Lexer = Lexer;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = /* @__PURE__ */ __commonJSMin(((exports) => {
	/**
	* Tracks newlines during parsing in order to provide an efficient API for
	* determining the one-indexed `{ line, col }` position for any offset
	* within the input.
	*/
	var LineCounter = class {
		constructor() {
			this.lineStarts = [];
			/**
			* Should be called in ascending order. Otherwise, call
			* `lineCounter.lineStarts.sort()` before calling `linePos()`.
			*/
			this.addNewLine = (offset) => this.lineStarts.push(offset);
			/**
			* Performs a binary search and returns the 1-indexed { line, col }
			* position of `offset`. If `line === 0`, `addNewLine` has never been
			* called or `offset` is before the first known newline.
			*/
			this.linePos = (offset) => {
				let low = 0;
				let high = this.lineStarts.length;
				while (low < high) {
					const mid = low + high >> 1;
					if (this.lineStarts[mid] < offset) low = mid + 1;
					else high = mid;
				}
				if (this.lineStarts[low] === offset) return {
					line: low + 1,
					col: 1
				};
				if (low === 0) return {
					line: 0,
					col: offset
				};
				const start = this.lineStarts[low - 1];
				return {
					line: low,
					col: offset - start + 1
				};
			};
		}
	};
	exports.LineCounter = LineCounter;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js
var require_parser = /* @__PURE__ */ __commonJSMin(((exports) => {
	var node_process = __require("process");
	var cst = require_cst();
	var lexer = require_lexer();
	function includesToken(list, type) {
		for (let i = 0; i < list.length; ++i) if (list[i].type === type) return true;
		return false;
	}
	function findNonEmptyIndex(list) {
		for (let i = 0; i < list.length; ++i) switch (list[i].type) {
			case "space":
			case "comment":
			case "newline": break;
			default: return i;
		}
		return -1;
	}
	function isFlowToken(token) {
		switch (token?.type) {
			case "alias":
			case "scalar":
			case "single-quoted-scalar":
			case "double-quoted-scalar":
			case "flow-collection": return true;
			default: return false;
		}
	}
	function getPrevProps(parent) {
		switch (parent.type) {
			case "document": return parent.start;
			case "block-map": {
				const it = parent.items[parent.items.length - 1];
				return it.sep ?? it.start;
			}
			case "block-seq": return parent.items[parent.items.length - 1].start;
			/* istanbul ignore next should not happen */
			default: return [];
		}
	}
	/** Note: May modify input array */
	function getFirstKeyStartProps(prev) {
		if (prev.length === 0) return [];
		let i = prev.length;
		loop: while (--i >= 0) switch (prev[i].type) {
			case "doc-start":
			case "explicit-key-ind":
			case "map-value-ind":
			case "seq-item-ind":
			case "newline": break loop;
		}
		while (prev[++i]?.type === "space");
		return prev.splice(i, prev.length);
	}
	function arrayPushArray(target, source) {
		if (source.length < 1e5) Array.prototype.push.apply(target, source);
		else for (let i = 0; i < source.length; ++i) target.push(source[i]);
	}
	function fixFlowSeqItems(fc) {
		if (fc.start.type === "flow-seq-start") {
			for (const it of fc.items) if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
				if (it.key) it.value = it.key;
				delete it.key;
				if (isFlowToken(it.value)) if (it.value.end) arrayPushArray(it.value.end, it.sep);
				else it.value.end = it.sep;
				else arrayPushArray(it.start, it.sep);
				delete it.sep;
			}
		}
	}
	/**
	* A YAML concrete syntax tree (CST) parser
	*
	* ```ts
	* const src: string = ...
	* for (const token of new Parser().parse(src)) {
	*   // token: Token
	* }
	* ```
	*
	* To use the parser with a user-provided lexer:
	*
	* ```ts
	* function* parse(source: string, lexer: Lexer) {
	*   const parser = new Parser()
	*   for (const lexeme of lexer.lex(source))
	*     yield* parser.next(lexeme)
	*   yield* parser.end()
	* }
	*
	* const src: string = ...
	* const lexer = new Lexer()
	* for (const token of parse(src, lexer)) {
	*   // token: Token
	* }
	* ```
	*/
	var Parser = class {
		/**
		* @param onNewLine - If defined, called separately with the start position of
		*   each new line (in `parse()`, including the start of input).
		*/
		constructor(onNewLine) {
			/** If true, space and sequence indicators count as indentation */
			this.atNewLine = true;
			/** If true, next token is a scalar value */
			this.atScalar = false;
			/** Current indentation level */
			this.indent = 0;
			/** Current offset since the start of parsing */
			this.offset = 0;
			/** On the same line with a block map key */
			this.onKeyLine = false;
			/** Top indicates the node that's currently being built */
			this.stack = [];
			/** The source of the current token, set in parse() */
			this.source = "";
			/** The type of the current token, set in parse() */
			this.type = "";
			this.lexer = new lexer.Lexer();
			this.onNewLine = onNewLine;
		}
		/**
		* Parse `source` as a YAML stream.
		* If `incomplete`, a part of the last line may be left as a buffer for the next call.
		*
		* Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
		*
		* @returns A generator of tokens representing each directive, document, and other structure.
		*/
		*parse(source, incomplete = false) {
			if (this.onNewLine && this.offset === 0) this.onNewLine(0);
			for (const lexeme of this.lexer.lex(source, incomplete)) yield* this.next(lexeme);
			if (!incomplete) yield* this.end();
		}
		/**
		* Advance the parser by the `source` of one lexical token.
		*/
		*next(source) {
			this.source = source;
			if (node_process.env.LOG_TOKENS) console.log("|", cst.prettyToken(source));
			if (this.atScalar) {
				this.atScalar = false;
				yield* this.step();
				this.offset += source.length;
				return;
			}
			const type = cst.tokenType(source);
			if (!type) {
				const message = `Not a YAML token: ${source}`;
				yield* this.pop({
					type: "error",
					offset: this.offset,
					message,
					source
				});
				this.offset += source.length;
			} else if (type === "scalar") {
				this.atNewLine = false;
				this.atScalar = true;
				this.type = "scalar";
			} else {
				this.type = type;
				yield* this.step();
				switch (type) {
					case "newline":
						this.atNewLine = true;
						this.indent = 0;
						if (this.onNewLine) this.onNewLine(this.offset + source.length);
						break;
					case "space":
						if (this.atNewLine && source[0] === " ") this.indent += source.length;
						break;
					case "explicit-key-ind":
					case "map-value-ind":
					case "seq-item-ind":
						if (this.atNewLine) this.indent += source.length;
						break;
					case "doc-mode":
					case "flow-error-end": return;
					default: this.atNewLine = false;
				}
				this.offset += source.length;
			}
		}
		/** Call at end of input to push out any remaining constructions */
		*end() {
			while (this.stack.length > 0) yield* this.pop();
		}
		get sourceToken() {
			return {
				type: this.type,
				offset: this.offset,
				indent: this.indent,
				source: this.source
			};
		}
		*step() {
			const top = this.peek(1);
			if (this.type === "doc-end" && top?.type !== "doc-end") {
				while (this.stack.length > 0) yield* this.pop();
				this.stack.push({
					type: "doc-end",
					offset: this.offset,
					source: this.source
				});
				return;
			}
			if (!top) return yield* this.stream();
			switch (top.type) {
				case "document": return yield* this.document(top);
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": return yield* this.scalar(top);
				case "block-scalar": return yield* this.blockScalar(top);
				case "block-map": return yield* this.blockMap(top);
				case "block-seq": return yield* this.blockSequence(top);
				case "flow-collection": return yield* this.flowCollection(top);
				case "doc-end": return yield* this.documentEnd(top);
			}
			/* istanbul ignore next should not happen */
			yield* this.pop();
		}
		peek(n) {
			return this.stack[this.stack.length - n];
		}
		*pop(error) {
			const token = error ?? this.stack.pop();
			/* istanbul ignore if should not happen */
			if (!token) yield {
				type: "error",
				offset: this.offset,
				source: "",
				message: "Tried to pop an empty stack"
			};
			else if (this.stack.length === 0) yield token;
			else {
				const top = this.peek(1);
				if (token.type === "block-scalar") token.indent = "indent" in top ? top.indent : 0;
				else if (token.type === "flow-collection" && top.type === "document") token.indent = 0;
				if (token.type === "flow-collection") fixFlowSeqItems(token);
				switch (top.type) {
					case "document":
						top.value = token;
						break;
					case "block-scalar":
						top.props.push(token);
						break;
					case "block-map": {
						const it = top.items[top.items.length - 1];
						if (it.value) {
							top.items.push({
								start: [],
								key: token,
								sep: []
							});
							this.onKeyLine = true;
							return;
						} else if (it.sep) it.value = token;
						else {
							Object.assign(it, {
								key: token,
								sep: []
							});
							this.onKeyLine = !it.explicitKey;
							return;
						}
						break;
					}
					case "block-seq": {
						const it = top.items[top.items.length - 1];
						if (it.value) top.items.push({
							start: [],
							value: token
						});
						else it.value = token;
						break;
					}
					case "flow-collection": {
						const it = top.items[top.items.length - 1];
						if (!it || it.value) top.items.push({
							start: [],
							key: token,
							sep: []
						});
						else if (it.sep) it.value = token;
						else Object.assign(it, {
							key: token,
							sep: []
						});
						return;
					}
					/* istanbul ignore next should not happen */
					default:
						yield* this.pop();
						yield* this.pop(token);
				}
				if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
					const last = token.items[token.items.length - 1];
					if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
						if (top.type === "document") top.end = last.start;
						else top.items.push({ start: last.start });
						token.items.splice(-1, 1);
					}
				}
			}
		}
		*stream() {
			switch (this.type) {
				case "directive-line":
					yield {
						type: "directive",
						offset: this.offset,
						source: this.source
					};
					return;
				case "byte-order-mark":
				case "space":
				case "comment":
				case "newline":
					yield this.sourceToken;
					return;
				case "doc-mode":
				case "doc-start": {
					const doc = {
						type: "document",
						offset: this.offset,
						start: []
					};
					if (this.type === "doc-start") doc.start.push(this.sourceToken);
					this.stack.push(doc);
					return;
				}
			}
			yield {
				type: "error",
				offset: this.offset,
				message: `Unexpected ${this.type} token in YAML stream`,
				source: this.source
			};
		}
		*document(doc) {
			if (doc.value) return yield* this.lineEnd(doc);
			switch (this.type) {
				case "doc-start":
					if (findNonEmptyIndex(doc.start) !== -1) {
						yield* this.pop();
						yield* this.step();
					} else doc.start.push(this.sourceToken);
					return;
				case "anchor":
				case "tag":
				case "space":
				case "comment":
				case "newline":
					doc.start.push(this.sourceToken);
					return;
			}
			const bv = this.startBlockValue(doc);
			if (bv) this.stack.push(bv);
			else yield {
				type: "error",
				offset: this.offset,
				message: `Unexpected ${this.type} token in YAML document`,
				source: this.source
			};
		}
		*scalar(scalar) {
			if (this.type === "map-value-ind") {
				const start = getFirstKeyStartProps(getPrevProps(this.peek(2)));
				let sep;
				if (scalar.end) {
					sep = scalar.end;
					sep.push(this.sourceToken);
					delete scalar.end;
				} else sep = [this.sourceToken];
				const map = {
					type: "block-map",
					offset: scalar.offset,
					indent: scalar.indent,
					items: [{
						start,
						key: scalar,
						sep
					}]
				};
				this.onKeyLine = true;
				this.stack[this.stack.length - 1] = map;
			} else yield* this.lineEnd(scalar);
		}
		*blockScalar(scalar) {
			switch (this.type) {
				case "space":
				case "comment":
				case "newline":
					scalar.props.push(this.sourceToken);
					return;
				case "scalar":
					scalar.source = this.source;
					this.atNewLine = true;
					this.indent = 0;
					if (this.onNewLine) {
						let nl = this.source.indexOf("\n") + 1;
						while (nl !== 0) {
							this.onNewLine(this.offset + nl);
							nl = this.source.indexOf("\n", nl) + 1;
						}
					}
					yield* this.pop();
					break;
				/* istanbul ignore next should not happen */
				default:
					yield* this.pop();
					yield* this.step();
			}
		}
		*blockMap(map) {
			const it = map.items[map.items.length - 1];
			switch (this.type) {
				case "newline":
					this.onKeyLine = false;
					if (it.value) {
						const end = "end" in it.value ? it.value.end : void 0;
						if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
						else map.items.push({ start: [this.sourceToken] });
					} else if (it.sep) it.sep.push(this.sourceToken);
					else it.start.push(this.sourceToken);
					return;
				case "space":
				case "comment":
					if (it.value) map.items.push({ start: [this.sourceToken] });
					else if (it.sep) it.sep.push(this.sourceToken);
					else {
						if (this.atIndentedComment(it.start, map.indent)) {
							const end = map.items[map.items.length - 2]?.value?.end;
							if (Array.isArray(end)) {
								arrayPushArray(end, it.start);
								end.push(this.sourceToken);
								map.items.pop();
								return;
							}
						}
						it.start.push(this.sourceToken);
					}
					return;
			}
			if (this.indent >= map.indent) {
				const atMapIndent = !this.onKeyLine && this.indent === map.indent;
				const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
				let start = [];
				if (atNextItem && it.sep && !it.value) {
					const nl = [];
					for (let i = 0; i < it.sep.length; ++i) {
						const st = it.sep[i];
						switch (st.type) {
							case "newline":
								nl.push(i);
								break;
							case "space": break;
							case "comment":
								if (st.indent > map.indent) nl.length = 0;
								break;
							default: nl.length = 0;
						}
					}
					if (nl.length >= 2) start = it.sep.splice(nl[1]);
				}
				switch (this.type) {
					case "anchor":
					case "tag":
						if (atNextItem || it.value) {
							start.push(this.sourceToken);
							map.items.push({ start });
							this.onKeyLine = true;
						} else if (it.sep) it.sep.push(this.sourceToken);
						else it.start.push(this.sourceToken);
						return;
					case "explicit-key-ind":
						if (!it.sep && !it.explicitKey) {
							it.start.push(this.sourceToken);
							it.explicitKey = true;
						} else if (atNextItem || it.value) {
							start.push(this.sourceToken);
							map.items.push({
								start,
								explicitKey: true
							});
						} else this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start: [this.sourceToken],
								explicitKey: true
							}]
						});
						this.onKeyLine = true;
						return;
					case "map-value-ind":
						if (it.explicitKey) if (!it.sep) if (includesToken(it.start, "newline")) Object.assign(it, {
							key: null,
							sep: [this.sourceToken]
						});
						else {
							const start = getFirstKeyStartProps(it.start);
							this.stack.push({
								type: "block-map",
								offset: this.offset,
								indent: this.indent,
								items: [{
									start,
									key: null,
									sep: [this.sourceToken]
								}]
							});
						}
						else if (it.value) map.items.push({
							start: [],
							key: null,
							sep: [this.sourceToken]
						});
						else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start,
								key: null,
								sep: [this.sourceToken]
							}]
						});
						else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
							const start = getFirstKeyStartProps(it.start);
							const key = it.key;
							const sep = it.sep;
							sep.push(this.sourceToken);
							delete it.key;
							delete it.sep;
							this.stack.push({
								type: "block-map",
								offset: this.offset,
								indent: this.indent,
								items: [{
									start,
									key,
									sep
								}]
							});
						} else if (start.length > 0) it.sep = it.sep.concat(start, this.sourceToken);
						else it.sep.push(this.sourceToken);
						else if (!it.sep) Object.assign(it, {
							key: null,
							sep: [this.sourceToken]
						});
						else if (it.value || atNextItem) map.items.push({
							start,
							key: null,
							sep: [this.sourceToken]
						});
						else if (includesToken(it.sep, "map-value-ind")) this.stack.push({
							type: "block-map",
							offset: this.offset,
							indent: this.indent,
							items: [{
								start: [],
								key: null,
								sep: [this.sourceToken]
							}]
						});
						else it.sep.push(this.sourceToken);
						this.onKeyLine = true;
						return;
					case "alias":
					case "scalar":
					case "single-quoted-scalar":
					case "double-quoted-scalar": {
						const fs = this.flowScalar(this.type);
						if (atNextItem || it.value) {
							map.items.push({
								start,
								key: fs,
								sep: []
							});
							this.onKeyLine = true;
						} else if (it.sep) this.stack.push(fs);
						else {
							Object.assign(it, {
								key: fs,
								sep: []
							});
							this.onKeyLine = true;
						}
						return;
					}
					default: {
						const bv = this.startBlockValue(map);
						if (bv) {
							if (bv.type === "block-seq") {
								if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
									yield* this.pop({
										type: "error",
										offset: this.offset,
										message: "Unexpected block-seq-ind on same line with key",
										source: this.source
									});
									return;
								}
							} else if (atMapIndent) map.items.push({ start });
							this.stack.push(bv);
							return;
						}
					}
				}
			}
			yield* this.pop();
			yield* this.step();
		}
		*blockSequence(seq) {
			const it = seq.items[seq.items.length - 1];
			switch (this.type) {
				case "newline":
					if (it.value) {
						const end = "end" in it.value ? it.value.end : void 0;
						if ((Array.isArray(end) ? end[end.length - 1] : void 0)?.type === "comment") end?.push(this.sourceToken);
						else seq.items.push({ start: [this.sourceToken] });
					} else it.start.push(this.sourceToken);
					return;
				case "space":
				case "comment":
					if (it.value) seq.items.push({ start: [this.sourceToken] });
					else {
						if (this.atIndentedComment(it.start, seq.indent)) {
							const end = seq.items[seq.items.length - 2]?.value?.end;
							if (Array.isArray(end)) {
								arrayPushArray(end, it.start);
								end.push(this.sourceToken);
								seq.items.pop();
								return;
							}
						}
						it.start.push(this.sourceToken);
					}
					return;
				case "anchor":
				case "tag":
					if (it.value || this.indent <= seq.indent) break;
					it.start.push(this.sourceToken);
					return;
				case "seq-item-ind":
					if (this.indent !== seq.indent) break;
					if (it.value || includesToken(it.start, "seq-item-ind")) seq.items.push({ start: [this.sourceToken] });
					else it.start.push(this.sourceToken);
					return;
			}
			if (this.indent > seq.indent) {
				const bv = this.startBlockValue(seq);
				if (bv) {
					this.stack.push(bv);
					return;
				}
			}
			yield* this.pop();
			yield* this.step();
		}
		*flowCollection(fc) {
			const it = fc.items[fc.items.length - 1];
			if (this.type === "flow-error-end") {
				let top;
				do {
					yield* this.pop();
					top = this.peek(1);
				} while (top?.type === "flow-collection");
			} else if (fc.end.length === 0) {
				switch (this.type) {
					case "comma":
					case "explicit-key-ind":
						if (!it || it.sep) fc.items.push({ start: [this.sourceToken] });
						else it.start.push(this.sourceToken);
						return;
					case "map-value-ind":
						if (!it || it.value) fc.items.push({
							start: [],
							key: null,
							sep: [this.sourceToken]
						});
						else if (it.sep) it.sep.push(this.sourceToken);
						else Object.assign(it, {
							key: null,
							sep: [this.sourceToken]
						});
						return;
					case "space":
					case "comment":
					case "newline":
					case "anchor":
					case "tag":
						if (!it || it.value) fc.items.push({ start: [this.sourceToken] });
						else if (it.sep) it.sep.push(this.sourceToken);
						else it.start.push(this.sourceToken);
						return;
					case "alias":
					case "scalar":
					case "single-quoted-scalar":
					case "double-quoted-scalar": {
						const fs = this.flowScalar(this.type);
						if (!it || it.value) fc.items.push({
							start: [],
							key: fs,
							sep: []
						});
						else if (it.sep) this.stack.push(fs);
						else Object.assign(it, {
							key: fs,
							sep: []
						});
						return;
					}
					case "flow-map-end":
					case "flow-seq-end":
						fc.end.push(this.sourceToken);
						return;
				}
				const bv = this.startBlockValue(fc);
				/* istanbul ignore else should not happen */
				if (bv) this.stack.push(bv);
				else {
					yield* this.pop();
					yield* this.step();
				}
			} else {
				const parent = this.peek(2);
				if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
					yield* this.pop();
					yield* this.step();
				} else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
					const start = getFirstKeyStartProps(getPrevProps(parent));
					fixFlowSeqItems(fc);
					const sep = fc.end.splice(1, fc.end.length);
					sep.push(this.sourceToken);
					const map = {
						type: "block-map",
						offset: fc.offset,
						indent: fc.indent,
						items: [{
							start,
							key: fc,
							sep
						}]
					};
					this.onKeyLine = true;
					this.stack[this.stack.length - 1] = map;
				} else yield* this.lineEnd(fc);
			}
		}
		flowScalar(type) {
			if (this.onNewLine) {
				let nl = this.source.indexOf("\n") + 1;
				while (nl !== 0) {
					this.onNewLine(this.offset + nl);
					nl = this.source.indexOf("\n", nl) + 1;
				}
			}
			return {
				type,
				offset: this.offset,
				indent: this.indent,
				source: this.source
			};
		}
		startBlockValue(parent) {
			switch (this.type) {
				case "alias":
				case "scalar":
				case "single-quoted-scalar":
				case "double-quoted-scalar": return this.flowScalar(this.type);
				case "block-scalar-header": return {
					type: "block-scalar",
					offset: this.offset,
					indent: this.indent,
					props: [this.sourceToken],
					source: ""
				};
				case "flow-map-start":
				case "flow-seq-start": return {
					type: "flow-collection",
					offset: this.offset,
					indent: this.indent,
					start: this.sourceToken,
					items: [],
					end: []
				};
				case "seq-item-ind": return {
					type: "block-seq",
					offset: this.offset,
					indent: this.indent,
					items: [{ start: [this.sourceToken] }]
				};
				case "explicit-key-ind": {
					this.onKeyLine = true;
					const start = getFirstKeyStartProps(getPrevProps(parent));
					start.push(this.sourceToken);
					return {
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start,
							explicitKey: true
						}]
					};
				}
				case "map-value-ind": {
					this.onKeyLine = true;
					const start = getFirstKeyStartProps(getPrevProps(parent));
					return {
						type: "block-map",
						offset: this.offset,
						indent: this.indent,
						items: [{
							start,
							key: null,
							sep: [this.sourceToken]
						}]
					};
				}
			}
			return null;
		}
		atIndentedComment(start, indent) {
			if (this.type !== "comment") return false;
			if (this.indent <= indent) return false;
			return start.every((st) => st.type === "newline" || st.type === "space");
		}
		*documentEnd(docEnd) {
			if (this.type !== "doc-mode") {
				if (docEnd.end) docEnd.end.push(this.sourceToken);
				else docEnd.end = [this.sourceToken];
				if (this.type === "newline") yield* this.pop();
			}
		}
		*lineEnd(token) {
			switch (this.type) {
				case "comma":
				case "doc-start":
				case "doc-end":
				case "flow-seq-end":
				case "flow-map-end":
				case "map-value-ind":
					yield* this.pop();
					yield* this.step();
					break;
				case "newline": this.onKeyLine = false;
				default:
					if (token.end) token.end.push(this.sourceToken);
					else token.end = [this.sourceToken];
					if (this.type === "newline") yield* this.pop();
			}
		}
	};
	exports.Parser = Parser;
}));
//#endregion
//#region node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/public-api.js
var require_public_api = /* @__PURE__ */ __commonJSMin(((exports) => {
	var composer = require_composer();
	var Document = require_Document();
	var errors = require_errors();
	var log = require_log();
	var identity = require_identity();
	var lineCounter = require_line_counter();
	var parser = require_parser();
	function parseOptions(options) {
		const prettyErrors = options.prettyErrors !== false;
		return {
			lineCounter: options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null,
			prettyErrors
		};
	}
	/**
	* Parse the input as a stream of YAML documents.
	*
	* Documents should be separated from each other by `...` or `---` marker lines.
	*
	* @returns If an empty `docs` array is returned, it will be of type
	*   EmptyStream and contain additional stream information. In
	*   TypeScript, you should use `'empty' in docs` as a type guard for it.
	*/
	function parseAllDocuments(source, options = {}) {
		const { lineCounter, prettyErrors } = parseOptions(options);
		const parser$1 = new parser.Parser(lineCounter?.addNewLine);
		const composer$1 = new composer.Composer(options);
		const docs = Array.from(composer$1.compose(parser$1.parse(source)));
		if (prettyErrors && lineCounter) for (const doc of docs) {
			doc.errors.forEach(errors.prettifyError(source, lineCounter));
			doc.warnings.forEach(errors.prettifyError(source, lineCounter));
		}
		if (docs.length > 0) return docs;
		return Object.assign([], { empty: true }, composer$1.streamInfo());
	}
	/** Parse an input string into a single YAML.Document */
	function parseDocument(source, options = {}) {
		const { lineCounter, prettyErrors } = parseOptions(options);
		const parser$1 = new parser.Parser(lineCounter?.addNewLine);
		const composer$1 = new composer.Composer(options);
		let doc = null;
		for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) if (!doc) doc = _doc;
		else if (doc.options.logLevel !== "silent") {
			doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
			break;
		}
		if (prettyErrors && lineCounter) {
			doc.errors.forEach(errors.prettifyError(source, lineCounter));
			doc.warnings.forEach(errors.prettifyError(source, lineCounter));
		}
		return doc;
	}
	function parse(src, reviver, options) {
		let _reviver = void 0;
		if (typeof reviver === "function") _reviver = reviver;
		else if (options === void 0 && reviver && typeof reviver === "object") options = reviver;
		const doc = parseDocument(src, options);
		if (!doc) return null;
		doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
		if (doc.errors.length > 0) if (doc.options.logLevel !== "silent") throw doc.errors[0];
		else doc.errors = [];
		return doc.toJS(Object.assign({ reviver: _reviver }, options));
	}
	function stringify(value, replacer, options) {
		let _replacer = null;
		if (typeof replacer === "function" || Array.isArray(replacer)) _replacer = replacer;
		else if (options === void 0 && replacer) options = replacer;
		if (typeof options === "string") options = options.length;
		if (typeof options === "number") {
			const indent = Math.round(options);
			options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
		}
		if (value === void 0) {
			const { keepUndefined } = options ?? replacer ?? {};
			if (!keepUndefined) return void 0;
		}
		if (identity.isDocument(value) && !_replacer) return value.toString(options);
		return new Document.Document(value, _replacer, options).toString(options);
	}
	exports.parse = parse;
	exports.parseAllDocuments = parseAllDocuments;
	exports.parseDocument = parseDocument;
	exports.stringify = stringify;
}));
//#endregion
//#region src/importer.js
var import_dist = (/* @__PURE__ */ __commonJSMin(((exports) => {
	var composer = require_composer();
	var Document = require_Document();
	var Schema = require_Schema();
	var errors = require_errors();
	var Alias = require_Alias();
	var identity = require_identity();
	var Pair = require_Pair();
	var Scalar = require_Scalar();
	var YAMLMap = require_YAMLMap();
	var YAMLSeq = require_YAMLSeq();
	require_cst();
	var lexer = require_lexer();
	var lineCounter = require_line_counter();
	var parser = require_parser();
	var publicApi = require_public_api();
	var visit = require_visit();
	exports.Composer = composer.Composer;
	exports.Document = Document.Document;
	exports.Schema = Schema.Schema;
	exports.YAMLError = errors.YAMLError;
	exports.YAMLParseError = errors.YAMLParseError;
	exports.YAMLWarning = errors.YAMLWarning;
	exports.Alias = Alias.Alias;
	exports.isAlias = identity.isAlias;
	exports.isCollection = identity.isCollection;
	exports.isDocument = identity.isDocument;
	exports.isMap = identity.isMap;
	exports.isNode = identity.isNode;
	exports.isPair = identity.isPair;
	exports.isScalar = identity.isScalar;
	exports.isSeq = identity.isSeq;
	exports.Pair = Pair.Pair;
	exports.Scalar = Scalar.Scalar;
	exports.YAMLMap = YAMLMap.YAMLMap;
	exports.YAMLSeq = YAMLSeq.YAMLSeq;
	exports.Lexer = lexer.Lexer;
	exports.LineCounter = lineCounter.LineCounter;
	exports.Parser = parser.Parser;
	exports.parse = publicApi.parse;
	exports.parseAllDocuments = publicApi.parseAllDocuments;
	exports.parseDocument = publicApi.parseDocument;
	exports.stringify = publicApi.stringify;
	exports.visit = visit.visit;
	exports.visitAsync = visit.visitAsync;
})))();
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
const SERVER_NAME = /^[A-Za-z0-9_-]{1,32}$/u;
const record$5 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
const stringMap = (value) => record$5(value) ? Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "string")) : {};
/** One full server entry from a JSON client file. */
function jsonEntry(text, name) {
	const parsed = JSON.parse(text);
	const maps = [
		parsed?.mcpServers,
		parsed?.servers,
		parsed?.mcp?.servers
	];
	if (record$5(parsed?.projects)) for (const project of Object.values(parsed.projects)) maps.push(project?.mcpServers);
	for (const map of maps) if (record$5(map) && record$5(map[name])) return map[name];
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
	if (!record$5(entry)) throw new Error(`MCP console: ${client} no longer configures "${name}"`);
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
	if (!SERVER_NAME.test(candidate)) throw new Error("MCP console: could not derive a server name");
	return candidate;
}
/**
* A value as flow-style YAML: JSON for plain data (JSON is YAML and every
* string is quoted), and a Loader `!!js` node as a tagged quoted scalar.
*/
function flowYaml(value, indent = "") {
	if (record$5(value) && typeof value.__jsExpr === "string") return `!!js ${JSON.stringify(value.__jsExpr)}`;
	const inner = `${indent}  `;
	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		return `[\n${value.map((item) => `${inner}${flowYaml(item, inner)}`).join(",\n")}\n${indent}]`;
	}
	if (record$5(value)) {
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
//#region src/repository.js
/**
* Repository links, shared by the host and the page (no Node imports).
*
* @module dsh-mcp-console/repository
*/
const record$4 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/** A repository URL a person may follow: http(s) only. */
function normalizeRepository(value) {
	let text = typeof value === "string" ? value.trim() : record$4(value) && typeof value.url === "string" ? value.url.trim() : "";
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
/** The id a server of a switched-off bundle goes by: it has no Loader entry. */
const BUNDLE_ID_PREFIX = "bundle:";
/**
* Whether a bundle can be switched as a whole for one of its servers: an
* installed bundle that only carries MCP rows (what import, Add manually, and
* AI quick add install), so switching it touches nothing else.
*/
const switchableBundle = (bundle) => bundle?.installed === true && bundle.optional !== true && bundle.readOnlyReason === void 0 && Array.isArray(bundle.rows) && bundle.rows.length > 0 && bundle.rows.every((row) => row?.moduleName === "@deepseek-ai/dsh-mcp-client");
async function listServers({ loader, tools, pluginManager, profileDir, repositories = {}, readBundleConfig }) {
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
			...toggleFacts(pluginManager, plugin, bundle)
		};
	}));
	for (const bundle of bundles) {
		if (bundle?.enabled !== false || !switchableBundle(bundle)) continue;
		for (const row of bundle.rows) {
			const config = typeof readBundleConfig === "function" ? await readBundleConfig(bundle.name, row.rowId).catch(() => void 0) : void 0;
			const serverName = typeof config?.serverName === "string" ? config.serverName : String(row.rowId ?? "").replace(/^mcp-/u, "");
			const repository = normalizeRepository(repositories[row.rowId]) ?? await bundleRepository(profileDir, bundle.name);
			servers.push({
				entryId: `${BUNDLE_ID_PREFIX}${bundle.name}`,
				rowId: row.rowId,
				name: serverName,
				status: "disabled",
				enabled: false,
				config: config === void 0 ? {} : redactConfig(config),
				toolCount: 0,
				tools: [],
				...repository === void 0 ? {} : { repository },
				bundle: {
					name: bundle.name,
					...bundle.version === void 0 ? {} : { version: bundle.version },
					mcpRows: bundle.rows.length,
					disabled: true
				},
				removable: bundle.removable === true,
				toggleable: true,
				toggleVia: "bundle"
			});
		}
	}
	servers.sort((a, b) => a.name.localeCompare(b.name));
	return {
		servers,
		manageable: pluginManager !== void 0
	};
}
/** How a listed server is switched: its own row, else its whole bundle, else not at all. */
function toggleFacts(pluginManager, plugin, bundle) {
	if (pluginManager === void 0) return { toggleable: false };
	if (plugin !== void 0 && plugin.readOnlyReason === void 0) return {
		toggleable: true,
		toggleVia: "row"
	};
	if (switchableBundle(bundle)) return {
		toggleable: true,
		toggleVia: "bundle"
	};
	return {
		toggleable: false,
		...plugin?.readOnlyReason === void 0 ? {} : { readOnlyReason: plugin.readOnlyReason }
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
	let result;
	if (entryId.startsWith("bundle:")) result = await pluginManager.setBundleEnabled(entryId.slice(7), enabled === true);
	else {
		const plugin = (await pluginManager.listPlugins?.()?.catch(() => []) ?? []).find((item) => item?.entryId === entryId);
		if (plugin === void 0 || plugin.readOnlyReason === void 0) result = await pluginManager.setPluginEnabled(entryId, enabled === true);
		else {
			const bundle = (await pluginManager.listBundles?.()?.catch(() => []) ?? []).find((item) => (item?.rows ?? []).some((row) => row?.entryId === entryId));
			if (!switchableBundle(bundle) || typeof pluginManager.setBundleEnabled !== "function") result = await pluginManager.setPluginEnabled(entryId, enabled === true);
			else result = await pluginManager.setBundleEnabled(bundle.name, enabled === true);
		}
	}
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
	const bundles = await pluginManager.listBundles();
	const bundle = typeof entryId === "string" && entryId.startsWith("bundle:") ? bundles.find((item) => item?.name === entryId.slice(7)) : bundles.find((item) => (item?.rows ?? []).some((row) => row?.entryId === entryId));
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
//#region src/editor.js
/**
* Edit a server whose configuration bundle lives in this plugin's bundle
* directory (what import, Add manually, and AI quick add write).
*
* The bundle's patch is read with the Loader's YAML dialect, its single MCP
* row is turned back into the Add manually form, and a save rewrites the
* patch and reinstalls the bundle through the Plugin Manager (it has no
* update operation: remove, then install). A failed reinstall puts the old
* patch back and installs it again. Expressions the form cannot show (an
* agent's own `!!js`) are kept exactly as they were; the page can keep or
* drop them but never write a new one.
*
* @module dsh-mcp-console/editor
*/
const KNOWN_KEYS = /* @__PURE__ */ new Set([
	"serverName",
	"transport",
	"command",
	"args",
	"env",
	"cwd",
	"url",
	"headers"
]);
const record$3 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isExpression = (value) => record$3(value) && typeof value.__jsExpr === "string";
const fail$1 = (message) => {
	throw new Error(`MCP console: ${message}`);
};
/** Parse a patch in the Loader's dialect: `!!js` scalars become expression nodes. */
function parsePatch(text) {
	return (0, import_dist.parse)(text, { customTags: [{
		tag: "tag:yaml.org,2002:js",
		resolve: (value) => ({ __jsExpr: String(value) })
	}] });
}
const ENV_READ = /^process\.env\.([A-Za-z_][A-Za-z0-9_]*)(?: \?\? '')?$/u;
const PART = /"(?:[^"\\]|\\.)*"|\(process\.env\.([A-Za-z_][A-Za-z0-9_]*) \?\? ''\)/gu;
/** The form row for one stored value: literal, environment read, template, or a kept expression. */
function valueToPair(name, value) {
	if (typeof value === "string") return {
		name,
		value,
		fromEnv: false
	};
	if (!isExpression(value)) return {
		name,
		value: String(value ?? ""),
		fromEnv: false
	};
	const expr = value.__jsExpr.trim();
	const read = ENV_READ.exec(expr);
	if (read !== null) return {
		name,
		value: read[1],
		fromEnv: true
	};
	const parts = [...expr.matchAll(PART)];
	if (parts.length > 0 && parts.map((part) => part[0]).join(" + ") === expr && parts.some((part) => part[1] !== void 0)) return {
		name,
		value: parts.map((part) => part[1] === void 0 ? JSON.parse(part[0]) : `\${${part[1]}}`).join(""),
		fromEnv: true
	};
	const literal = /^`([^`\\]*)`$/u.exec(expr);
	if (literal !== null) {
		const body = literal[1];
		const replaced = body.replace(/\$\{process\.env\.([A-Za-z_][A-Za-z0-9_]*)\}/gu, "${$1}");
		if (replaced !== body && !/\$\{(?![A-Za-z_][A-Za-z0-9_]*\})/u.test(replaced)) return {
			name,
			value: replaced,
			fromEnv: true
		};
	}
	return {
		name,
		value: expr,
		fromEnv: false,
		expression: true
	};
}
const pairsOf = (map) => Object.entries(record$3(map) ? map : {}).map(([name, value]) => valueToPair(name, value));
/**
* The Add manually form for a stored config.
* @param config - the row's config.
* @returns `{ form }` or `{ reason }` when the form cannot show it.
*/
function configToForm(config) {
	if (!record$3(config) || typeof config.serverName !== "string") return { reason: "the row has no plain server name" };
	const base = {
		name: config.serverName,
		transport: "stdio",
		commandLine: "",
		cwd: "",
		env: [],
		url: "",
		headers: [],
		bridge: false
	};
	if (config.transport === "streamable-http") {
		if (typeof config.url !== "string") return { reason: "the URL is an expression" };
		return { form: {
			...base,
			transport: "streamable-http",
			url: config.url,
			headers: pairsOf(config.headers)
		} };
	}
	if (typeof config.command !== "string") return { reason: "the command is an expression" };
	const args = Array.isArray(config.args) ? config.args : [];
	if (args.some((arg) => typeof arg !== "string")) return { reason: "an argument is an expression" };
	if (config.command === "npx" && args[0] === "-y" && args[1] === "mcp-remote" && typeof args[2] === "string") {
		const headers = [];
		let understood = true;
		for (let i = 3; i < args.length; i += 1) {
			if (args[i] === "--allow-http") continue;
			const header = args[i] === "--header" ? /^([^:]+):\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/u.exec(args[i + 1] ?? "") : null;
			if (header === null) {
				understood = false;
				break;
			}
			headers.push(valueToPair(header[1], config.env?.[header[2]] ?? ""));
			i += 1;
		}
		if (understood) return { form: {
			...base,
			transport: "streamable-http",
			url: args[2],
			headers,
			bridge: true
		} };
	}
	const commandLine = joinCommandLine([config.command, ...args]);
	if (commandLine === void 0) return { reason: "an argument holds both kinds of quotes" };
	return { form: {
		...base,
		commandLine,
		cwd: typeof config.cwd === "string" ? config.cwd : "",
		env: pairsOf(config.env)
	} };
}
/**
* The bundle behind a server row, when this plugin may edit it: a removable
* bundle installed from a directory inside the bundle directory, whose patch
* holds exactly one insert of one MCP row.
*/
async function locateEditable({ pluginManager, entryId, profileDir, bundleDir }) {
	if (pluginManager === void 0) fail$1("the Plugin Manager is not available in this profile");
	const bundle = (await pluginManager.listBundles()).find((item) => (item?.rows ?? []).some((row) => row?.entryId === entryId));
	if (bundle === void 0 || bundle.removable !== true) fail$1("only servers added as a bundle (import, Add manually, AI quick add) can be edited here");
	const directory = typeof profileDir === "string" ? await bundleSourceDir(profileDir, bundle.name) : void 0;
	if (directory === void 0 || !isInside(bundleDir, directory)) fail$1("only bundles in the plugin's mcp-bundles directory can be edited here");
	let manifest;
	try {
		manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
	} catch {
		fail$1("the bundle's package.json cannot be read");
	}
	const patchName = typeof manifest?.dsh?.bundle?.patch === "string" ? manifest.dsh.bundle.patch : void 0;
	if (patchName === void 0) fail$1("the bundle declares no single patch file");
	const patchFile = join(directory, patchName);
	if (!isInside(directory, patchFile)) fail$1("the bundle's patch lies outside its directory");
	const text = await readFile(patchFile, "utf8").catch(() => fail$1("the bundle's patch cannot be read"));
	let patch;
	try {
		patch = parsePatch(text);
	} catch {
		fail$1("the bundle's patch is not valid YAML");
	}
	const operations = Array.isArray(patch) ? patch : [];
	const rows = operations.length === 1 && Array.isArray(operations[0]?.insert) && Object.keys(operations[0]).length === 1 ? operations[0].insert : void 0;
	if (rows === void 0 || rows.length !== 1 || rows[0]?.name !== "@deepseek-ai/dsh-mcp-client" || !record$3(rows[0].config)) fail$1("the bundle does more than add one MCP server, so edit its files instead");
	return {
		bundle,
		directory,
		patchFile,
		text,
		row: rows[0]
	};
}
/**
* Read the form for a server.
* @returns `{ editable: true, form }` or `{ editable: false, reason }`.
*/
async function readServerForm(options) {
	try {
		const { row } = await locateEditable(options);
		const { form, reason } = configToForm(row.config);
		return form === void 0 ? {
			editable: false,
			reason
		} : {
			editable: true,
			form
		};
	} catch (error) {
		return {
			editable: false,
			reason: String(error?.message ?? error).replace(/^MCP console:\s*/u, "")
		};
	}
}
/** Put back the kept expressions: only a name that held exactly that expression before. */
function restoreExpressions(rows, previous, what) {
	const kept = {};
	for (const row of Array.isArray(rows) ? rows : []) {
		if (row?.expression !== true) continue;
		const name = String(row.name ?? "");
		const before = previous?.[name];
		if (!isExpression(before) || before.__jsExpr.trim() !== String(row.value ?? "").trim()) fail$1(`the ${what} "${name.slice(0, 40)}" cannot be set to a new expression here`);
		kept[name] = before;
	}
	return kept;
}
/**
* Save an edited server and reinstall its bundle.
* @param options - the Plugin Manager, the row's entry id, the form, the
*   configured server names, the profile and bundle directories.
* @returns `{ serverName, bundle, application }`.
*/
async function updateServer({ pluginManager, entryId, request, existingNames = [], profileDir, bundleDir }) {
	const { bundle, directory, patchFile, text, row } = await locateEditable({
		pluginManager,
		entryId,
		profileDir,
		bundleDir
	});
	const old = row.config;
	const strip = (rows) => Array.isArray(rows) ? rows.filter((item) => item?.expression !== true) : [];
	if (request?.bridge === true && (request.headers ?? []).some((item) => item?.expression === true)) fail$1("a header kept as an expression cannot go through mcp-remote");
	const keptEnv = restoreExpressions(request?.env, old.env, "environment variable");
	const keptHeaders = restoreExpressions(request?.headers, old.headers, "header");
	const config = manualConfig({
		...request,
		name: old.serverName,
		env: strip(request?.env),
		headers: strip(request?.headers)
	}, existingNames.filter((name) => name !== old.serverName));
	if (config.transport === "stdio") config.env = {
		...config.env,
		...keptEnv
	};
	else config.headers = {
		...config.headers,
		...keptHeaders
	};
	if (config.transport === old.transport) {
		for (const [key, value] of Object.entries(old)) if (!KNOWN_KEYS.has(key)) config[key] = value;
	}
	const next = `# Edited by dsh-mcp-console. Generated; edit it again in the MCP page.\n${flowYaml([{ insert: [{
		...row,
		config
	}] }])}\n`;
	await pluginManager.removeBundle(bundle.name);
	await writeFile(patchFile, next, "utf8");
	try {
		const result = await pluginManager.installBundle(directory, { enabled: true });
		return {
			serverName: config.serverName,
			bundle: bundle.name,
			application: typeof result?.application === "string" ? result.application : "applied"
		};
	} catch (error) {
		await writeFile(patchFile, text, "utf8");
		await pluginManager.installBundle(directory, { enabled: true }).catch(() => void 0);
		throw error;
	}
}
//#endregion
//#region src/exporter.js
/**
* Export the profile's MCP servers in the `mcpServers` JSON most clients read
* (Claude Desktop, Claude Code, Cursor, Windsurf), for a backup or another
* client.
*
* No secret leaves the host: a value read from the environment is written as
* `${NAME}`, and a literal value under a credential-like name (or one that
* looks like a token) is replaced by a `${NAME}` placeholder and listed in
* the notes, so the person fills it in the other client.
*
* @module dsh-mcp-console/exporter
*/
const SECRET_NAME$1 = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu;
const OPAQUE = /^(?:Bearer\s+)?(?:sk|pk|ghp|gho|ghs|github_pat|xox[abp]|AKIA|eyJ)[-_A-Za-z0-9.]{8,}$|^[A-Za-z0-9+/_=-]{32,}$/u;
const record$2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const placeholder = (name) => `\${${name.replace(/[^A-Za-z0-9_]+/gu, "_").toUpperCase()}}`;
/** One map of values for export, with notes for what was withheld. */
function exportMap(map, server, what, notes) {
	const out = {};
	for (const [name, value] of Object.entries(record$2(map) ? map : {})) {
		const pair = valueToPair(name, value);
		if (pair.expression === true) {
			out[name] = placeholder(name);
			notes.push(`${server}: ${what} ${name} is computed by an expression in DSH; set it by hand`);
		} else if (pair.fromEnv) out[name] = pair.value.includes("${") ? pair.value : `\${${pair.value}}`;
		else if (SECRET_NAME$1.test(name) || OPAQUE.test(pair.value)) {
			out[name] = placeholder(name);
			notes.push(`${server}: ${what} ${name} holds a secret that was not exported; fill it in`);
		} else out[name] = pair.value;
	}
	return out;
}
/**
* Build the export.
* @param rows - MCP rows from `readMcpRows` (raw config, expressions kept).
* @returns `{ json, count, notes }` where `json` is the text to save or copy.
*/
function exportServers(rows) {
	const mcpServers = {};
	const notes = [];
	for (const row of Array.isArray(rows) ? rows : []) {
		const config = row?.config;
		if (!record$2(config) || typeof config.serverName !== "string") continue;
		const name = config.serverName;
		if (config.transport === "streamable-http") {
			if (typeof config.url !== "string") continue;
			mcpServers[name] = {
				type: "http",
				url: config.url,
				headers: exportMap(config.headers, name, "header", notes)
			};
		} else {
			if (typeof config.command !== "string") continue;
			const args = (Array.isArray(config.args) ? config.args : []).map((arg) => typeof arg === "string" ? arg : "${ARG}");
			mcpServers[name] = {
				command: config.command,
				args,
				env: exportMap(config.env, name, "environment variable", notes),
				...typeof config.cwd === "string" && config.cwd !== "" ? { cwd: config.cwd } : {}
			};
		}
		if (row.disabled === true) notes.push(`${name}: switched off in DSH`);
	}
	return {
		json: `${JSON.stringify({ mcpServers }, null, 2)}\n`,
		count: Object.keys(mcpServers).length,
		notes
	};
}
//#endregion
//#region src/probe.js
/**
* Try a server before it is installed: start it (or call its endpoint), run
* the MCP handshake, list its tools, and stop. What DSH would see is what the
* person sees: a local server runs through `ctx.subprocess` with the same
* explicit environment the row would get, and a remote one gets the same
* headers.
*
* Also answers which environment variables the DSH host can see, and which
* runtimes (`node`, `uvx`, `docker`, …) are on its PATH. Values never leave
* the host: an environment check answers yes or no, and any configured value
* that shows up in a server's output is masked.
*
* @module dsh-mcp-console/probe
*/
const PROTOCOL_VERSION = "2025-06-18";
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const MAX_TOOLS = 100;
const record$1 = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
/**
* One configured value as the Loader would evaluate it. Only expressions this
* plugin generated reach here (`process.env` reads and string literals).
*/
function resolveValue(value, env = process.env) {
	if (record$1(value) && typeof value.__jsExpr === "string") {
		const result = new Function("process", `return (${value.__jsExpr})`)({ env });
		return result === void 0 || result === null ? "" : String(result);
	}
	return typeof value === "string" ? value : "";
}
const resolveMap = (map, env) => Object.fromEntries(Object.entries(record$1(map) ? map : {}).map(([name, value]) => [name, resolveValue(value, env)]));
/** Replace every configured value of six characters or more in a text. */
function masker(values) {
	const secrets = values.filter((value) => typeof value === "string" && value.length >= 6).sort((a, b) => b.length - a.length);
	return (text) => secrets.reduce((out, secret) => out.split(secret).join(MASK), String(text ?? "")).slice(-2e3);
}
const request = (id, method, params) => ({
	jsonrpc: "2.0",
	id,
	method,
	params
});
const initialize = () => request(1, "initialize", {
	protocolVersion: PROTOCOL_VERSION,
	capabilities: {},
	clientInfo: {
		name: PLUGIN_ID,
		version: PLUGIN_VERSION
	}
});
const initialized = {
	jsonrpc: "2.0",
	method: "notifications/initialized"
};
/** The success projection: server identity and tool names. */
function success(init, list, startedAt) {
	const tools = Array.isArray(list?.tools) ? list.tools.map((tool) => String(tool?.name ?? "")).filter(Boolean) : [];
	return {
		ok: true,
		server: {
			name: String(init?.serverInfo?.name ?? ""),
			version: String(init?.serverInfo?.version ?? "")
		},
		protocolVersion: String(init?.protocolVersion ?? ""),
		toolCount: tools.length,
		tools: tools.slice(0, MAX_TOOLS),
		ms: Date.now() - startedAt
	};
}
const failure = (reason, message, extra = {}) => ({
	ok: false,
	reason,
	message,
	...extra
});
/** The JSON-RPC reply with `id` from a JSON or an event-stream body. */
async function readReply(response, id) {
	const type = response.headers.get("content-type") ?? "";
	const text = await response.text();
	const candidates = type.includes("text/event-stream") ? text.split(/\r?\n/u).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()) : [text];
	for (const candidate of candidates) try {
		const parsed = JSON.parse(candidate);
		for (const message of Array.isArray(parsed) ? parsed : [parsed]) if (message?.id === id) return message;
	} catch {}
}
/**
* Handshake with a streamable-http endpoint.
* @param config - a streamable-http config.
* @param options - `fetch`, the bound, the environment, cancellation.
* @returns the result projection.
*/
async function probeHttp(config, { fetchImpl = fetch, timeoutMs = 2e4, env = process.env, signal } = {}) {
	const startedAt = Date.now();
	let headers;
	try {
		headers = resolveMap(config.headers, env);
	} catch {
		return failure("config", "a header value could not be evaluated");
	}
	const mask = masker(Object.values(headers));
	const bound = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...signal === void 0 ? [] : [signal]]);
	let session;
	const post = async (body) => {
		return await fetchImpl(config.url, {
			method: "POST",
			headers: {
				...headers,
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				"mcp-protocol-version": PROTOCOL_VERSION,
				...session === void 0 ? {} : { "mcp-session-id": session }
			},
			body: JSON.stringify(body),
			signal: bound,
			redirect: "follow"
		});
	};
	try {
		const first = await post(initialize());
		if (first.status === 401 || first.status === 403) {
			const oauth = /bearer/iu.test(first.headers.get("www-authenticate") ?? "") && Object.keys(headers).every((name) => name.toLowerCase() !== "authorization");
			return failure(oauth ? "oauth" : "auth", `the server answered ${first.status}${oauth ? " and asks for an OAuth sign-in" : ""}`);
		}
		if (first.status === 404 || first.status === 405) return failure("not-streamable", `the server answered ${first.status} to a streamable-http request; it may offer SSE only`);
		if (!first.ok) return failure("http", `the server answered ${first.status}`, { output: mask(await first.text().catch(() => "")) });
		session = first.headers.get("mcp-session-id") ?? void 0;
		const init = await readReply(first, 1);
		if (init === void 0) return failure("protocol", "the reply is not an MCP initialize result");
		if (init.error !== void 0) return failure("protocol", mask(`initialize failed: ${init.error?.message ?? "error"}`));
		await post(initialized).then((response) => response.body?.cancel?.()).catch(() => void 0);
		const listed = await post(request(2, "tools/list", {}));
		const list = listed.ok ? await readReply(listed, 2) : void 0;
		if (session !== void 0) fetchImpl(config.url, {
			method: "DELETE",
			headers: {
				...headers,
				"mcp-session-id": session
			},
			signal: AbortSignal.timeout(3e3)
		}).catch(() => void 0);
		return success(init.result, list?.result, startedAt);
	} catch (error) {
		if (bound.aborted) return failure("timeout", `no answer within ${Math.round(timeoutMs / 1e3)} s`);
		return failure("unreachable", mask(`could not reach the server (${error?.cause?.code ?? error?.message ?? "network error"})`));
	}
}
/**
* Start a stdio server, handshake over newline-delimited JSON-RPC, and stop it.
* @param config - a stdio config.
* @param options - `ctx.subprocess`, the bound, the environment, cancellation.
* @returns the result projection.
*/
async function probeStdio(config, { subprocess, timeoutMs = 6e4, env = process.env, signal } = {}) {
	const startedAt = Date.now();
	if (subprocess === void 0) return failure("unavailable", "this profile cannot start processes");
	let childEnv;
	try {
		childEnv = resolveMap(config.env, env);
	} catch {
		return failure("config", "an environment value could not be evaluated");
	}
	const mask = masker(Object.values(childEnv));
	let executable;
	try {
		executable = await subprocess.resolveExecutable(config.command, childEnv);
	} catch {
		return failure("no-executable", `"${config.command}" was not found on the PATH DSH sees`);
	}
	const bound = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...signal === void 0 ? [] : [signal]]);
	let handle;
	try {
		handle = subprocess.spawn({
			argv: [executable, ...config.args ?? []],
			cwd: typeof config.cwd === "string" && config.cwd !== "" ? config.cwd : homedir(),
			stdio: {
				stdin: "pipe",
				stdout: "pipe",
				stderr: { maxBytes: 16 * 1024 }
			},
			graceMs: 2e3,
			signal: bound,
			env: childEnv
		});
	} catch (error) {
		return failure("spawn", mask(`could not start it (${error?.code ?? error?.message ?? "error"})`));
	}
	const stderr = () => mask(handle.collected?.stderr?.readFrom(0).text ?? "");
	const replies = /* @__PURE__ */ new Map();
	let wake;
	let buffer = "";
	handle.stdout?.setEncoding?.("utf8");
	handle.stdout?.on("data", (chunk) => {
		buffer += chunk;
		let index;
		while ((index = buffer.indexOf("\n")) >= 0) {
			const line = buffer.slice(0, index).trim();
			buffer = buffer.slice(index + 1);
			if (buffer.length > 1024 * 1024) buffer = "";
			try {
				const message = JSON.parse(line);
				if (message?.id !== void 0) replies.set(message.id, message);
			} catch {}
		}
		wake?.();
	});
	let exited = false;
	handle.done.then(() => {
		exited = true;
		wake?.();
	}, () => {
		exited = true;
		wake?.();
	});
	const send = (message) => new Promise((resolve) => {
		handle.stdin.write(`${JSON.stringify(message)}\n`, () => resolve());
	});
	const reply = async (id) => {
		while (!replies.has(id)) {
			if (exited || bound.aborted) return void 0;
			await new Promise((resolve) => {
				wake = resolve;
				bound.addEventListener("abort", resolve, { once: true });
			});
		}
		return replies.get(id);
	};
	try {
		await send(initialize());
		const init = await reply(1);
		if (init === void 0) {
			if (bound.aborted) return failure("timeout", `no MCP answer within ${Math.round(timeoutMs / 1e3)} s (a first run may still be downloading)`, { output: stderr() });
			return failure("exited", "the process ended before answering", { output: stderr() });
		}
		if (init.error !== void 0) return failure("protocol", mask(`initialize failed: ${init.error?.message ?? "error"}`), { output: stderr() });
		await send(initialized);
		await send(request(2, "tools/list", {}));
		const list = await reply(2);
		return success(init.result, list?.result, startedAt);
	} catch (error) {
		return failure("exited", mask(`the process stopped (${error?.code ?? error?.message ?? "error"})`), { output: stderr() });
	} finally {
		try {
			handle.stdin?.end();
		} catch {}
		handle.terminate();
		await handle.waitForExit(AbortSignal.timeout(5e3)).catch(() => false);
	}
}
/**
* Try a config with the transport it names.
* @param config - a dsh-mcp-client config.
* @param options - see `probeStdio` and `probeHttp`.
* @returns the result projection.
*/
function probeServer(config, options = {}) {
	return config.transport === "streamable-http" ? probeHttp(config, options) : probeStdio(config, options);
}
/**
* Which of the named environment variables the DSH host has (non-empty).
* @param names - variable names.
* @returns `{ NAME: boolean }`.
*/
function checkEnvironment(names, env = process.env) {
	const out = {};
	for (const name of (Array.isArray(names) ? names : []).slice(0, 100)) if (typeof name === "string" && ENV_NAME.test(name)) out[name] = typeof env[name] === "string" && env[name] !== "";
	return out;
}
/** The launchers commands commonly start with, and what provides them. */
const RUNTIMES = [
	"node",
	"npx",
	"uv",
	"uvx",
	"python",
	"docker",
	"bun",
	"deno"
];
/**
* Which runtimes the DSH host finds on its PATH, and their versions.
* @param subprocess - `ctx.subprocess`.
* @param run - a runner (from `createRunner`) for the version commands.
* @returns `{ name: { found, version? } }`.
*/
async function detectRuntimes(subprocess, run) {
	const entries = await Promise.all(RUNTIMES.map(async (name) => {
		if (subprocess === void 0) return [name, { found: false }];
		try {
			await subprocess.resolveExecutable(name);
		} catch {
			return [name, { found: false }];
		}
		const output = name === "npx" || name === "uvx" ? "" : await run([name, "--version"]).catch(() => "");
		const version = /\d+\.\d+(?:\.\d+)?/u.exec(output)?.[0];
		return [name, {
			found: true,
			...version === void 0 ? {} : { version }
		}];
	}));
	return Object.fromEntries(entries);
}
/** The runtime a command needs, when it is one of the known launchers. */
function runtimeOf(command) {
	const base = String(command ?? "").replace(/^.*[\\/]/u, "").replace(/\.(?:exe|cmd|bat)$/iu, "").toLowerCase();
	if (base === "python3" || base === "py") return "python";
	return RUNTIMES.includes(base) ? base : void 0;
}
//#endregion
//#region src/registry.js
/**
* Search the official MCP Registry and turn an entry into manual-add forms.
*
* Each entry (`server.json`) lists packages (npm, PyPI, OCI images) with the
* environment variables they need, and remote endpoints with their headers.
* Every runnable option becomes a form the page fills into Add manually, for
* the person to review, complete, test, and add; nothing is installed here.
* Secrets are filled as environment references, never as values.
*
* @module dsh-mcp-console/registry
*/
const DEFAULT_REGISTRY_URL = "https://registry.modelcontextprotocol.io";
const MAX_RESULTS = 30;
const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu;
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const str = (value) => typeof value === "string" ? value : "";
const list = (value) => Array.isArray(value) ? value : [];
/** A token for a command line: quoted when it holds spaces. */
const token = (text) => /[\s"]/u.test(text) || text === "" ? `"${text.replace(/"/gu, "")}"` : text;
/** A variable name for a `{placeholder}`: `smithery_api_key` → `SMITHERY_API_KEY`. */
const variableFor = (placeholder) => placeholder.replace(/[^A-Za-z0-9_]+/gu, "_").replace(/^(\d)/u, "_$1").toUpperCase();
/** The server name a form starts with: the entry's last segment without MCP words. */
function suggestName(entryName) {
	const base = (str(entryName).split("/").pop() ?? "").replace(/^(?:mcp[-_]server[-_]|server[-_]|mcp[-_])/iu, "").replace(/[-_](?:mcp[-_]server|mcp|server)$/iu, "").replace(/[^A-Za-z0-9_-]+/gu, "-").replace(/^-+|-+$/gu, "");
	return (base === "" ? "mcp" : base).slice(0, 32);
}
/** Arguments the registry declares, as command-line tokens; optional ones without a value are left out. */
function argumentTokens(args) {
	const out = [];
	for (const arg of list(args)) {
		if (!record(arg)) continue;
		const value = str(arg.value) || str(arg.default);
		const filled = value !== "" ? value : arg.isRequired === true ? `<${str(arg.valueHint) || str(arg.name) || "value"}>` : "";
		if (arg.type === "named") {
			if (filled === "" && arg.isRequired !== true) continue;
			out.push(token(str(arg.name)));
			if (filled !== "") out.push(token(filled));
		} else if (filled !== "") out.push(token(filled));
	}
	return out;
}
/** Environment rows: secrets as references to a variable of the same name. */
function environmentRows(variables) {
	return list(variables).filter((item) => record(item) && str(item.name) !== "").map((item) => {
		const name = str(item.name);
		const secret = item.isSecret === true || str(item.value) === "" && str(item.default) === "" && SECRET_NAME.test(name);
		return {
			name,
			value: secret ? name : str(item.value) || str(item.default),
			fromEnv: secret,
			...str(item.description) === "" ? {} : { description: str(item.description).slice(0, 200) },
			...item.isRequired === true ? { required: true } : {}
		};
	});
}
/** Header rows: `{placeholder}` values become environment templates. */
function headerRows(headers) {
	return list(headers).filter((item) => record(item) && str(item.name) !== "").map((item) => {
		const raw = str(item.value);
		const templated = raw.replace(/\{([A-Za-z0-9_.-]+)\}/gu, (_m, name) => `\${${variableFor(name)}}`);
		const fromEnv = templated !== raw;
		return {
			name: str(item.name),
			value: fromEnv ? templated : item.isSecret === true ? "" : raw,
			fromEnv,
			...str(item.description) === "" ? {} : { description: str(item.description).slice(0, 200) },
			...item.isRequired === true ? { required: true } : {}
		};
	});
}
/** An OCI reference with the entry's version when the identifier has no tag. */
function imageRef(pkg) {
	const id = str(pkg.identifier);
	return /:[^/]+$/u.test(id) || id.includes("@sha256:") || str(pkg.version) === "" ? id : `${id}:${pkg.version}`;
}
/**
* The runnable options of one registry entry.
* @param server - the entry's `server` object.
* @returns `[{ kind, label, form, runtime? }]` and the options left out with why.
*/
function registryOptions(server) {
	const name = suggestName(server?.name);
	const options = [];
	const skipped = [];
	for (const pkg of list(server?.packages)) {
		if (!record(pkg)) continue;
		const transport = str(pkg.transport?.type) || "stdio";
		const type = str(pkg.registryType);
		if (transport !== "stdio") {
			skipped.push(`${type} ${str(pkg.identifier)}: ${transport} package (start it yourself, then add its URL)`);
			continue;
		}
		const env = environmentRows(pkg.environmentVariables);
		const runtimeArgs = argumentTokens(pkg.runtimeArguments);
		const packageArgs = argumentTokens(pkg.packageArguments);
		let tokens;
		let runtime;
		if (type === "npm") {
			runtime = "npx";
			tokens = [
				"npx",
				"-y",
				...runtimeArgs,
				`${str(pkg.identifier)}${str(pkg.version) === "" ? "" : `@${pkg.version}`}`,
				...packageArgs
			];
		} else if (type === "pypi") {
			runtime = "uvx";
			tokens = [
				"uvx",
				...runtimeArgs,
				`${str(pkg.identifier)}${str(pkg.version) === "" ? "" : `==${pkg.version}`}`,
				...packageArgs
			];
		} else if (type === "oci") {
			runtime = "docker";
			const image = imageRef(pkg);
			if (packageArgs[0] === "run" && packageArgs.includes(token(image))) tokens = ["docker", ...packageArgs];
			else tokens = [
				"docker",
				"run",
				...runtimeArgs.length > 0 ? runtimeArgs : ["-i", "--rm"],
				...env.flatMap((row) => ["-e", row.name]),
				image,
				...packageArgs
			];
		} else {
			skipped.push(`${type || "unknown"} ${str(pkg.identifier)}: this package type is not supported here`);
			continue;
		}
		options.push({
			kind: type,
			label: `${type} · ${str(pkg.identifier)}${str(pkg.version) === "" ? "" : ` ${pkg.version}`}`,
			runtime,
			form: {
				name,
				transport: "stdio",
				commandLine: tokens.join(" "),
				cwd: "",
				env,
				url: "",
				headers: [],
				bridge: false
			}
		});
	}
	for (const remote of list(server?.remotes)) {
		if (!record(remote) || str(remote.url) === "") continue;
		const type = str(remote.type);
		if (type !== "streamable-http" && type !== "sse") continue;
		const url = str(remote.url).replace(/\{([A-Za-z0-9_.-]+)\}/gu, (match, variable) => str(remote.variables?.[variable]?.default) || match);
		const bridge = type === "sse";
		options.push({
			kind: type,
			label: `${type} · ${url}`,
			...bridge ? { runtime: "npx" } : {},
			form: {
				name,
				transport: "streamable-http",
				commandLine: "",
				cwd: "",
				env: [],
				url,
				headers: headerRows(remote.headers),
				bridge
			}
		});
	}
	return {
		options,
		skipped
	};
}
/** The projection of one result the page shows. */
function registryResult(entry) {
	const server = record(entry?.server) ? entry.server : entry;
	const { options, skipped } = registryOptions(server);
	const repository = str(server?.repository?.url);
	return {
		name: str(server?.name),
		title: str(server?.title),
		description: str(server?.description).slice(0, 300),
		version: str(server?.version),
		...repository.startsWith("https://") ? { repository } : {},
		...str(server?.websiteUrl).startsWith("https://") ? { website: str(server.websiteUrl) } : {},
		options,
		skipped
	};
}
/**
* Search the registry.
* @param options - the query, a cursor from a previous page, the registry
*   base URL, `fetch`, and cancellation.
* @returns `{ results, nextCursor? }`.
*/
async function searchRegistry({ query, cursor, baseUrl = DEFAULT_REGISTRY_URL, fetchImpl = fetch, signal, timeoutMs = 15e3 }) {
	const search = typeof query === "string" ? query.trim().slice(0, 100) : "";
	const url = new URL("/v0.1/servers", baseUrl);
	url.searchParams.set("version", "latest");
	url.searchParams.set("limit", String(MAX_RESULTS));
	if (search !== "") url.searchParams.set("search", search);
	if (typeof cursor === "string" && cursor !== "") url.searchParams.set("cursor", cursor.slice(0, 300));
	let response;
	try {
		response = await fetchImpl(url, {
			headers: { accept: "application/json" },
			signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), ...signal === void 0 ? [] : [signal]])
		});
	} catch (error) {
		throw new Error(`MCP console: the MCP Registry could not be reached (${error?.cause?.code ?? error?.name ?? "network error"}); check the network or proxy, or use AI quick add`);
	}
	if (!response.ok) throw new Error(`MCP console: the MCP Registry answered ${response.status}`);
	let body;
	try {
		body = await response.json();
	} catch {
		throw new Error("MCP console: the MCP Registry sent an unreadable reply");
	}
	const results = list(body?.servers).map(registryResult).filter((result) => result.name !== "");
	const next = str(body?.metadata?.nextCursor);
	return {
		results,
		...next === "" || results.length < MAX_RESULTS ? {} : { nextCursor: next }
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
/** The Add manually form fields the page may send; anything else is dropped. */
function pickForm(payload) {
	return {
		name: payload?.name,
		transport: payload?.transport,
		commandLine: payload?.commandLine,
		cwd: payload?.cwd,
		env: payload?.env,
		url: payload?.url,
		headers: payload?.headers,
		bridge: payload?.bridge === true
	};
}
/** Page events the log accepts, and how many per minute. */
const CLIENT_EVENTS = /* @__PURE__ */ new Set(["version-mismatch", "page-error"]);
const CLIENT_EVENTS_PER_MINUTE = 20;
function createConsoleRpc({ log, diagnostics, revealLog, status, toggle, remove, importServer, addServer, testServer, serverForm, updateServer, exportServers, checkEnv, runtimes, searchRegistry, wait, setRepository, models, quickAdd, scan, lastScan, analyze }) {
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
		"servers/add": (payload) => addServer(pickForm(payload)),
		"servers/test": (payload, signal) => testServer(pickForm(payload), signal),
		"servers/config": (payload) => serverForm(String(payload?.entryId ?? "")),
		"servers/update": (payload) => updateServer(String(payload?.entryId ?? ""), pickForm(payload)),
		"servers/export": () => exportServers(),
		"env/check": (payload) => checkEnv(Array.isArray(payload?.names) ? payload.names.filter((name) => typeof name === "string") : []),
		runtimes: (payload) => runtimes(payload?.refresh === true),
		diagnostics: (payload) => typeof diagnostics === "function" ? diagnostics({ pageVersion: typeof payload?.pageVersion === "string" ? payload.pageVersion.slice(0, 40) : void 0 }) : { text: "" },
		"diagnostics/reveal": (_payload, signal) => revealLog(signal),
		"log/client": (payload) => {
			const event = String(payload?.event ?? "");
			if (!CLIENT_EVENTS.has(event)) throw new Error("MCP console: unknown page event");
			const minute = Math.floor(Date.now() / 6e4);
			if (clientEvents.minute !== minute) {
				clientEvents.minute = minute;
				clientEvents.count = 0;
			}
			clientEvents.count += 1;
			if (clientEvents.count <= CLIENT_EVENTS_PER_MINUTE) log?.warn(`page/${event}`, { detail: String(payload?.detail ?? "").slice(0, 2e3) });
			return { logged: clientEvents.count <= CLIENT_EVENTS_PER_MINUTE };
		},
		"registry/search": (payload, signal) => searchRegistry({
			query: typeof payload?.query === "string" ? payload.query : "",
			cursor: typeof payload?.cursor === "string" ? payload.cursor : void 0
		}, signal),
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
	const clientEvents = {
		minute: 0,
		count: 0
	};
	return async (endpoint, payload, signal) => {
		const startedAt = Date.now();
		const quiet = QUIET.has(endpoint);
		try {
			const handle = Object.hasOwn(endpoints, endpoint) ? endpoints[endpoint] : void 0;
			if (handle === void 0) return failed("MCP console: unknown endpoint");
			if (log !== void 0) log.mask(formSecrets(payload));
			const value = await handle(payload, signal);
			if (log !== void 0 && !quiet) {
				const failedTest = endpoint === "servers/test" && value?.ok === false;
				log.write(failedTest ? "warn" : "info", endpoint, {
					request: summarizeRequest(endpoint, payload),
					result: summarizeResult(endpoint, value),
					ms: Date.now() - startedAt
				});
			}
			return ok(value);
		} catch (error) {
			if (log !== void 0 && !(signal?.aborted && endpoint === "status/wait")) log.error(endpoint, {
				request: summarizeRequest(endpoint, payload),
				error: failureFields(error),
				ms: Date.now() - startedAt
			});
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
	/** Bound on trying a local server before it is added, in milliseconds. */
	testTimeoutMs: z.natural().min(5e3).default(DEFAULT_TEST_TIMEOUT_MS),
	/** The MCP Registry searched from the page. */
	registryUrl: z.string().default(DEFAULT_REGISTRY_URL),
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
	const configValue = (key) => typeof config?.[key] === "string" || typeof config?.[key] === "number" ? config[key] : void 0;
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
	/** The plugin's own log (DSH sends `ctx.logger` to the console only). */
	const log = createLog({
		directory: () => join(dshHome(), "storages", "dsh-mcp-console", "logs"),
		mirror: ctx.logger
	});
	const dshVersion = () => {
		if (typeof process.env.DSH_APP_VERSION === "string" && process.env.DSH_APP_VERSION !== "") return process.env.DSH_APP_VERSION;
		return typeof process.env.DSH_CLIENT_VERSION === "string" ? process.env.DSH_CLIENT_VERSION : void 0;
	};
	log.info("plugin/start", {
		version: PLUGIN_VERSION,
		dsh: dshVersion(),
		platform: process.platform,
		arch: process.arch,
		node: process.version
	});
	ctx.effect(() => () => {
		log.info("plugin/stop", {});
	}, "mcp-console: log");
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
			log.warn("scan/save", { error: {
				message: error.message,
				code: error.code
			} });
		}
	};
	const withSize = (scan) => scan === void 0 ? null : {
		...scan,
		inventoryChars: inventoryText(scan).length
	};
	/** The config of one row of an installed bundle, read from its patch (for a switched-off bundle). */
	const readBundleConfig = async (bundleName, rowId) => {
		const dir = profile()?.dir;
		if (typeof dir !== "string") return void 0;
		const packageDir = join(dir, "node_modules", ...bundleName.split("/"));
		const patchName = JSON.parse(await readFile(join(packageDir, "package.json"), "utf8"))?.dsh?.bundle?.patch;
		if (typeof patchName !== "string") return void 0;
		const patch = parsePatch(await readFile(join(packageDir, patchName), "utf8"));
		for (const operation of Array.isArray(patch) ? patch : []) for (const row of Array.isArray(operation?.insert) ? operation.insert : []) if (row?.id === rowId && row?.name === "@deepseek-ai/dsh-mcp-client") return row.config;
	};
	/** Runtimes found on the host's PATH, kept for a minute. */
	let runtimeCache;
	const runtimes = async (refresh) => {
		if (!refresh && runtimeCache !== void 0 && Date.now() - runtimeCache.at < 6e4) return runtimeCache.value;
		const value = await detectRuntimes(service("subprocess"), createRunner(service("subprocess"), { timeoutMs: 1e4 }));
		runtimeCache = {
			at: Date.now(),
			value
		};
		return value;
	};
	/** A form's config for a test: the name may still be empty, and kept expressions are left out. */
	const testConfig = (form) => manualConfig({
		...form,
		name: typeof form.name === "string" && /^[A-Za-z0-9_-]{1,32}$/u.test(form.name.trim()) ? form.name : "test",
		env: (form.env ?? []).filter((item) => item?.expression !== true),
		headers: (form.headers ?? []).filter((item) => item?.expression !== true)
	});
	const listing = () => listServers({
		loader: service("loader"),
		tools: service("tools"),
		pluginManager: service("pluginManager"),
		profileDir: profile()?.dir,
		repositories: repositories(),
		readBundleConfig
	});
	const handler = createConsoleRpc({
		log,
		diagnostics: async ({ pageVersion }) => {
			const { servers, manageable } = await listing();
			const text = buildDiagnostics({
				pluginVersion: PLUGIN_VERSION,
				pageVersion,
				dshVersion: dshVersion(),
				platform: process.platform,
				arch: process.arch,
				nodeVersion: process.version,
				manageable,
				sessions: service("sessionController") !== void 0,
				servers,
				runtimes: runtimeCache?.value,
				recent: log.recent({
					limit: 30,
					errors: true
				}),
				logFile: log.file(),
				bundleDir: bundleDir()
			});
			return {
				text: log.clean(text, Number.POSITIVE_INFINITY),
				logFile: log.file(),
				logDir: log.directory()
			};
		},
		revealLog: async (signal) => {
			const controller = service("sessionController");
			await log.flush();
			const file = log.file();
			const target = await access(file).then(() => file, () => log.directory());
			if (typeof controller?.openWorkspacePath !== "function") throw new Error(`MCP console: this DSH cannot open folders; the logs are in ${log.directory()}`);
			try {
				await controller.openWorkspacePath({
					path: target,
					action: "reveal"
				}, signal ?? new AbortController().signal);
			} catch {
				throw new Error(`MCP console: the folder could not be opened; the logs are in ${log.directory()}`);
			}
			return { opened: target };
		},
		status: async () => ({
			...await listing(),
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
		testServer: (form, signal) => {
			const config = testConfig(form);
			try {
				log.mask(Object.values({
					...config.env ?? {},
					...config.headers ?? {}
				}).map((value) => resolveValue(value)));
			} catch {}
			log.mask(configValues(config));
			const local = configValue("testTimeoutMs") ?? 9e4;
			const timeoutMs = config.transport !== "stdio" ? REMOTE_TEST_TIMEOUT_MS : config.args?.[1] === "mcp-remote" ? Math.max(local, 12e4) : local;
			return probeServer(config, {
				subprocess: service("subprocess"),
				timeoutMs,
				signal
			});
		},
		serverForm: (entryId) => readServerForm({
			pluginManager: service("pluginManager"),
			entryId,
			profileDir: profile()?.dir,
			bundleDir: bundleDir()
		}),
		updateServer: (entryId, form) => changing(() => updateServer({
			pluginManager: service("pluginManager"),
			entryId,
			request: form,
			existingNames: existingNames(),
			profileDir: profile()?.dir,
			bundleDir: bundleDir()
		})),
		exportServers: async () => exportServers(readMcpRows(service("loader"))),
		checkEnv: (names) => checkEnvironment(names),
		runtimes,
		searchRegistry: ({ query, cursor }, signal) => searchRegistry({
			query,
			cursor,
			baseUrl: configValue("registryUrl") || "https://registry.modelcontextprotocol.io",
			signal
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
			lastScan = {
				...await scanLocal({ run }),
				runtimes: await runtimes(true).catch(() => void 0)
			};
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
export { Config, MASK, acceptRepositoryUrl, apply, bundleFiles, bundleSourceDir, checkEnvironment, classifySource, clientConfigPaths, configToForm, createChangeFeed, createConsoleRpc, createRunner, deleteServer, detectRuntimes, discoveryPrompt, environmentExpression, exportServers, flowYaml, importClientServer, inject, installConfigBundle, inventoryText, isInside, joinCommandLine, listModelChoices, listServers, manualConfig, name, normalizeRepository, openPromptSession, parseClientServers, parsePatch, pickedModel, probeHttp, probeServer, probeStdio, quickAddPrompt, readClientServer, readClientServers, readMcpRows, readServerForm, redactArgs, redactConfig, redactMap, registryOptions, registryResult, resolveDefaultWorkspace, resolveValue, runtimeOf, scanLocal, searchRegistry, selectSessionModel, serverNameFor, serverStatus, setServerEnabled, splitCommandLine, suggestName, toMcpClientConfig, toolPrefix, toolsByServer, updateServer, valueToPair };

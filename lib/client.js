window.__ModuleLoader__.load({
	id: "dsh-mcp-console",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client-groups.js
		/**
		* How the page folds the MCP servers found in other clients: identical
		* servers (same name, same launch line) configured in several clients become
		* one row listing those clients.
		*
		* @module dsh-mcp-console/client-groups
		*/
		/** One line for a server's launch: the command and its arguments, or its URL. */
		const launchLine = (item) => item.command ? [item.command, ...item.args ?? []].join(" ") : item.url ?? "";
		/**
		* Fold identical servers configured in several clients into one row: same
		* name and same launch line. The first client is the one imported from.
		*/
		function groupClientServers(servers) {
			const groups = /* @__PURE__ */ new Map();
			for (const item of servers) {
				const key = `${item.name}\u0000${launchLine(item)}`;
				const group = groups.get(key);
				if (group === void 0) groups.set(key, {
					...item,
					key,
					clients: [item.client]
				});
				else if (!group.clients.includes(item.client)) group.clients.push(item.client);
			}
			return [...groups.values()];
		}
		//#endregion
		//#region src/client-ui.jsx
		/**
		* Shared page primitives: panels, buttons, the switch, status dots, the side
		* drawer, icons, and message helpers.
		*
		* @module dsh-mcp-console/client-ui
		*/
		const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => values[name] === void 0 ? match : String(values[name]));
		const clearMessage = (error) => String(error instanceof Error ? error.message : error).replace(/^MCP console:\s*/u, "");
		function Button({ variant, size, children, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mcpc-btn",
				"data-variant": variant,
				"data-size": size,
				...rest,
				children
			});
		}
		/** A bordered section with an optional head row. */
		function Panel({ title, aside, children, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: `mcpc-panel${className ? ` ${className}` : ""}`,
				children: [(title || aside) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "mcpc-panel-head",
					children: [
						title && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: "mcpc-panel-title",
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-sp" }),
						aside
					]
				}), children]
			});
		}
		function Switch({ checked, label, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "switch",
				className: "mcpc-switch",
				"aria-checked": checked,
				"aria-label": label,
				...rest
			});
		}
		/** The state dot of a server: connected, connecting, failed, or off. */
		const DOT = {
			connected: "ok",
			starting: "wait",
			failed: "bad",
			disabled: "off",
			stopped: "off"
		};
		function Dot({ status, title }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-dot",
				"data-tone": DOT[status] ?? "off",
				title
			});
		}
		/** A panel sliding in from the right, closed with the scrim, the X, or Escape. */
		function Drawer({ title, onClose, footer, children, closeLabel }) {
			react.useEffect(() => {
				const onKey = (event) => {
					if (event.key === "Escape") onClose();
				};
				document.addEventListener("keydown", onKey);
				return () => document.removeEventListener("keydown", onKey);
			}, [onClose]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mcpc-scrim",
				onClick: onClose
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: "mcpc-drawer",
				role: "dialog",
				"aria-label": title,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "mcpc-drawer-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "mcpc-panel-title",
								children: title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-sp" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "icon",
								"aria-label": closeLabel,
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: "x" })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mcpc-drawer-body",
						children
					}),
					footer && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("footer", {
						className: "mcpc-drawer-foot",
						children: footer
					})
				]
			})] });
		}
		const PATHS = {
			plus: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5v14M5 12h14" }),
			caret: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m9 6 6 6-6 6" }),
			x: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 6l12 12M18 6 6 18" }),
			search: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "11",
				cy: "11",
				r: "6.5"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m20 20-3.5-3.5" })] }),
			pen: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 20h4L19 9l-4-4L4 16z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m13.5 6.5 4 4" })] }),
			spark: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" })] }),
			import: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 4v11" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m7 10 5 5 5-5" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 20h14" })
			] }),
			check: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5 12 5 5 9-10" })
		};
		function Icon({ name, size = 16 }) {
			if (name === "more") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "currentColor",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "5",
						cy: "12",
						r: "1.8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "12",
						r: "1.8"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "19",
						cy: "12",
						r: "1.8"
					})
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.9",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: PATHS[name]
			});
		}
		/** Close a popup when the person clicks anywhere else. */
		function useOutsideClose(open, onClose) {
			const ref = react.useRef(null);
			react.useEffect(() => {
				if (!open) return void 0;
				const onDown = (event) => {
					if (ref.current !== null && !ref.current.contains(event.target)) onClose();
				};
				document.addEventListener("mousedown", onDown);
				return () => document.removeEventListener("mousedown", onDown);
			}, [open, onClose]);
			return ref;
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
		//#region src/client-form.jsx
		/**
		* The one server form: filled from the registry, typed by hand, or opened to
		* edit. Only what most servers need is shown; the working directory and the
		* mcp-remote bridge sit under Advanced. Saving tries the server first (the
		* MCP handshake runs on the host); a failed try can still be saved on purpose.
		*
		* @module dsh-mcp-console/client-form
		*/
		const emptyPair = () => ({
			name: "",
			value: "",
			fromEnv: false
		});
		/** A name whose literal value is masked while typing. */
		const SECRET_NAME = /key|token|secret|password|passwd|auth|credential|cookie|bearer/iu;
		const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
		/** The launchers a command may start with, and the runtime each needs. */
		const RUNTIME_OF = {
			npx: "npx",
			node: "node",
			uvx: "uvx",
			uv: "uv",
			python: "python",
			python3: "python",
			py: "python",
			docker: "docker",
			bun: "bun",
			bunx: "bun",
			deno: "deno"
		};
		/** What to install for each runtime. */
		const RUNTIME_HINT = {
			npx: "Node.js",
			node: "Node.js",
			uvx: "uv",
			uv: "uv",
			python: "Python",
			docker: "Docker Desktop",
			bun: "Bun",
			deno: "Deno"
		};
		const BRIDGE_REASONS = /* @__PURE__ */ new Set(["oauth", "not-streamable"]);
		const REASONS = /* @__PURE__ */ new Set([
			"config",
			"auth",
			"oauth",
			"not-streamable",
			"http",
			"protocol",
			"timeout",
			"unreachable",
			"unavailable",
			"no-executable",
			"spawn",
			"exited"
		]);
		const INITIAL_FORM = {
			name: "",
			transport: "stdio",
			commandLine: "",
			cwd: "",
			env: [],
			url: "",
			headers: [],
			bridge: false
		};
		/** The variables an environment row reads: a bare name, or each `${NAME}` of a template. */
		function referencedVariables(pair) {
			if (pair?.fromEnv !== true || typeof pair.value !== "string") return [];
			const value = pair.value.trim();
			if (ENV_NAME.test(value)) return [value];
			return [...value.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu)].map((match) => match[1]);
		}
		/** Whether DSH sees each referenced variable, asked again shortly after the rows change. */
		function useEnvironment(call, rows) {
			const key = [...new Set(rows.flatMap(referencedVariables))].sort().join(",");
			const [status, setStatus] = react.useState({});
			react.useEffect(() => {
				if (key === "") return void 0;
				const timer = window.setTimeout(() => {
					call("env/check", { names: key.split(",") }).then(setStatus).catch(() => void 0);
				}, 400);
				return () => window.clearTimeout(timer);
			}, [call, key]);
			return status;
		}
		/** The first word of a command line, without a path or extension. */
		function launcher(commandLine) {
			const first = String(commandLine ?? "").trim().match(/^"([^"]+)"|^'([^']+)'|^(\S+)/u);
			return (first?.[1] ?? first?.[2] ?? first?.[3] ?? "").replace(/^.*[\\/]/u, "").replace(/\.(?:exe|cmd|bat)$/iu, "").toLowerCase();
		}
		/** The runtime a form needs that DSH did not find, if any. */
		function missingRuntime(form, runtimes) {
			if (runtimes === void 0) return void 0;
			const needed = form.transport === "streamable-http" ? form.bridge ? "npx" : void 0 : RUNTIME_OF[launcher(form.commandLine)];
			if (needed === void 0 || runtimes[needed]?.found !== false) return void 0;
			return {
				name: needed,
				install: RUNTIME_HINT[needed] ?? needed
			};
		}
		/** A server name suggested from the command or URL, for an empty name field. */
		function suggestedName(form) {
			try {
				if (form.transport === "streamable-http") return new URL(form.url).hostname.split(".").filter((part) => !/^(?:www|mcp|api|server)$/u.test(part))[0]?.slice(0, 32) ?? "";
				return classifySource(form.commandLine).label.replace(/^.*\//u, "").replace(/[@:=].*$/u, "").replace(/^(?:mcp-server-|server-|mcp-)/u, "").replace(/-mcp(?:-server)?$/u, "").replace(/[^A-Za-z0-9_-]+/gu, "-").slice(0, 32);
			} catch {
				return "";
			}
		}
		/** Name/value rows (environment variables or headers); a row may read its value from the environment. */
		function Pairs({ label, pairs, onChange, namePlaceholder, disabled, environment, t }) {
			const update = (index, patch) => onChange(pairs.map((pair, i) => i === index ? {
				...pair,
				...patch
			} : pair));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-label",
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-pairs",
						children: [pairs.map((pair, index) => {
							const missing = referencedVariables(pair).filter((name) => environment[name] === false);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mcpc-pair-wrap",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mcpc-pair",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: "mcpc-input",
												"data-mono": "true",
												spellCheck: false,
												disabled: disabled || pair.expression,
												placeholder: namePlaceholder,
												"aria-label": t("pairName"),
												value: pair.name,
												onChange: (event) => update(index, { name: event.target.value })
											}),
											pair.expression ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-input mcpc-expr",
												title: t("manualExpressionHint"),
												children: `!!js ${pair.value}`
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: "mcpc-input",
												"data-mono": "true",
												spellCheck: false,
												disabled,
												type: !pair.fromEnv && SECRET_NAME.test(pair.name) ? "password" : "text",
												autoComplete: "off",
												"aria-label": t("pairValue"),
												placeholder: pair.fromEnv ? t("manualEnvPlaceholder") : t("manualValuePlaceholder"),
												value: pair.value,
												onChange: (event) => update(index, { value: event.target.value })
											}),
											pair.expression ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-muted",
												children: t("keptExpression")
											}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
												className: "mcpc-check",
												title: t("manualFromEnvHint"),
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													type: "checkbox",
													disabled,
													checked: pair.fromEnv,
													onChange: (event) => update(index, { fromEnv: event.target.checked })
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("manualFromEnv") })]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												variant: "icon",
												disabled,
												"aria-label": t("manualRemoveRow"),
												onClick: () => onChange(pairs.filter((_, i) => i !== index)),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
													name: "x",
													size: 14
												})
											})
										]
									}),
									pair.description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-hint",
										children: `${pair.required ? `${t("manualRequired")} · ` : ""}${pair.description}`
									}),
									missing.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-hint",
										"data-tone": "warn",
										children: fill(t("envMissing"), { names: missing.join(", ") })
									})
								]
							}, index);
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							disabled,
							onClick: () => onChange([...pairs, emptyPair()]),
							children: t("manualAddRow")
						}) })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-hint",
						children: t("manualSecrets")
					})
				]
			});
		}
		/** What a try found: the server and its tools, or why it failed and what to do. */
		function TestResult({ result, remote, bridged, t, onBridge }) {
			if (result.ok) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-result",
				"data-tone": "ok",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "mcpc-result-title",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
						name: "check",
						size: 14
					}), fill(t("testOk"), {
						server: [result.server.name, result.server.version].filter(Boolean).join(" ") || "—",
						count: result.toolCount,
						ms: result.ms
					})]
				}), result.tools.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mcpc-tags",
					children: result.tools.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-tag",
						children: name
					}, name))
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-result",
				"data-tone": "bad",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "mcpc-result-title",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
							name: "x",
							size: 14
						}), t(REASONS.has(result.reason) ? `test_${result.reason}` : "test_failed")]
					}),
					result.message && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-muted",
						children: result.message
					}),
					result.output && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "mcpc-err",
						children: result.output
					}),
					remote && !bridged && BRIDGE_REASONS.has(result.reason) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "mcpc-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-muted",
							children: t("testBridgeHint")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							onClick: onBridge,
							children: t("testUseBridge")
						})]
					})
				]
			});
		}
		/**
		* The server form.
		* @param props - `mode` (`add` | `edit`), the starting form, the registry
		*   entry it came from, the edited row's entry id, the caller, the copy, the
		*   runtimes found, and what to do after a save.
		*/
		function ServerForm({ mode, initial, origin, entryId, call, t, runtimes, onSaved }) {
			const editing = mode === "edit";
			const [form, setForm] = react.useState(() => ({
				...INITIAL_FORM,
				...initial ?? {}
			}));
			const [busy, setBusy] = react.useState(false);
			const [testing, setTesting] = react.useState(false);
			const [test, setTest] = react.useState();
			const [error, setError] = react.useState();
			const set = (patch) => {
				setForm((current) => ({
					...current,
					...patch
				}));
				setTest(void 0);
			};
			const remote = form.transport === "streamable-http";
			const suggestion = suggestedName(form);
			const name = form.name.trim() === "" ? suggestion : form.name.trim();
			const ready = name !== "" && (remote ? form.url.trim() !== "" : form.commandLine.trim() !== "");
			const environment = useEnvironment(call, [...form.env, ...form.headers]);
			const missing = missingRuntime(form, runtimes);
			const advancedOpen = form.bridge || form.cwd.trim() !== "";
			const payload = () => ({
				...form,
				name
			});
			const runTest = () => {
				setTesting(true);
				setError(void 0);
				return call("servers/test", payload()).then((result) => {
					setTest(result);
					return result;
				}).catch((failure) => {
					setError(clearMessage(failure));
				}).finally(() => setTesting(false));
			};
			const save = () => {
				setBusy(true);
				setError(void 0);
				return (editing ? call("servers/update", {
					...payload(),
					entryId
				}) : call("servers/add", payload())).then((result) => onSaved(result)).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const submit = (event) => {
				event.preventDefault();
				runTest().then((result) => result?.ok === true ? save() : void 0);
			};
			const working = busy || testing;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: "mcpc-form",
				onSubmit: submit,
				children: [
					origin && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mcpc-result",
						"data-tone": "info",
						children: fill(t("registryFilled"), { name: origin })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-seg",
						role: "radiogroup",
						"aria-label": t("manualKind"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "radio",
							"aria-checked": !remote,
							disabled: working,
							onClick: () => set({ transport: "stdio" }),
							children: t("manualStdio")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "radio",
							"aria-checked": remote,
							disabled: working,
							onClick: () => set({ transport: "streamable-http" }),
							children: t("manualHttp")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "mcpc-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-label",
								children: t("manualName")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "mcpc-input",
								spellCheck: false,
								disabled: working || editing,
								maxLength: 32,
								placeholder: suggestion === "" ? t("manualNamePlaceholder") : suggestion,
								value: form.name,
								onChange: (event) => set({ name: event.target.value })
							}),
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								children: t("editNameFixed")
							}) : suggestion !== "" && form.name.trim() === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								children: fill(t("nameSuggested"), { name: suggestion })
							})
						]
					}),
					remote ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "mcpc-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-label",
								children: t("manualUrl")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "mcpc-input",
								"data-mono": "true",
								type: "url",
								spellCheck: false,
								disabled: working,
								placeholder: "https://mcp.example.com/mcp",
								value: form.url,
								onChange: (event) => set({ url: event.target.value })
							}),
							!form.bridge && /\/sse\/?(?:\?|$)/u.test(form.url) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								"data-tone": "warn",
								children: t("manualSseHint")
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "mcpc-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-label",
								children: t("manualCommand")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "mcpc-input",
								"data-mono": "true",
								spellCheck: false,
								disabled: working,
								placeholder: "npx -y @upstash/context7-mcp",
								value: form.commandLine,
								onChange: (event) => set({ commandLine: event.target.value })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								children: t("manualCommandHint")
							})
						]
					}),
					missing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "warn",
						children: fill(t("runtimeMissing"), {
							name: missing.name,
							install: missing.install
						})
					}),
					remote ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pairs, {
						label: t("headers"),
						pairs: form.headers,
						onChange: (headers) => set({ headers }),
						namePlaceholder: "Authorization",
						disabled: working,
						environment,
						t
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pairs, {
						label: t("env"),
						pairs: form.env,
						onChange: (env) => set({ env }),
						namePlaceholder: "API_KEY",
						disabled: working,
						environment,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "mcpc-adv",
						open: advancedOpen,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("advanced") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: remote ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "mcpc-check",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								disabled: working,
								checked: form.bridge,
								onChange: (event) => set({ bridge: event.target.checked })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("manualBridge") })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-hint",
							children: t("manualBridgeOn")
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "mcpc-field",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-label",
								children: t("manualCwd")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "mcpc-input",
								"data-mono": "true",
								spellCheck: false,
								disabled: working,
								placeholder: t("manualCwdPlaceholder"),
								value: form.cwd,
								onChange: (event) => set({ cwd: event.target.value })
							})]
						}) })]
					}),
					test && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TestResult, {
						result: test,
						remote,
						bridged: form.bridge,
						t,
						onBridge: () => set({ bridge: true })
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "bad",
						role: "alert",
						children: `${t("error")}: ${error}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-actions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								type: "submit",
								variant: "primary",
								size: "md",
								disabled: working || !ready,
								children: testing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-spinner" }), t("testRunning")] }) : busy ? t("saving") : editing ? t("editSave") : t("manualAdd")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "md",
								disabled: working || !ready,
								onClick: () => {
									runTest();
								},
								children: t("testOnly")
							}),
							test && !test.ok && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "md",
								variant: "ghost",
								disabled: working,
								onClick: () => {
									save();
								},
								children: editing ? t("editSaveAnyway") : t("manualAddAnyway")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-sp" }),
							testing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-muted",
								children: remote && !form.bridge ? t("testWaitRemote") : t("testWaitLocal")
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client-models.jsx
		/**
		* The provider and model choice for AI sessions, shared by AI install and the
		* AI research of a scan.
		*
		* @module dsh-mcp-console/client-models
		*/
		const MODEL_KEY = "dsh-mcp-console.model";
		/** The last model chosen on this page, per viewer; unavailable storage just forgets it. */
		function rememberedModel() {
			try {
				const value = JSON.parse(window.localStorage.getItem(MODEL_KEY) ?? "null");
				return typeof value?.provider === "string" && typeof value?.model === "string" ? value : void 0;
			} catch {
				return;
			}
		}
		function rememberModel(value) {
			try {
				window.localStorage.setItem(MODEL_KEY, JSON.stringify(value));
			} catch {}
		}
		/** A choice still offered by the listing, else undefined. */
		function offered(choices, value) {
			return (choices?.providers?.find((item) => item.id === value?.provider))?.models.some((model) => model.id === value?.model) ? {
				provider: value.provider,
				model: value.model
			} : void 0;
		}
		/** The first offered model, for a listing without a usable default. */
		function firstOffered(choices) {
			const provider = choices?.providers?.find((item) => item.models.length > 0);
			return provider === void 0 ? void 0 : {
				provider: provider.id,
				model: provider.models[0].id
			};
		}
		/** One shared selection for both AI flows: remembered, else the default model, else the first offered. */
		function useModelChoice(choices) {
			const [choice, setChoice] = react.useState();
			react.useEffect(() => {
				if (choices === void 0) return;
				setChoice((current) => offered(choices, current) ?? offered(choices, rememberedModel()) ?? offered(choices, choices.default) ?? firstOffered(choices));
			}, [choices]);
			const update = (next) => {
				setChoice(next);
				if (next !== void 0) rememberModel(next);
			};
			return [choice, update];
		}
		/** Provider and model selects, like the model picker's two levels. */
		function ModelPicker({ choices, value, onChange, disabled, t }) {
			const providers = choices === void 0 ? [] : choices.providers.filter((provider) => provider.models.length > 0);
			if (providers.length === 0) {
				const reason = choices === void 0 ? t("modelLoading") : choices.stale === true ? t("modelStale") : t("modelNone");
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc-field",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-label",
						children: t("modelTitle")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-hint",
						children: reason
					})]
				});
			}
			const provider = providers.find((item) => item.id === value?.provider) ?? providers[0];
			const isDefault = value !== void 0 && choices.default?.provider === value.provider && choices.default?.model === value.model;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-field",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-label",
						children: t("modelTitle")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "mcpc-input",
							"data-select": "true",
							"aria-label": t("modelProvider"),
							disabled,
							value: provider.id,
							onChange: (event) => {
								const next = providers.find((item) => item.id === event.target.value);
								if (next !== void 0) onChange({
									provider: next.id,
									model: next.models[0].id
								});
							},
							children: providers.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: item.id,
								children: item.name
							}, item.id))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "mcpc-input",
							"data-select": "true",
							"aria-label": t("modelModel"),
							disabled,
							value: provider.models.some((model) => model.id === value?.model) ? value.model : provider.models[0].id,
							onChange: (event) => onChange({
								provider: provider.id,
								model: event.target.value
							}),
							children: provider.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: model.id,
								children: model.name
							}, model.id))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-hint",
						children: isDefault ? t("modelIsDefault") : t("modelHint")
					})
				]
			});
		}
		//#endregion
		//#region src/client-add.jsx
		/**
		* The Add tab: pick where the server comes from (the official registry, by
		* hand, AI, or another client), then finish in one place. The registry and
		* by-hand paths end in the same server form.
		*
		* @module dsh-mcp-console/client-add
		*/
		const SAFE_LINK = /^https:\/\//u;
		const SOURCES = [
			{
				id: "registry",
				icon: "search"
			},
			{
				id: "manual",
				icon: "pen"
			},
			{
				id: "ai",
				icon: "spark"
			},
			{
				id: "import",
				icon: "import"
			}
		];
		function RegistrySearch({ call, t, runtimes, existing, onUse, memory }) {
			const [query, setQuery] = react.useState(memory.current.query ?? "");
			const [state, setState] = react.useState(memory.current.state ?? {
				results: [],
				searched: false
			});
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState();
			react.useEffect(() => {
				memory.current = {
					query,
					state
				};
			}, [
				memory,
				query,
				state
			]);
			const search = (cursor) => {
				setBusy(true);
				setError(void 0);
				call("registry/search", {
					query,
					...cursor === void 0 ? {} : { cursor }
				}).then((page) => setState((current) => ({
					results: cursor === void 0 ? page.results : [...current.results, ...page.results],
					nextCursor: page.nextCursor,
					searched: true,
					query
				}))).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					className: "mcpc-search",
					onSubmit: (event) => {
						event.preventDefault();
						search();
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "mcpc-input",
						type: "search",
						autoFocus: true,
						spellCheck: false,
						placeholder: t("registryPlaceholder"),
						"aria-label": t("registrySearch"),
						value: query,
						onChange: (event) => setQuery(event.target.value)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						type: "submit",
						variant: "primary",
						size: "md",
						disabled: busy || query.trim() === "",
						children: busy ? t("registrySearching") : t("registrySearch")
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "mcpc-note",
					children: t("registryIntro")
				}),
				error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "mcpc-note",
					"data-tone": "bad",
					role: "alert",
					children: `${t("error")}: ${error}`
				}),
				state.searched && state.results.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "mcpc-note",
					children: fill(t("registryNone"), { query: state.query })
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mcpc-results",
					children: state.results.map((result) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-res",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mcpc-res-top",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: result.title || result.name }),
									result.version && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-tag",
										children: result.version
									}),
									result.title && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-muted",
										"data-mono": "true",
										children: result.name
									}),
									result.repository && SAFE_LINK.test(result.repository) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: "mcpc-link",
										href: result.repository,
										target: "_blank",
										rel: "noreferrer noopener",
										children: t("registryRepository")
									}),
									result.website && SAFE_LINK.test(result.website) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: "mcpc-link",
										href: result.website,
										target: "_blank",
										rel: "noreferrer noopener",
										children: t("registryWebsite")
									})
								]
							}),
							result.description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-muted",
								children: result.description
							}),
							result.options.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-muted",
								children: t("registryNoOption")
							}),
							result.options.map((option, index) => {
								const missing = missingRuntime(option.form, runtimes);
								const line = option.form.commandLine || option.form.url;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "mcpc-opt",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										title: line,
										children: line
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "mcpc-actions",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-tag",
												"data-soft": "true",
												children: t(`registryKind_${option.kind}`)
											}),
											option.form.bridge && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-tag",
												"data-soft": "true",
												children: "mcp-remote"
											}),
											missing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-chip",
												"data-tone": "bad",
												children: fill(t("registryMissing"), { name: missing.name })
											}),
											existing.includes(option.form.name) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-chip",
												"data-tone": "idle",
												children: t("importPresent")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												onClick: () => onUse(option.form, result.title || result.name),
												children: t("registryUse")
											})
										]
									})]
								}, index);
							}),
							result.skipped.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								children: fill(t("registrySkipped"), { list: result.skipped.join("; ") })
							})
						]
					}, `${result.name}@${result.version}`))
				}),
				state.nextCursor && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					disabled: busy,
					onClick: () => search(state.nextCursor),
					children: t("registryMore")
				}) })
			] });
		}
		function recognised(text) {
			if (text.trim() === "") return void 0;
			try {
				return classifySource(text);
			} catch {
				return null;
			}
		}
		function AiInstall({ call, t, openSession, sessionsAvailable, choices, model, setModel }) {
			const [source, setSource] = react.useState("");
			const [notes, setNotes] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [done, setDone] = react.useState(false);
			const [error, setError] = react.useState();
			const kind = recognised(source);
			const start = (event) => {
				event.preventDefault();
				setBusy(true);
				setError(void 0);
				setDone(false);
				call("quick-add", {
					source,
					notes,
					locale: t("lang"),
					...model === void 0 ? {} : { model }
				}).then((result) => {
					setDone(true);
					setSource("");
					setNotes("");
					openSession(result.sessionId);
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: "mcpc-form",
				onSubmit: start,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "mcpc-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-label",
								children: t("addSource")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "mcpc-input",
								type: "text",
								autoFocus: true,
								spellCheck: false,
								placeholder: t("addSourcePlaceholder"),
								value: source,
								onChange: (event) => setSource(event.target.value)
							}),
							kind === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								children: t("addSourceHint")
							}),
							kind === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-hint",
								"data-tone": "warn",
								children: t("addSourceUnknown")
							}),
							kind && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mcpc-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-chip",
									"data-tone": "info",
									children: t(`kind_${kind.kind}`)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-muted",
									"data-mono": "true",
									children: kind.label
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "mcpc-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-label",
							children: t("addNotes")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: "mcpc-input",
							"data-multiline": "true",
							rows: 2,
							placeholder: t("addNotesPlaceholder"),
							value: notes,
							onChange: (event) => setNotes(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelPicker, {
						choices,
						value: model,
						onChange: setModel,
						disabled: busy,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							type: "submit",
							variant: "primary",
							size: "md",
							disabled: busy || !kind || !sessionsAvailable,
							children: busy ? t("addStarting") : t("addStart")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-muted",
							children: t("aiFootnote")
						})]
					}),
					!sessionsAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "warn",
						children: t("noSessions")
					}),
					done && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "ok",
						children: t("addOpened")
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "bad",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		function clientServersOf(scan) {
			return (scan?.clients ?? []).flatMap((client) => client.servers.map((server) => ({
				...server,
				client: client.client
			})));
		}
		function ImportClients({ call, t, scan, scanning, rescan, existing, onImported }) {
			const rows = react.useMemo(() => groupClientServers(clientServersOf(scan)), [scan]);
			const [picked, setPicked] = react.useState(() => /* @__PURE__ */ new Set());
			const [state, setState] = react.useState({});
			const [running, setRunning] = react.useState(false);
			react.useEffect(() => {
				setPicked(new Set(rows.filter((row) => !existing.includes(row.name)).map((row) => row.key)));
			}, [rows]);
			if (scan === void 0 || scan === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-empty",
				"data-compact": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "mcpc-note",
					children: t("importNeedsScan")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "primary",
					size: "md",
					disabled: scanning,
					onClick: rescan,
					children: scanning ? t("scanning") : t("scanStart")
				})]
			});
			const chosen = rows.filter((row) => picked.has(row.key) && state[row.key]?.done === void 0);
			const toggle = (key) => setPicked((current) => {
				const next = new Set(current);
				if (next.has(key)) next.delete(key);
				else next.add(key);
				return next;
			});
			const run = async () => {
				setRunning(true);
				for (const row of chosen) {
					setState((current) => ({
						...current,
						[row.key]: { busy: true }
					}));
					try {
						const result = await call("servers/import", {
							client: row.clients[0],
							name: row.name
						});
						setState((current) => ({
							...current,
							[row.key]: { done: result }
						}));
					} catch (failure) {
						setState((current) => ({
							...current,
							[row.key]: { error: clearMessage(failure) }
						}));
					}
				}
				setRunning(false);
				await onImported();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc-crumb",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fill(t("importScannedAt"), { time: new Date(scan.scannedAt).toLocaleString() }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mcpc-textbtn",
						disabled: scanning,
						onClick: rescan,
						children: scanning ? t("scanning") : t("scanAgain")
					})]
				}),
				rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "mcpc-note",
					children: t("importNone")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mcpc-imports",
					children: rows.map((row) => {
						const entry = state[row.key] ?? {};
						const present = existing.includes(row.name) && entry.done === void 0;
						const line = launchLine(row);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "mcpc-imp",
							"data-disabled": entry.done !== void 0 ? "true" : void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									disabled: running || entry.done !== void 0,
									checked: picked.has(row.key) && entry.done === void 0,
									onChange: () => toggle(row.key)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "mcpc-imp-main",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "mcpc-imp-title",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: row.name }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mcpc-tag",
													"data-soft": "true",
													children: row.command ? "stdio" : "http"
												}),
												row.clients.map((client) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mcpc-tag",
													"data-soft": "true",
													"data-sans": "true",
													children: client
												}, client))
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
											title: line,
											children: line
										}),
										entry.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-hint",
											"data-tone": "bad",
											children: entry.error
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									entry.busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-spinner" }),
									entry.done && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-chip",
										"data-tone": "ok",
										children: entry.done.application === "restart-required" ? t("importedRestart") : fill(t("imported"), { name: entry.done.serverName })
									}),
									present && !entry.busy && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-chip",
										"data-tone": "idle",
										children: t("importPresent")
									})
								] })
							]
						}, row.key);
					})
				}),
				rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "mcpc-note",
					children: t("importIntro")
				}),
				rows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mcpc-actions",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "primary",
						size: "md",
						disabled: running || chosen.length === 0,
						onClick: () => {
							run();
						},
						children: running ? t("importing") : fill(t("importN"), { count: chosen.length })
					})
				})
			] });
		}
		function AddView({ source, setSource, call, t, runtimes, existing, scan, scanning, rescan, onSaved, ai }) {
			const [picked, setPicked] = react.useState();
			const registryMemory = react.useRef({});
			react.useEffect(() => {
				setPicked(void 0);
			}, [source]);
			let body = null;
			if (source === "registry") body = picked === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RegistrySearch, {
				call,
				t,
				runtimes,
				existing,
				memory: registryMemory,
				onUse: (form, origin) => setPicked({
					form,
					origin,
					key: Date.now()
				})
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-crumb",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mcpc-textbtn",
						onClick: () => setPicked(void 0),
						children: t("src_registry")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "›" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("stepCheck") })
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerForm, {
				mode: "add",
				initial: picked.form,
				origin: picked.origin,
				call,
				t,
				runtimes,
				onSaved: (result) => {
					setPicked(void 0);
					onSaved(result);
				}
			}, picked.key)] });
			else if (source === "manual") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerForm, {
				mode: "add",
				call,
				t,
				runtimes,
				onSaved
			});
			else if (source === "ai") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AiInstall, {
				call,
				t,
				...ai
			});
			else if (source === "import") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImportClients, {
				call,
				t,
				scan,
				scanning,
				rescan,
				existing,
				onImported: () => onSaved(void 0)
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Panel, {
				title: t("addHow"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mcpc-sources",
					children: SOURCES.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "mcpc-src",
						"aria-pressed": source === item.id,
						onClick: () => setSource(source === item.id ? void 0 : item.id),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
								name: item.icon,
								size: 20
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t(`src_${item.id}`) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t(`src_${item.id}_text`) })
						]
					}, item.id))
				}), body !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mcpc-step",
					children: body
				})]
			});
		}
		//#endregion
		//#region src/client-copy.js
		/**
		* The MCP Console page's copy, in both languages DSH ships.
		*
		* @module dsh-mcp-console/client-copy
		*/
		const zh = {
			lang: "zh",
			panel: "MCP",
			title: "MCP 管理",
			intro: "查看和管理 MCP 服务器，添加新的，或检索本机能接入的软件。",
			refresh: "刷新",
			refreshing: "刷新中…",
			error: "出错了",
			restartNeeded: "MCP 管理已更新到 v{page}，但 DSH 后台还在运行旧版本 v{host}。请完全退出 DSH（包括托盘图标）再重新打开，否则部分功能不可用。",
			noManager: "当前运行环境没有插件管理器，只能查看，不能启用或禁用。",
			statusConnected: "已连接",
			statusStarting: "连接中",
			statusFailed: "失败",
			statusDisabled: "已禁用",
			statusStopped: "已停止",
			startingHint: "已启动但还没有工具：可能正在连接，也可能首次连接失败（查看 DSH 日志），或这个服务器本身不提供工具。",
			restartRequired: "已保存，重启 DSH 后生效。",
			overridden: "已保存，但被更高优先级的配置覆盖，当前状态没有变化。",
			readOnly: "这一项由插件包或其他配置提供，不能在这里切换：{reason}",
			command: "命令",
			url: "地址",
			env: "环境变量",
			headers: "请求头",
			cwd: "工作目录",
			tools: "工具",
			toolsNone: "暂无",
			source: "来源",
			repository: "开源地址",
			valueExpression: "表达式",
			valueLiteral: "明文",
			addSource: "来源",
			addSourcePlaceholder: "https://github.com/owner/project 或 @scope/package 或 uvx 包名",
			addSourceHint: "可以填：代码仓库（GitHub、GitLab、Gitee…）、npm 或 PyPI 包名、Docker 镜像、README 里的启动命令（npx / uvx / docker run），或任意网页链接（MCP 目录详情页、远程端点）。",
			addSourceUnknown: "认不出这是什么。请填链接、包名、镜像名，或 npx / uvx / docker run 开头的命令。",
			kind_repository: "代码仓库",
			kind_npm: "npm 包",
			kind_pypi: "PyPI 包",
			kind_package: "包名（npm 或 PyPI）",
			kind_docker: "Docker 镜像",
			kind_url: "网页或远程端点",
			addNotes: "补充说明（可选）",
			addNotesPlaceholder: "例如：用 Docker 运行；只读模式；需要的 API Key 我已经放在环境变量 XXX 里",
			manualKind: "运行方式",
			manualStdio: "本地命令",
			manualHttp: "远程服务",
			manualName: "名称",
			manualNamePlaceholder: "字母、数字、- 或 _，最多 32 个字符",
			manualCommand: "启动命令",
			manualCommandHint: "整行填写，例如 npx -y @upstash/context7-mcp、uvx mcp-server-time、docker run -i --rm mcp/fetch。带空格的参数用引号括起来；不经过 shell，管道和重定向不起作用。",
			manualCwd: "工作目录（可选）",
			manualCwdPlaceholder: "留空则使用 DSH 的默认目录",
			manualUrl: "端点地址",
			manualValuePlaceholder: "值",
			manualEnvPlaceholder: "变量名，如 API_TOKEN，或模板 Bearer ${API_TOKEN}",
			manualFromEnv: "读环境变量",
			manualFromEnvHint: "勾选后，配置里只写「读取某个环境变量」，不保存值本身；DSH 启动这个服务器时再读取。",
			manualAddRow: "+ 添加一行",
			manualRemoveRow: "删除这一行",
			manualSecrets: "密钥建议勾选「读环境变量」：在系统里设置好环境变量，然后完全退出并重新打开 DSH。不勾选时值会原样保存在本机 mcp-bundles 目录的配置文件里。",
			manualAdd: "测试并添加",
			edit: "编辑",
			editTitle: "编辑 {name}",
			editIntro: "修改后会先测试连接，再通过插件管理器重新安装这个配置包（先卸载再安装）；安装失败会自动恢复原来的配置。",
			editNameFixed: "编辑时不能改名；要换名字请删除后重新添加。",
			editSave: "测试并保存",
			editSaveAnyway: "仍然保存",
			editSaved: "已保存 {name}。",
			editUnavailable: "不能在这里编辑：{reason}",
			bundleOff: "这个服务器所在的插件包已关闭，打开开关即可恢复。",
			bundleToggleMany: "开关作用于整个插件包，其中 {count} 个服务器会一起启用或禁用。",
			export: "导出",
			exportTitle: "导出配置",
			exportCount: "导出 {count} 个服务器",
			exportIntro: "标准 mcpServers 格式，可用于 Claude Desktop、Claude Code、Cursor、Windsurf 等。密钥不会导出：读环境变量的值写成 ${变量名}，明文密钥换成占位符，需要在目标客户端里填写。",
			exportCopy: "复制",
			exportCopied: "已复制",
			exportDownload: "下载 JSON",
			registryIntro: "从官方 MCP 目录（registry.modelcontextprotocol.io）搜索服务器。选中后自动填好下面的「手动添加」，确认密钥等信息、测试通过后再添加，不经过 AI。",
			registryPlaceholder: "搜索名称，例如 github、context7、filesystem",
			registrySearch: "搜索",
			registrySearching: "搜索中…",
			registryNone: "目录里没有找到「{query}」。可以换个关键词，或用下面的「AI 快捷添加」。",
			registryMore: "加载更多",
			registryRepository: "源码",
			registryWebsite: "主页",
			registryNoOption: "这个条目没有能直接运行的方式（只提供本插件不支持的包类型）。",
			registryKind_npm: "npm",
			registryKind_pypi: "PyPI",
			registryKind_oci: "Docker",
			"registryKind_streamable-http": "远程",
			registryKind_sse: "远程 SSE",
			registryMissing: "本机没有 {name}",
			registrySkipped: "未列出：{list}",
			registryFilled: "已填入目录条目「{name}」。请检查命令和环境变量（标有「读环境变量」的需要先在系统里设置），测试通过后再添加。",
			manualBridge: "通过 mcp-remote 桥接（用于只支持 SSE 或需要 OAuth 登录的服务）",
			manualBridgeOn: "将在本机用 npx -y mcp-remote 连接这个地址；它同时支持 streamable-http 和 SSE，需要登录时会打开浏览器。需要本机装有 Node.js。",
			manualSseHint: "地址以 /sse 结尾，通常是只支持 SSE 的服务器，DSH 不能直连。建议勾选上面的 mcp-remote 桥接。",
			manualExpressionHint: "这是配置包里原有的表达式，表单无法修改它，保存时会原样保留；不需要可以删掉这一行。",
			manualRequired: "必填",
			manualAddAnyway: "仍然添加",
			envMissing: "DSH 当前读不到环境变量 {names}。在系统里设置后，需要完全退出并重新打开 DSH。",
			runtimeMissing: "DSH 在 PATH 里没找到 {name}，这条命令启动不了。请先安装 {install}，然后完全退出并重新打开 DSH。",
			testOnly: "只测试",
			testRunning: "测试中…",
			testWaitLocal: "正在本机启动并握手；首次运行 npx / uvx / docker 需要下载，可能要一两分钟。",
			testWaitRemote: "正在连接远程服务…",
			testOk: "连接成功：{server}，{count} 个工具（{ms} 毫秒）。",
			testBridgeHint: "可以改用 mcp-remote 桥接再试。",
			testUseBridge: "改用 mcp-remote",
			test_failed: "测试失败",
			test_config: "配置里有值无法计算",
			test_auth: "服务器拒绝了认证，请检查请求头里的密钥",
			test_oauth: "这个服务需要 OAuth 登录，DSH 不能直连",
			"test_not-streamable": "服务器不接受 streamable-http 请求，可能只支持 SSE",
			test_http: "服务器返回了错误",
			test_protocol: "回应不是有效的 MCP 握手",
			test_timeout: "等待超时",
			test_unreachable: "连不上这个地址",
			test_unavailable: "当前运行环境不能启动进程",
			"test_no-executable": "找不到要运行的程序",
			test_spawn: "启动失败",
			test_exited: "进程没有完成握手就退出了",
			addStart: "开始安装",
			addStarting: "正在打开会话…",
			addOpened: "已打开会话，AI 正在处理。",
			scanTitle: "扫描本机",
			scanIntro: "扫描本机已安装的软件、后台服务、监听端口、Docker 容器，以及 Claude Desktop、Cursor 等客户端里已经配置的 MCP。扫描只在本机进行。",
			scanStart: "扫描本机",
			scanning: "扫描中…",
			scanAgain: "重新扫描",
			scanApps: "已安装的应用",
			scanServices: "后台服务",
			scanProcesses: "运行中的进程",
			scanPorts: "监听端口",
			scanContainers: "Docker 容器",
			scanClients: "其他客户端的 MCP",
			importIntro: "这些 MCP 已经在别的客户端里配好，可以直接导入，不经过 AI。环境变量和请求头会原样复制（可能含密钥），保存在本机的 mcp-bundles 目录。",
			importPresent: "已有同名",
			importing: "导入中…",
			imported: "已导入为 {name}",
			importedRestart: "已导入，重启 DSH 后生效",
			remove: "删除",
			removing: "删除中…",
			removeYes: "确认删除",
			removeConfirm: "将通过插件管理器卸载插件包 {bundle}，并删除它在 mcp-bundles 目录里的配置文件。这个 MCP 会从列表中移除。",
			removeConfirmMany: "将卸载插件包 {bundle}，它包含 {count} 个 MCP 服务器，会一起移除，并删除它在 mcp-bundles 目录里的配置文件。",
			scanPrivacy: "下一步会把上面的清单（不含文件路径和密钥）作为消息发给当前使用的 AI 模型，由它联网检索哪些软件有 MCP 服务器，再问你是否接入。",
			scanAnalyze: "交给 AI 联网分析",
			scanAnalyzing: "正在打开会话…",
			noSessions: "当前运行环境不能创建会话。",
			modelTitle: "使用的模型",
			modelProvider: "供应商",
			modelModel: "模型",
			modelLoading: "正在读取模型列表…",
			modelNone: "没有读到可用的模型，会话将使用默认模型。",
			modelStale: "插件后台还是旧版本，读不到模型列表。请完全退出并重新打开 DSH。",
			modelIsDefault: "这是你的默认模型。只对这次打开的会话生效，不会改动默认设置。",
			modelHint: "只对这次打开的会话生效，不会改动你的默认模型。",
			addMcp: "添加 MCP",
			tab_installed: "已安装",
			tab_add: "添加",
			tab_discover: "发现",
			tabFailed: "{count} 个失败",
			installedTitle: "已安装",
			sumConnected: "已连接",
			sumFailed: "失败",
			sumStarting: "连接中",
			sumDisabled: "已禁用",
			sumTools: "个工具",
			rowFailed: "连接失败 · 点开看原因",
			rowStarting: "正在连接…",
			rowTools: "{count} 个工具",
			switchOn: "启用 {name}",
			switchOff: "禁用 {name}",
			more: "更多操作",
			repositorySet: "设置开源地址",
			repositoryChange: "修改开源地址",
			toolsMore: "另外 {count} 个",
			save: "保存",
			saving: "保存中…",
			cancel: "取消",
			close: "关闭",
			loading: "读取中…",
			emptyTitle: "还没有 MCP 服务器",
			emptyText: "MCP 服务器让 AI 能使用外部工具，比如查文档、操作 GitHub、读写文件。",
			emptyAdd: "添加第一个",
			emptyDiscover: "看看本机能接什么",
			addHow: "你想怎么添加？",
			src_registry: "搜索官方目录",
			src_registry_text: "按名称搜，选中后自动填好配置",
			src_manual: "手动填写",
			src_manual_text: "已知启动命令或服务地址",
			src_ai: "让 AI 安装",
			src_ai_text: "给仓库、包名或网页，AI 来安装",
			src_import: "从其他客户端导入",
			src_import_text: "Cursor、Claude 等里已配好的",
			stepCheck: "检查配置",
			registryUse: "使用",
			nameSuggested: "留空则使用 {name}",
			advanced: "高级选项",
			pairName: "名称",
			pairValue: "值",
			keptExpression: "保留原表达式",
			addedToast: "已添加 {name}",
			aiFootnote: "在默认工作区开新会话，每步安装前都会问你。",
			importNeedsScan: "还没有扫描过本机。扫描后会列出 Claude Desktop、Claude Code、Cursor、VS Code、Windsurf、Codex 里已经配好的 MCP。",
			importScannedAt: "上次扫描于 {time}",
			importNone: "其他客户端里没有找到 MCP 配置。",
			importN: "导入 {count} 个",
			scanAtShort: "上次扫描于 {time}",
			runtimesTitle: "运行环境：",
			runtimeAbsent: "{name} 未找到",
			goImport: "去导入",
			aiScanTitle: "让 AI 找出能接入的软件",
			diagnostics: "诊断信息",
			diagTitle: "诊断信息",
			diagIntro: "出问题时把下面的内容复制给开发者：插件和 DSH 版本、运行环境、每个服务器的状态、最近的错误。不含密钥和环境变量的值。",
			diagCopy: "复制诊断信息",
			diagOpenFolder: "打开日志文件夹",
			diagLogAt: "完整日志在 {path}（保留 7 天）",
			pageErrorTitle: "这个页面出错了",
			pageErrorRetry: "重试"
		};
		const en = {
			lang: "en",
			panel: "MCP",
			title: "MCP Console",
			intro: "See and manage your MCP servers, add new ones, or find local software that can be connected.",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			error: "Error",
			restartNeeded: "MCP Console was updated to v{page}, but the DSH host still runs v{host}. Fully quit DSH (including the tray icon) and reopen it; some features are unavailable until then.",
			noManager: "The Plugin Manager is not available here: servers can be viewed but not switched.",
			statusConnected: "Connected",
			statusStarting: "Connecting",
			statusFailed: "Failed",
			statusDisabled: "Disabled",
			statusStopped: "Stopped",
			startingHint: "Running but no tools yet: it may still be connecting, its first connection may have failed (see the DSH log), or it offers no tools.",
			restartRequired: "Saved; restart DSH to apply it.",
			overridden: "Saved, but a higher-priority layer overrides it, so nothing changed.",
			readOnly: "Provided by a bundle or another layer; it cannot be switched here: {reason}",
			command: "Command",
			url: "URL",
			env: "Environment",
			headers: "Headers",
			cwd: "Directory",
			tools: "Tools",
			toolsNone: "none",
			source: "Source",
			repository: "Repository",
			valueExpression: "expression",
			valueLiteral: "literal",
			addSource: "Source",
			addSourcePlaceholder: "https://github.com/owner/project, @scope/package, or uvx <package>",
			addSourceHint: "A code repository (GitHub, GitLab, Gitee…), an npm or PyPI package name, a Docker image, a launch command from a README (npx / uvx / docker run), or any web page (an MCP directory entry, a remote endpoint).",
			addSourceUnknown: "Not recognised. Enter a link, a package or image name, or a command starting with npx, uvx, or docker run.",
			kind_repository: "Repository",
			kind_npm: "npm package",
			kind_pypi: "PyPI package",
			kind_package: "Package (npm or PyPI)",
			kind_docker: "Docker image",
			kind_url: "Web page or remote endpoint",
			addNotes: "Notes (optional)",
			addNotesPlaceholder: "e.g. run it with Docker; read-only mode; the API key is in the environment variable XXX",
			manualKind: "How it runs",
			manualStdio: "Local command",
			manualHttp: "Remote server",
			manualName: "Name",
			manualNamePlaceholder: "letters, digits, - or _, up to 32 characters",
			manualCommand: "Command",
			manualCommandHint: "The whole line, e.g. npx -y @upstash/context7-mcp, uvx mcp-server-time, docker run -i --rm mcp/fetch. Quote arguments with spaces; no shell runs it, so pipes and redirection do not work.",
			manualCwd: "Working directory (optional)",
			manualCwdPlaceholder: "empty uses the DSH default",
			manualUrl: "Endpoint URL",
			manualValuePlaceholder: "value",
			manualEnvPlaceholder: "a variable such as API_TOKEN, or a template such as Bearer ${API_TOKEN}",
			manualFromEnv: "from environment",
			manualFromEnvHint: "The configuration only says which environment variable to read, not its value; DSH reads it when it starts the server.",
			manualAddRow: "+ Add a row",
			manualRemoveRow: "Remove this row",
			manualSecrets: "For secrets, tick \"from environment\": set the variable in your system, then fully quit and reopen DSH. Unticked values are saved as they are in the configuration file under the local mcp-bundles directory.",
			manualAdd: "Test and add",
			edit: "Edit",
			editTitle: "Edit {name}",
			editIntro: "Saving tries the server first, then reinstalls its bundle through the Plugin Manager (remove, then install); a failed install puts the old configuration back.",
			editNameFixed: "The name cannot change here; remove the server and add it again to rename it.",
			editSave: "Test and save",
			editSaveAnyway: "Save anyway",
			editSaved: "Saved {name}.",
			editUnavailable: "Cannot be edited here: {reason}",
			bundleOff: "The bundle of this server is switched off; switch it on to bring it back.",
			bundleToggleMany: "The switch acts on the whole bundle; its {count} servers go on and off together.",
			export: "Export",
			exportTitle: "Export",
			exportCount: "{count} servers exported",
			exportIntro: "The common mcpServers format for Claude Desktop, Claude Code, Cursor, Windsurf, and others. No secret is exported: values read from the environment become ${NAME}, and literal secrets become placeholders to fill in the other client.",
			exportCopy: "Copy",
			exportCopied: "Copied",
			exportDownload: "Download JSON",
			registryIntro: "Search the official MCP Registry (registry.modelcontextprotocol.io). Picking an option fills Add manually below; check the secrets, test it, then add it, without the AI.",
			registryPlaceholder: "Search by name, e.g. github, context7, filesystem",
			registrySearch: "Search",
			registrySearching: "Searching…",
			registryNone: "Nothing found for \"{query}\". Try another word, or use AI quick add below.",
			registryMore: "Load more",
			registryRepository: "Source",
			registryWebsite: "Website",
			registryNoOption: "This entry offers no way to run it here (only package types this plugin does not support).",
			registryKind_npm: "npm",
			registryKind_pypi: "PyPI",
			registryKind_oci: "Docker",
			"registryKind_streamable-http": "Remote",
			registryKind_sse: "Remote SSE",
			registryMissing: "no {name} here",
			registrySkipped: "Not listed: {list}",
			registryFilled: "Filled in from the registry entry \"{name}\". Check the command and environment variables (those read from the environment must be set first), test it, then add it.",
			manualBridge: "Connect through mcp-remote (for SSE-only servers or OAuth sign-in)",
			manualBridgeOn: "Runs npx -y mcp-remote on this computer to reach the URL; it speaks streamable-http and SSE and opens the browser when a sign-in is needed. Needs Node.js.",
			manualSseHint: "The URL ends in /sse, usually an SSE-only server that DSH cannot reach directly. Tick mcp-remote above.",
			manualExpressionHint: "An expression from the bundle. The form cannot change it and keeps it as it is; remove the row if it is not needed.",
			manualRequired: "required",
			manualAddAnyway: "Add anyway",
			envMissing: "DSH cannot see the environment variable {names}. Set it in your system, then fully quit and reopen DSH.",
			runtimeMissing: "DSH did not find {name} on its PATH, so this command cannot start. Install {install}, then fully quit and reopen DSH.",
			testOnly: "Test only",
			testRunning: "Testing…",
			testWaitLocal: "Starting it here and running the handshake; a first npx / uvx / docker run downloads and may take a minute or two.",
			testWaitRemote: "Connecting to the server…",
			testOk: "Connected: {server}, {count} tools ({ms} ms).",
			testBridgeHint: "Try again through mcp-remote.",
			testUseBridge: "Use mcp-remote",
			test_failed: "The test failed",
			test_config: "A configured value could not be evaluated",
			test_auth: "The server refused the credentials; check the header values",
			test_oauth: "This server needs an OAuth sign-in, which DSH cannot do directly",
			"test_not-streamable": "The server does not take streamable-http requests; it may offer SSE only",
			test_http: "The server answered with an error",
			test_protocol: "The answer is not a valid MCP handshake",
			test_timeout: "Timed out",
			test_unreachable: "The address cannot be reached",
			test_unavailable: "This runtime cannot start processes",
			"test_no-executable": "The program to run was not found",
			test_spawn: "It could not be started",
			test_exited: "The process ended before finishing the handshake",
			addStart: "Install",
			addStarting: "Opening a session…",
			addOpened: "Session opened; the AI is working on it.",
			scanTitle: "Scan this computer",
			scanIntro: "Scan installed applications, background services, listening ports, Docker containers, and MCP servers already configured in clients such as Claude Desktop and Cursor. The scan runs on this computer only.",
			scanStart: "Scan this computer",
			scanning: "Scanning…",
			scanAgain: "Scan again",
			scanApps: "Installed applications",
			scanServices: "Background services",
			scanProcesses: "Running processes",
			scanPorts: "Listening ports",
			scanContainers: "Docker containers",
			scanClients: "MCP in other clients",
			importIntro: "Already configured in other clients; import them directly, without the AI. Environment variables and headers are copied as they are (they may contain secrets) into the local mcp-bundles directory.",
			importPresent: "name in use",
			importing: "Importing…",
			imported: "Imported as {name}",
			importedRestart: "Imported; restart DSH to apply it",
			remove: "Remove",
			removing: "Removing…",
			removeYes: "Remove",
			removeConfirm: "This uninstalls the bundle {bundle} through the Plugin Manager and deletes its configuration in the mcp-bundles directory. The server leaves the list.",
			removeConfirmMany: "This uninstalls the bundle {bundle}, which carries {count} MCP servers that all go, and deletes its configuration in the mcp-bundles directory.",
			scanPrivacy: "The next step sends the list above (no file paths or secrets) to the AI model in use as a message; it searches the web for MCP servers and asks which ones to connect.",
			scanAnalyze: "Analyze with AI",
			scanAnalyzing: "Opening a session…",
			noSessions: "Sessions cannot be created in this runtime.",
			modelTitle: "Model",
			modelProvider: "Provider",
			modelModel: "Model",
			modelLoading: "Loading models…",
			modelNone: "No model is listed; the session uses the default model.",
			modelStale: "The plugin host is still an older version and cannot list models. Fully quit and reopen DSH.",
			modelIsDefault: "Your default model. It applies to this session only and does not change your default.",
			modelHint: "Applies to this session only; your default model is not changed.",
			addMcp: "Add MCP",
			tab_installed: "Installed",
			tab_add: "Add",
			tab_discover: "Discover",
			tabFailed: "{count} failed",
			installedTitle: "Installed",
			sumConnected: "connected",
			sumFailed: "failed",
			sumStarting: "connecting",
			sumDisabled: "off",
			sumTools: "tools",
			rowFailed: "Failed to connect · open for the reason",
			rowStarting: "Connecting…",
			rowTools: "{count} tools",
			switchOn: "Switch on {name}",
			switchOff: "Switch off {name}",
			more: "More actions",
			repositorySet: "Set repository link",
			repositoryChange: "Change repository link",
			toolsMore: "{count} more",
			save: "Save",
			saving: "Saving…",
			cancel: "Cancel",
			close: "Close",
			loading: "Loading…",
			emptyTitle: "No MCP servers yet",
			emptyText: "MCP servers give the AI outside tools, such as looking up docs, working with GitHub, or reading and writing files.",
			emptyAdd: "Add the first one",
			emptyDiscover: "See what this computer can connect",
			addHow: "How do you want to add it?",
			src_registry: "Search the registry",
			src_registry_text: "Search by name; the configuration is filled in",
			src_manual: "Fill in by hand",
			src_manual_text: "You know the command or the address",
			src_ai: "Install with AI",
			src_ai_text: "Give a repository, package, or page",
			src_import: "Import from other clients",
			src_import_text: "Already set up in Cursor, Claude, …",
			stepCheck: "Check the configuration",
			registryUse: "Use",
			nameSuggested: "Empty uses {name}",
			advanced: "Advanced",
			pairName: "Name",
			pairValue: "Value",
			keptExpression: "kept as is",
			addedToast: "Added {name}",
			aiFootnote: "Opens a new session in the default workspace; every install step asks you first.",
			importNeedsScan: "This computer has not been scanned yet. A scan lists the MCP servers set up in Claude Desktop, Claude Code, Cursor, VS Code, Windsurf, and Codex.",
			importScannedAt: "Last scanned {time}",
			importNone: "No MCP configuration was found in other clients.",
			importN: "Import {count}",
			scanAtShort: "Last scanned {time}",
			runtimesTitle: "Runtimes:",
			runtimeAbsent: "no {name}",
			goImport: "Import",
			aiScanTitle: "Let AI find what can be connected",
			diagnostics: "Diagnostics",
			diagTitle: "Diagnostics",
			diagIntro: "When something goes wrong, copy this to the developer: plugin and DSH versions, runtimes, every server’s state, and recent errors. It holds no secrets or environment values.",
			diagCopy: "Copy diagnostics",
			diagOpenFolder: "Open log folder",
			diagLogAt: "Full logs are in {path} (kept 7 days)",
			pageErrorTitle: "This page ran into an error",
			pageErrorRetry: "Try again"
		};
		//#endregion
		//#region src/client-discover.jsx
		/**
		* The Discover tab: the local scan as a summary (counts, runtimes) with each
		* group folded, the MCP servers other clients configure, and the AI research
		* of what could be connected.
		*
		* @module dsh-mcp-console/client-discover
		*/
		function Group({ title, items, render, open, aside }) {
			if (!Array.isArray(items) || items.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
				className: "mcpc-group",
				open,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("summary", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: title }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-chip",
						"data-tone": open ? "info" : "idle",
						children: items.length
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-sp" }),
					aside
				] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: items.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: render(item) }, index)) })]
			});
		}
		function DiscoverView({ call, t, scan, scanning, scanError, rescan, onImport, ai }) {
			const [analyzing, setAnalyzing] = react.useState(false);
			const [error, setError] = react.useState();
			const clients = react.useMemo(() => groupClientServers(clientServersOf(scan)), [scan]);
			const analyze = () => {
				setAnalyzing(true);
				setError(void 0);
				call("scan/analyze", {
					locale: t("lang"),
					...ai.model === void 0 ? {} : { model: ai.model }
				}).then((result) => ai.openSession(result.sessionId)).catch((failure) => setError(clearMessage(failure))).finally(() => setAnalyzing(false));
			};
			if (scan === void 0 || scan === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
				title: t("scanTitle"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc-empty",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("scanIntro")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							size: "md",
							disabled: scanning,
							onClick: rescan,
							children: scanning ? t("scanning") : t("scanStart")
						}),
						scanError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							"data-tone": "bad",
							children: scanError
						})
					]
				})
			});
			const runtimes = Object.entries(scan.runtimes ?? {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Panel, {
				title: t("scanTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "mcpc-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-muted",
						children: fill(t("scanAtShort"), { time: new Date(scan.scannedAt).toLocaleString() })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: scanning,
						onClick: rescan,
						children: scanning ? t("scanning") : t("scanAgain")
					})]
				}),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-stats",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mcpc-stat",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: scan.apps.length }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("scanApps") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mcpc-stat",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: scan.services.length }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("scanServices") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mcpc-stat",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: scan.ports.length }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("scanPorts") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mcpc-stat",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: scan.containers.length }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("scanContainers") })]
							})
						]
					}),
					runtimes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-runtimes",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-muted",
							children: t("runtimesTitle")
						}), runtimes.map(([name, item]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-chip",
							"data-tone": item.found ? "ok" : "idle",
							children: item.found ? `${name} ${item.version ?? ""}`.trim() : fill(t("runtimeAbsent"), { name })
						}, name))]
					}),
					scanError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note mcpc-pad",
						"data-tone": "bad",
						children: scanError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
						title: t("scanClients"),
						items: clients,
						open: true,
						render: (row) => `${row.name} · ${row.clients.join("、")}`,
						aside: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							onClick: (event) => {
								event.preventDefault();
								onImport();
							},
							children: t("goImport")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
						title: t("scanApps"),
						items: scan.apps,
						render: (item) => [item.name, item.publisher].filter(Boolean).join(" · ")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
						title: t("scanServices"),
						items: scan.services,
						render: (item) => item.display ?? item.name
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
						title: t("scanPorts"),
						items: scan.ports,
						render: (item) => `${item.port}${item.process ? ` ← ${item.process}` : ""}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
						title: t("scanContainers"),
						items: scan.containers,
						render: (item) => `${item.name} (${item.image})`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
						title: t("scanProcesses"),
						items: scan.processes,
						render: (item) => [item.name, item.product].filter(Boolean).join(" · ")
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, {
				title: t("aiScanTitle"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc-panel-body",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("scanPrivacy")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelPicker, {
							choices: ai.choices,
							value: ai.model,
							onChange: ai.setModel,
							disabled: analyzing,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "mcpc-actions",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								size: "md",
								disabled: analyzing || !ai.sessionsAvailable,
								onClick: analyze,
								children: analyzing ? t("scanAnalyzing") : t("scanAnalyze")
							})
						}),
						!ai.sessionsAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							"data-tone": "warn",
							children: t("noSessions")
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							"data-tone": "bad",
							role: "alert",
							children: `${t("error")}: ${error}`
						})
					]
				})
			})] });
		}
		//#endregion
		//#region src/client-installed.jsx
		/**
		* The Installed tab: one compact row per server (state, name, transport, a
		* short status, the switch, and a menu), failed servers first; a row opens to
		* its configuration, tools, and source.
		*
		* @module dsh-mcp-console/client-installed
		*/
		const ORDER = {
			failed: 0,
			starting: 1,
			connected: 2,
			stopped: 3,
			disabled: 4
		};
		const STATUS_KEY = {
			connected: "statusConnected",
			starting: "statusStarting",
			failed: "statusFailed",
			disabled: "statusDisabled",
			stopped: "statusStopped"
		};
		function RowMenu({ server, t, onEdit, onRepository, onRemove, onClose }) {
			const ref = useOutsideClose(true, onClose);
			const item = (label, action, danger) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "menuitem",
				"data-danger": danger ? "true" : void 0,
				onClick: () => {
					onClose();
					action();
				},
				children: label
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-menu",
				role: "menu",
				ref,
				children: [
					server.removable && server.bundle?.disabled !== true && item(t("edit"), onEdit),
					item(server.repository ? t("repositoryChange") : t("repositorySet"), onRepository),
					server.removable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("hr", {}), item(t("remove"), onRemove, true)] })
				]
			});
		}
		function Tags({ list, t }) {
			if (!Array.isArray(list) || list.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-tags",
				children: list.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mcpc-tag",
					title: item.source === "expression" ? t("valueExpression") : t("valueLiteral"),
					children: item.name
				}, item.name))
			});
		}
		function ServerRow({ server, call, t, onChanged, onEdit, initiallyOpen }) {
			const [open, setOpen] = react.useState(initiallyOpen);
			const [menu, setMenu] = react.useState(false);
			const [busy, setBusy] = react.useState(false);
			const [notice, setNotice] = react.useState();
			const [error, setError] = react.useState();
			const [confirming, setConfirming] = react.useState(false);
			const [repo, setRepo] = react.useState();
			const closeMenu = react.useCallback(() => setMenu(false), []);
			const act = (promise, after) => {
				setBusy(true);
				setError(void 0);
				setNotice(void 0);
				return promise.then((result) => {
					if (result?.application === "restart-required") {
						setNotice(t("restartRequired"));
						setOpen(true);
					} else if (result?.application === "overridden") {
						setNotice(t("overridden"));
						setOpen(true);
					}
					after?.();
					return onChanged();
				}).catch((failure) => {
					setError(clearMessage(failure));
					setOpen(true);
				}).finally(() => setBusy(false));
			};
			const toggle = () => act(call("servers/toggle", {
				entryId: server.entryId,
				enabled: !server.enabled
			}));
			const remove = () => act(call("servers/remove", { entryId: server.entryId }), () => setConfirming(false));
			const saveRepository = () => act(call("servers/repository", {
				rowId: server.rowId,
				url: repo ?? ""
			}), () => setRepo(void 0));
			const edit = () => {
				setBusy(true);
				Promise.resolve(onEdit(server)).then((reason) => {
					if (typeof reason === "string") {
						setError(reason);
						setOpen(true);
					}
				}).finally(() => setBusy(false));
			};
			const config = server.config ?? {};
			const remote = config.transport === "streamable-http";
			const meta = server.status === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-row-meta",
				"data-tone": "bad",
				children: t("rowFailed")
			}) : server.status === "starting" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-row-meta",
				children: t("rowStarting")
			}) : server.status === "connected" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-row-meta",
				children: fill(t("rowTools"), { count: server.toolCount })
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-row-meta",
				children: t(STATUS_KEY[server.status] ?? "statusStopped")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-row",
				"data-open": open ? "true" : "false",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc-row-line",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "mcpc-row-main",
							"aria-expanded": open,
							onClick: () => setOpen((value) => !value),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dot, {
									status: server.status,
									title: t(STATUS_KEY[server.status] ?? "statusStopped")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-row-name",
									children: server.name
								}),
								config.transport && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-tag",
									"data-soft": "true",
									children: remote ? "http" : "stdio"
								}),
								meta,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-row-caret",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
										name: "caret",
										size: 14
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
							checked: server.enabled,
							label: fill(t(server.enabled ? "switchOff" : "switchOn"), { name: server.name }),
							title: server.toggleable ? void 0 : fill(t("readOnly"), { reason: server.readOnlyReason ?? "—" }),
							disabled: busy || !server.toggleable,
							onClick: toggle
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "mcpc-menu-wrap",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "icon",
								"aria-label": t("more"),
								"aria-haspopup": "menu",
								"aria-expanded": menu,
								disabled: busy,
								onClick: () => setMenu((value) => !value),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, { name: "more" })
							}), menu && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowMenu, {
								server,
								t,
								onClose: closeMenu,
								onEdit: edit,
								onRepository: () => {
									setRepo(server.repository ?? "");
									setOpen(true);
								},
								onRemove: () => {
									setConfirming(true);
									setOpen(true);
								}
							})]
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc-row-detail",
					children: [
						confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mcpc-confirm",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fill(t(server.bundle?.mcpRows > 1 ? "removeConfirmMany" : "removeConfirm"), {
								bundle: server.bundle?.name ?? "",
								count: server.bundle?.mcpRows ?? 1
							}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mcpc-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "danger-solid",
									disabled: busy,
									onClick: remove,
									children: busy ? t("removing") : t("removeYes")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									disabled: busy,
									onClick: () => setConfirming(false),
									children: t("cancel")
								})]
							})]
						}),
						notice && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							"data-tone": "warn",
							children: notice
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							"data-tone": "bad",
							role: "alert",
							children: error
						}),
						server.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: "mcpc-err",
							children: server.error
						}),
						server.status === "starting" && server.toolCount === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("startingHint")
						}),
						server.bundle?.disabled === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("bundleOff")
						}),
						server.toggleVia === "bundle" && server.bundle?.mcpRows > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: fill(t("bundleToggleMany"), { count: server.bundle.mcpRows })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
							className: "mcpc-kv",
							children: [
								remote ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("url") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: "mcpc-mono",
										children: config.url
									}),
									config.headers?.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("headers") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tags, {
										list: config.headers,
										t
									}) })] })
								] }) : config.command && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("command") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: "mcpc-mono",
										children: [config.command, ...config.args ?? []].join(" ")
									}),
									config.env?.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("env") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tags, {
										list: config.env,
										t
									}) })] }),
									config.cwd && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("cwd") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: "mcpc-mono",
										children: config.cwd
									})] })
								] }),
								server.bundle && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("source") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
									className: "mcpc-mono",
									children: `${server.bundle.name}${server.bundle.version ? `@${server.bundle.version}` : ""}`
								})] }),
								(server.repository || repo !== void 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("repository") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: repo === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									className: "mcpc-link",
									href: server.repository,
									target: "_blank",
									rel: "noreferrer noopener",
									children: server.repository.replace(/^https?:\/\//u, "")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "mcpc-inline-form",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "mcpc-input",
											type: "url",
											autoFocus: true,
											placeholder: "https://github.com/owner/project",
											value: repo,
											onChange: (event) => setRepo(event.target.value),
											onKeyDown: (event) => {
												if (event.key === "Enter") saveRepository();
												if (event.key === "Escape") setRepo(void 0);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											variant: "primary",
											disabled: busy,
											onClick: saveRepository,
											children: t("save")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											onClick: () => setRepo(void 0),
											children: t("cancel")
										})
									]
								}) })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("tools") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: server.toolCount === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-muted",
									children: t("toolsNone")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "mcpc-tags",
									children: [server.tools.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-tag",
										children: name
									}, name)), server.toolCount > server.tools.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-muted",
										children: fill(t("toolsMore"), { count: server.toolCount - server.tools.length })
									})]
								}) })
							]
						})
					]
				})]
			});
		}
		function InstalledView({ status, loading, error, reload, call, t, onEdit, onExport, onDiagnostics, onAdd, onDiscover }) {
			const servers = [...status?.servers ?? []].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || a.name.localeCompare(b.name));
			if (status !== void 0 && servers.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-empty",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("emptyTitle") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("emptyText")
					}),
					status.manageable === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "warn",
						children: t("noManager")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "mcpc-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							size: "md",
							onClick: onAdd,
							children: t("emptyAdd")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							size: "md",
							onClick: onDiscover,
							children: t("emptyDiscover")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mcpc-textbtn",
						onClick: onDiagnostics,
						children: t("diagnostics")
					})
				]
			}) });
			const count = (state) => servers.filter((server) => server.status === state).length;
			const tools = servers.reduce((sum, server) => sum + (server.toolCount ?? 0), 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Panel, {
				title: t("installedTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "mcpc-actions",
					children: [
						servers.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: onExport,
							children: t("export")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: onDiagnostics,
							children: t("diagnostics")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							disabled: loading,
							onClick: () => reload(),
							children: loading ? t("refreshing") : t("refresh")
						})
					]
				}),
				children: [
					servers.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-summary",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: count("connected") }), t("sumConnected")] }),
							count("failed") > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								"data-tone": "bad",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: count("failed") }), t("sumFailed")]
							}),
							count("starting") > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: count("starting") }), t("sumStarting")] }),
							count("disabled") + count("stopped") > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: count("disabled") + count("stopped") }), t("sumDisabled")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: tools }), t("sumTools")] })
						]
					}),
					status?.manageable === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note mcpc-pad",
						"data-tone": "warn",
						children: t("noManager")
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note mcpc-pad",
						"data-tone": "bad",
						role: "alert",
						children: `${t("error")}: ${error}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mcpc-list",
						children: servers.map((server) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerRow, {
							server,
							call,
							t,
							onChanged: reload,
							onEdit,
							initiallyOpen: server.status === "failed"
						}, server.entryId))
					})
				]
			});
		}
		//#endregion
		//#region src/client-style.js
		/**
		* The page's stylesheet, built from DSH design tokens so it follows the host
		* theme (light and dark) and sits next to the host's own settings pages.
		* Every token has a fallback for hosts that predate it.
		*
		* Layout: one column (at most 780px) with a header, three tabs, and panels;
		* editing and the export open in a drawer from the right.
		*
		* @module dsh-mcp-console/client-style
		*/
		const fg1 = "var(--dsw-alias-label-primary,#1c1c22)";
		const fg2 = "var(--dsw-alias-label-secondary,#4a4a55)";
		const fg3 = "var(--dsw-alias-label-tertiary,#8a8a96)";
		const fg4 = "var(--dsw-alias-label-caption,#a0a0ab)";
		const line = "var(--dsw-alias-border-l4,rgba(127,127,127,.18))";
		const lineStrong = "var(--dsw-alias-border-l3,rgba(127,127,127,.3))";
		const divider = "var(--dsw-alias-border-l2,rgba(127,127,127,.14))";
		const card = "var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2,#fff))";
		const cardLine = "var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l4,rgba(127,127,127,.2)))";
		const field = "var(--dsw-alias-bg-layer-1,rgba(127,127,127,.06))";
		const hover = "var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))";
		const active = "var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.14))";
		const accent = "var(--dsw-alias-state-business-primary,#3964fe)";
		const accentSoft = "var(--dsw-alias-state-business-tertiary,rgba(57,100,254,.1))";
		const ok = "var(--dsw-alias-state-success-primary,#1f9d55)";
		const okSoft = "var(--dsw-alias-state-success-tertiary,rgba(31,157,85,.12))";
		const warn = "var(--dsw-alias-state-warn-label,#c7771a)";
		const warnDot = "var(--dsw-alias-state-warn-primary,#e8a33d)";
		const warnSoft = "var(--dsw-alias-state-warn-tertiary,rgba(199,119,26,.12))";
		const bad = "var(--dsw-alias-state-error-primary,#e03131)";
		const badSoft = "var(--dsw-alias-interactive-bg-hover-danger,rgba(224,49,49,.1))";
		const idle = "var(--dsw-alias-state-idle-primary,#a0a0ab)";
		const mono = "var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)";
		const rSm = "var(--dsw-radius-sm,8px)";
		const rMd = "var(--dsw-radius-md,12px)";
		const STYLE = `
.mcpc-page{box-sizing:border-box;height:100%;overflow:auto;padding:28px 24px 64px}
.mcpc{display:flex;flex-direction:column;gap:16px;max-width:780px;margin:0 auto;color:${fg1};font-size:14px;line-height:22px}
.mcpc *{box-sizing:border-box}
.mcpc-sp{flex:1}
.mcpc-muted{color:${fg3};font-size:12px;line-height:18px}
.mcpc-muted[data-mono=true],.mcpc-mono{font-family:${mono};font-size:11.5px;word-break:break-all}
.mcpc-note{margin:0;color:${fg3};font-size:12px;line-height:18px}
.mcpc-note[data-tone=warn],.mcpc-hint[data-tone=warn]{color:${warn}}
.mcpc-note[data-tone=bad],.mcpc-hint[data-tone=bad]{color:${bad}}
.mcpc-note[data-tone=ok]{color:${ok}}
.mcpc-pad{padding:0 16px 10px}
.mcpc-link{color:${accent};font-size:12px;text-decoration:none;word-break:break-all}
.mcpc-link:hover{text-decoration:underline}
.mcpc-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

/* header and tabs */
.mcpc-head{display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px}
.mcpc-h1{margin:0;font-size:20px;font-weight:650;line-height:28px}
.mcpc-sub{margin:2px 0 0;max-width:60ch;color:${fg3};font-size:12px;line-height:18px}
.mcpc-banner{margin:0;padding:8px 12px;border-radius:${rMd};background:${warnSoft};color:${warn};font-size:12px;line-height:18px}
.mcpc-tabs{display:flex;align-self:flex-start;gap:2px;padding:3px;border:.5px solid ${line};border-radius:${rMd};background:${hover}}
.mcpc-tab{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 14px;border:0;border-radius:calc(${rMd} - 3px);background:transparent;color:${fg2};font:inherit;font-size:13px;cursor:pointer}
.mcpc-tab:hover{color:${fg1}}
.mcpc-tab[aria-selected=true]{background:var(--dsw-alias-button-elevated-fill,#fff);color:${fg1};font-weight:600;box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.08))}
.mcpc-count{min-width:18px;padding:0 6px;border-radius:999px;background:${hover};color:${fg3};font-size:11px;line-height:18px;text-align:center;font-variant-numeric:tabular-nums}
.mcpc-count[data-tone=bad]{background:${badSoft};color:${bad}}

/* buttons */
.mcpc-btn{display:inline-flex;flex:none;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 10px;border:.5px solid ${lineStrong};border-radius:${rSm};background:transparent;color:${fg1};font:inherit;font-size:12.5px;line-height:18px;white-space:nowrap;cursor:pointer}
.mcpc-btn:hover:not(:disabled){background:${hover}}
.mcpc-btn:active:not(:disabled){background:${active}}
.mcpc-btn:disabled{opacity:.42;cursor:not-allowed}
.mcpc-btn[data-size=md]{height:32px;padding:0 14px;border-radius:10px;font-size:13px}
.mcpc-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill,${accent});color:var(--dsw-alias-label-primary-foreground,#fff)}
.mcpc-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,${accent})}
.mcpc-btn[data-variant=ghost]{border-color:transparent;color:${fg2}}
.mcpc-btn[data-variant=icon]{width:28px;padding:0;border-color:transparent;color:${fg3}}
.mcpc-btn[data-variant=icon]:hover:not(:disabled){color:${fg1}}
.mcpc-btn[data-variant=danger-solid]{border-color:transparent;background:${bad};color:#fff}
.mcpc-textbtn{padding:0;border:0;background:none;color:${accent};font:inherit;font-size:12px;cursor:pointer}
.mcpc-textbtn:disabled{color:${fg4};cursor:default}
.mcpc-btn:focus-visible,.mcpc-tab:focus-visible,.mcpc-row-main:focus-visible,.mcpc-src:focus-visible,.mcpc-switch:focus-visible,.mcpc-textbtn:focus-visible{outline:2px solid ${accent};outline-offset:2px}

/* panels */
.mcpc-panel{border:.5px solid ${cardLine};border-radius:var(--dsw-radius-xl,16px);background:${card}}
.mcpc-panel-head{display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-height:52px;padding:12px 16px 8px}
.mcpc-panel-title{margin:0;font-size:14px;font-weight:600;line-height:22px}
.mcpc-panel-body{display:flex;flex-direction:column;gap:12px;padding:0 16px 16px}
.mcpc-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:40px 16px;text-align:center}
.mcpc-empty[data-compact=true]{padding:16px}
.mcpc-empty .mcpc-note{max-width:48ch}

/* status */
.mcpc-dot{flex:none;width:8px;height:8px;border-radius:50%}
.mcpc-dot[data-tone=ok]{background:${ok};box-shadow:0 0 0 3px ${okSoft}}
.mcpc-dot[data-tone=bad]{background:${bad};box-shadow:0 0 0 3px ${badSoft}}
.mcpc-dot[data-tone=wait]{background:${warnDot};box-shadow:0 0 0 3px ${warnSoft};animation:mcpc-pulse 1.4s ease-in-out infinite}
.mcpc-dot[data-tone=off]{border:1.5px solid ${idle}}
@keyframes mcpc-pulse{50%{opacity:.35}}
.mcpc-tag{display:inline-flex;flex:none;align-items:center;height:20px;padding:0 6px;border:.5px solid ${lineStrong};border-radius:var(--dsw-radius-xs,5px);color:${fg2};font-family:${mono};font-size:11px;line-height:18px;white-space:nowrap}
.mcpc-tag[data-soft=true]{border-color:transparent;background:${hover}}
.mcpc-tag[data-sans=true]{font-family:inherit}
.mcpc-tags{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-chip{display:inline-flex;flex:none;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;white-space:nowrap}
.mcpc-chip[data-tone=ok]{background:${okSoft};color:${ok}}
.mcpc-chip[data-tone=bad]{background:${badSoft};color:${bad}}
.mcpc-chip[data-tone=warn]{background:${warnSoft};color:${warn}}
.mcpc-chip[data-tone=info]{background:${accentSoft};color:${accent}}
.mcpc-chip[data-tone=idle]{background:${hover};color:${fg3}}
.mcpc-switch{position:relative;flex:none;width:34px;height:20px;padding:0;border:0;border-radius:999px;background:${lineStrong};cursor:pointer;transition:background .15s}
.mcpc-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.mcpc-switch[aria-checked=true]{background:${accent}}
.mcpc-switch[aria-checked=true]::after{transform:translateX(14px)}
.mcpc-switch:disabled{opacity:.42;cursor:not-allowed}
.mcpc-spinner{display:inline-block;flex:none;width:13px;height:13px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:mcpc-spin .7s linear infinite}
@keyframes mcpc-spin{to{transform:rotate(360deg)}}

/* installed */
.mcpc-summary{display:flex;flex-wrap:wrap;gap:6px 18px;padding:0 16px 12px;color:${fg3};font-size:12px}
.mcpc-summary b{margin-right:3px;color:${fg1};font-weight:600;font-variant-numeric:tabular-nums}
.mcpc-summary [data-tone=bad],.mcpc-summary [data-tone=bad] b{color:${bad}}
.mcpc-list{border-top:.5px solid ${divider}}
.mcpc-row{border-bottom:.5px solid ${divider}}
.mcpc-row:last-child{border-bottom:0}
.mcpc-row-line{display:flex;align-items:center;gap:8px;padding:8px 10px 8px 16px}
.mcpc-row-main{display:flex;flex:1;align-items:center;gap:10px;min-width:0;padding:4px 0;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.mcpc-row-name{font-weight:600;white-space:nowrap}
.mcpc-row-meta{flex:1;min-width:0;overflow:hidden;color:${fg3};font-size:12px;white-space:nowrap;text-overflow:ellipsis}
.mcpc-row-meta[data-tone=bad]{color:${bad}}
.mcpc-row-caret{display:inline-flex;flex:none;color:${fg3};transition:transform .15s}
.mcpc-row[data-open=true] .mcpc-row-caret{transform:rotate(90deg)}
.mcpc-row-detail{display:flex;flex-direction:column;gap:10px;padding:0 16px 14px 34px}
.mcpc-kv{display:grid;grid-template-columns:76px minmax(0,1fr);gap:6px 12px;margin:0;font-size:12px;line-height:20px}
.mcpc-kv>dt{color:${fg3}}
.mcpc-kv>dd{min-width:0;margin:0;color:${fg2};word-break:break-all}
.mcpc-err{margin:0;padding:8px 10px;border-radius:${rSm};background:${badSoft};color:${bad};font-family:${mono};font-size:11.5px;line-height:18px;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow:auto}
.mcpc-confirm{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:${rSm};background:${badSoft};font-size:12px;line-height:18px}
.mcpc-inline-form{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.mcpc-inline-form .mcpc-input{flex:1 1 220px;width:auto}
.mcpc-menu-wrap{position:relative}
.mcpc-menu{position:absolute;top:32px;right:0;z-index:5;min-width:168px;padding:4px;border:.5px solid ${line};border-radius:${rMd};background:var(--dsw-alias-bg-layer-2,#fff);box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.14))}
.mcpc-menu button{display:flex;align-items:center;width:100%;height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:${fg1};font:inherit;font-size:13px;text-align:left;cursor:pointer}
.mcpc-menu button:hover{background:${hover}}
.mcpc-menu button[data-danger=true]{color:${bad}}
.mcpc-menu hr{margin:4px 2px;border:0;border-top:.5px solid ${divider}}

/* add */
.mcpc-sources{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 16px 16px}
.mcpc-src{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px;border:.5px solid ${line};border-radius:${rMd};background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.mcpc-src:hover{border-color:${lineStrong};background:${hover}}
.mcpc-src[aria-pressed=true]{border-color:${accent};background:${accentSoft}}
.mcpc-src>svg{color:${accent}}
.mcpc-src>b{font-size:13px;font-weight:600}
.mcpc-src>span{color:${fg3};font-size:12px;line-height:17px}
.mcpc-step{display:flex;flex-direction:column;gap:14px;padding:16px;border-top:.5px solid ${divider}}
.mcpc-crumb{display:flex;flex-wrap:wrap;align-items:center;gap:6px;color:${fg3};font-size:12px}
.mcpc-search{display:flex;gap:8px}
.mcpc-search .mcpc-input{flex:1}
.mcpc-results{display:flex;flex-direction:column;gap:8px}
.mcpc-res{display:flex;flex-direction:column;gap:6px;padding:12px;border:.5px solid ${line};border-radius:${rMd}}
.mcpc-res-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 8px}
.mcpc-res-top b{font-size:13.5px}
.mcpc-opt{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding-top:8px;border-top:.5px solid ${divider}}
.mcpc-opt code,.mcpc-imp code{overflow:hidden;color:${fg2};font-family:${mono};font-size:11.5px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}
.mcpc-imports{display:flex;flex-direction:column;gap:6px}
.mcpc-imp{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 12px;border:.5px solid ${line};border-radius:${rMd};cursor:pointer}
.mcpc-imp:hover{background:${hover}}
.mcpc-imp[data-disabled=true]{cursor:default;opacity:.8}
.mcpc-imp input{margin:0;accent-color:${accent}}
.mcpc-imp-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.mcpc-imp code{color:${fg3}}
.mcpc-imp-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px}

/* form */
.mcpc-form{display:flex;flex-direction:column;gap:14px;min-width:0}
.mcpc-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.mcpc-label{color:${fg2};font-size:12px;font-weight:500;line-height:18px}
.mcpc-hint{color:${fg3};font-size:12px;line-height:18px}
.mcpc-input{width:100%;min-width:0;height:32px;padding:0 10px;border:.5px solid ${lineStrong};border-radius:${rSm};background:${field};color:${fg1};font:inherit;font-size:13px;outline:none}
.mcpc-input:focus{border-color:${accent}}
.mcpc-input::placeholder{color:${fg4}}
.mcpc-input:disabled{opacity:.55}
.mcpc-input[data-mono=true]{font-family:${mono};font-size:12.5px}
.mcpc-input[data-multiline=true]{height:auto;min-height:64px;padding:8px 10px;line-height:1.55;resize:vertical}
.mcpc-input[data-select=true]{flex:0 1 240px;width:auto;cursor:pointer}
.mcpc-seg{display:inline-flex;align-self:flex-start;gap:2px;padding:2px;border:.5px solid ${line};border-radius:10px;background:${hover}}
.mcpc-seg>button{height:28px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:${fg2};font:inherit;font-size:12.5px;cursor:pointer}
.mcpc-seg>button[aria-checked=true]{background:var(--dsw-alias-button-elevated-fill,#fff);color:${fg1};font-weight:600;box-shadow:var(--dsw-shadow-lv1,0 1px 2px rgba(0,0,0,.08))}
.mcpc-seg>button:disabled{cursor:not-allowed}
.mcpc-pairs{display:flex;flex-direction:column;gap:6px}
.mcpc-pair-wrap{display:flex;flex-direction:column;gap:3px}
.mcpc-pair{display:grid;grid-template-columns:minmax(0,170px) minmax(0,1fr) auto auto;align-items:center;gap:6px}
.mcpc-pair .mcpc-input{height:30px}
.mcpc-expr{display:flex;align-items:center;overflow:hidden;color:${fg3};font-family:${mono};font-size:12px;white-space:nowrap;text-overflow:ellipsis;cursor:default}
.mcpc-check{display:inline-flex;align-items:center;gap:6px;color:${fg2};font-size:12px;line-height:18px;cursor:pointer}
.mcpc-check input{flex:none;margin:0;accent-color:${accent}}
.mcpc-adv{border:.5px solid ${line};border-radius:${rMd}}
.mcpc-adv>summary{display:flex;align-items:center;gap:8px;padding:9px 12px;color:${fg2};font-size:12.5px;cursor:pointer;list-style:none}
.mcpc-adv>summary::-webkit-details-marker{display:none}
.mcpc-adv>summary::before{content:'›';color:${fg3};transition:transform .15s}
.mcpc-adv[open]>summary::before{transform:rotate(90deg)}
.mcpc-adv>div{display:flex;flex-direction:column;gap:8px;padding:2px 12px 12px}
.mcpc-result{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:${rMd};font-size:13px;line-height:20px}
.mcpc-result[data-tone=ok]{background:${okSoft}}
.mcpc-result[data-tone=bad]{background:${badSoft}}
.mcpc-result[data-tone=info]{background:${accentSoft};font-size:12.5px}
.mcpc-result-title{display:flex;align-items:center;gap:8px;font-weight:600}
.mcpc-result[data-tone=ok] .mcpc-result-title{color:${ok}}
.mcpc-result[data-tone=bad] .mcpc-result-title{color:${bad}}

/* discover */
.mcpc-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 16px 12px}
.mcpc-stat{display:flex;flex-direction:column;padding:10px 12px;border-radius:${rMd};background:${hover}}
.mcpc-stat b{font-size:20px;font-weight:600;line-height:28px;font-variant-numeric:tabular-nums}
.mcpc-stat span{color:${fg3};font-size:12px}
.mcpc-runtimes{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:0 16px 14px}
.mcpc-group{border-top:.5px solid ${divider}}
.mcpc-group>summary{display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 16px;font-size:13px;cursor:pointer;list-style:none}
.mcpc-group>summary::-webkit-details-marker{display:none}
.mcpc-group>summary::before{content:'›';color:${fg3};transition:transform .15s}
.mcpc-group[open]>summary::before{transform:rotate(90deg)}
.mcpc-group ul{margin:0;padding:0 16px 12px 34px;max-height:240px;overflow:auto;columns:2;column-gap:24px;color:${fg2};font-size:12px;line-height:22px}
.mcpc-group li{break-inside:avoid}

/* drawer and toast */
.mcpc-scrim{position:fixed;inset:0;z-index:40;background:var(--dsw-alias-bg-mask-1,rgba(10,10,20,.32))}
.mcpc-drawer{position:fixed;top:0;right:0;bottom:0;z-index:41;display:flex;flex-direction:column;width:min(540px,100%);background:var(--dsw-alias-bg-layer-2,#fff);color:${fg1};font-size:14px;line-height:22px;box-shadow:var(--dsw-shadow-lv3,0 12px 40px rgba(0,0,0,.2))}
.mcpc-drawer *{box-sizing:border-box}
.mcpc-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px 14px 20px;border-bottom:.5px solid ${divider}}
.mcpc-drawer-body{display:flex;flex:1;flex-direction:column;gap:14px;overflow:auto;padding:16px 20px}
.mcpc-drawer-foot{padding:12px 20px;border-top:.5px solid ${divider}}
.mcpc-notes{margin:0;padding-left:18px;color:${fg2};font-size:12px;line-height:18px}
.mcpc-toast{position:fixed;bottom:24px;left:50%;z-index:50;transform:translateX(-50%);max-width:min(560px,calc(100% - 32px));padding:8px 14px;border-radius:10px;background:${fg1};color:var(--dsw-alias-label-primary-inverted,#fff);font-size:13px;line-height:20px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px rgba(0,0,0,.14))}

@media (prefers-reduced-motion:reduce){.mcpc-dot[data-tone=wait],.mcpc-spinner{animation:none}}
@media (max-width:640px){
.mcpc-page{padding:20px 16px 48px}
.mcpc-sources,.mcpc-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.mcpc-pair{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.mcpc-group ul{columns:1}
.mcpc-row-meta{display:none}
}
`;
		//#endregion
		//#region src/client.jsx
		/**
		* Browser half: the MCP sidebar entry and the page it opens.
		*
		* The page has three tabs: Installed (look after the servers), Add (one place
		* for every way to add one), and Discover (the local scan and the AI
		* research). Editing and the export open in a side drawer. Every figure comes
		* from the host over this plugin's loopback RPC channel; configuration
		* arrives redacted. Sessions the AI flows open are shown with the workspace
		* UI's own navigation.
		*
		* @module dsh-mcp-console/client
		*/
		const NS = "mcpConsole";
		const CHANNEL = "/mcp-console";
		const PANEL_ID = "mcp-console";
		/** Pause before waiting again after a failed wait (host restarting, connection reset). */
		const RETRY_MS = 3e3;
		const TAB_KEY = "dsh-mcp-console.tab";
		/** This page's build; compared with the host's to catch a DSH that was not restarted after an update. */
		const CLIENT_VERSION = "0.1.11";
		const TABS = [
			"installed",
			"add",
			"discover"
		];
		function channelCaller(rpc) {
			return (endpoint, payload = {}, signal) => rpc.call(CHANNEL, endpoint, payload, signal).then((response) => {
				if (!response?.ok) throw new Error(response?.error?.message ?? "MCP console request failed");
				return response.value;
			});
		}
		/** The sidebar glyph: a plug, drawn inline (no host UI imports). */
		function PanelIcon({ size = 20 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.7",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 3v4M15 3v4M7 7h10v3a5 5 0 0 1-10 0z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 15v6" })]
			});
		}
		const rememberedTab = () => {
			try {
				const value = window.localStorage.getItem(TAB_KEY);
				return TABS.includes(value) ? value : "installed";
			} catch {
				return "installed";
			}
		};
		/** A short message at the bottom of the page. */
		function useToast() {
			const [text, setText] = react.useState();
			const timer = react.useRef();
			const show = react.useCallback((message) => {
				setText(message);
				window.clearTimeout(timer.current);
				timer.current = window.setTimeout(() => setText(void 0), 3e3);
			}, []);
			react.useEffect(() => () => window.clearTimeout(timer.current), []);
			return [text, show];
		}
		/** The export: JSON other clients read, to copy or save. Secrets are placeholders. */
		function ExportDrawer({ call, t, onClose }) {
			const [state, setState] = react.useState();
			const [copied, setCopied] = react.useState(false);
			const area = react.useRef(null);
			react.useEffect(() => {
				let live = true;
				call("servers/export").then((value) => {
					if (live) setState(value);
				}).catch((failure) => {
					if (live) setState({ error: clearMessage(failure) });
				});
				return () => {
					live = false;
				};
			}, [call]);
			const copy = () => {
				copyText(state.json, area.current).then(setCopied);
			};
			const download = () => {
				const url = URL.createObjectURL(new Blob([state.json], { type: "application/json" }));
				const link = document.createElement("a");
				link.href = url;
				link.download = "mcp-servers.json";
				link.click();
				window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Drawer, {
				title: state?.count === void 0 ? t("exportTitle") : fill(t("exportCount"), { count: state.count }),
				onClose,
				closeLabel: t("close"),
				footer: state?.json && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "mcpc-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "primary",
						size: "md",
						onClick: copy,
						children: copied ? t("exportCopied") : t("exportCopy")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						size: "md",
						onClick: download,
						children: t("exportDownload")
					})]
				}),
				children: [
					state === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-muted",
						children: t("loading")
					}),
					state?.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "bad",
						children: state.error
					}),
					state?.json && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("exportIntro")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: area,
							className: "mcpc-input",
							"data-mono": "true",
							"data-multiline": "true",
							readOnly: true,
							rows: 16,
							value: state.json,
							onFocus: (event) => event.target.select()
						}),
						state.notes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "mcpc-notes",
							children: state.notes.map((note) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: note }, note))
						})
					] })
				]
			});
		}
		/** Copy a text, or select it in its box when the clipboard refuses. */
		function copyText(text, box) {
			const fallback = () => {
				box?.select();
				return false;
			};
			if (navigator.clipboard?.writeText === void 0) return Promise.resolve(fallback());
			return navigator.clipboard.writeText(text).then(() => true, fallback);
		}
		/** Diagnostics to paste to whoever helps: versions, servers, recent problems; no secrets. */
		function DiagnosticsDrawer({ call, t, onClose }) {
			const [state, setState] = react.useState();
			const [copied, setCopied] = react.useState(false);
			const [reveal, setReveal] = react.useState();
			const box = react.useRef(null);
			react.useEffect(() => {
				let live = true;
				call("diagnostics", { pageVersion: CLIENT_VERSION }).then((value) => {
					if (live) setState(value);
				}).catch((failure) => {
					if (live) setState({ error: clearMessage(failure) });
				});
				return () => {
					live = false;
				};
			}, [call]);
			const open = () => {
				setReveal(void 0);
				call("diagnostics/reveal").then(() => setReveal({ ok: true })).catch((failure) => setReveal({ error: clearMessage(failure) }));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Drawer, {
				title: t("diagTitle"),
				onClose,
				closeLabel: t("close"),
				footer: state?.text && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "mcpc-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "primary",
						size: "md",
						onClick: () => {
							copyText(state.text, box.current).then(setCopied);
						},
						children: copied ? t("exportCopied") : t("diagCopy")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						size: "md",
						onClick: open,
						children: t("diagOpenFolder")
					})]
				}),
				children: [
					state === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-muted",
						children: t("loading")
					}),
					state?.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						"data-tone": "bad",
						children: state.error
					}),
					state?.text && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("diagIntro")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: box,
							className: "mcpc-input",
							"data-mono": "true",
							"data-multiline": "true",
							readOnly: true,
							rows: 18,
							value: state.text,
							onFocus: (event) => event.target.select()
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-hint",
							children: fill(t("diagLogAt"), { path: state.logDir })
						}),
						reveal?.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							"data-tone": "warn",
							children: reveal.error
						})
					] })
				]
			});
		}
		/** A failure while drawing a tab: say so, log it, and offer the diagnostics. */
		var TabBoundary = class extends react.Component {
			constructor(props) {
				super(props);
				this.state = { error: void 0 };
			}
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error, info) {
				const stack = String(info?.componentStack ?? "").split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).slice(0, 4).join(" < ");
				this.props.call("log/client", {
					event: "page-error",
					detail: `${error?.message ?? error} @ ${stack}`
				}).catch(() => void 0);
			}
			render() {
				const { t, onDiagnostics } = this.props;
				if (this.state.error === void 0) return this.props.children;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
					className: "mcpc-panel",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-empty",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("pageErrorTitle") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "mcpc-note",
								children: String(this.state.error?.message ?? this.state.error)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mcpc-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "primary",
									size: "md",
									onClick: onDiagnostics,
									children: t("diagTitle")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "md",
									onClick: () => this.setState({ error: void 0 }),
									children: t("pageErrorRetry")
								})]
							})
						]
					})
				});
			}
		};
		function ConsolePage({ rpc, t, openSession }) {
			const call = react.useMemo(() => channelCaller(rpc), [rpc]);
			const [status, setStatus] = react.useState();
			const [loading, setLoading] = react.useState(false);
			const [error, setError] = react.useState();
			const [tab, setTabState] = react.useState(rememberedTab);
			const [source, setSource] = react.useState();
			const [editing, setEditing] = react.useState();
			const [exporting, setExporting] = react.useState(false);
			const [diagnosing, setDiagnosing] = react.useState(false);
			const [toast, showToast] = useToast();
			const setTab = (next) => {
				setTabState(next);
				try {
					window.localStorage.setItem(TAB_KEY, next);
				} catch {}
			};
			const reload = react.useCallback(() => {
				setLoading(true);
				return call("status").then((next) => {
					setStatus(next);
					setError(void 0);
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setLoading(false));
			}, [call]);
			react.useEffect(() => {
				reload();
				const controller = new AbortController();
				let revision = 0;
				const loop = async () => {
					while (!controller.signal.aborted) try {
						const next = await call("status/wait", { revision }, controller.signal);
						if (controller.signal.aborted) return;
						if (next.revision !== revision) {
							revision = next.revision;
							const fresh = await call("status", {}, controller.signal);
							if (!controller.signal.aborted) setStatus(fresh);
						}
					} catch {
						if (controller.signal.aborted) return;
						await new Promise((resolve) => {
							window.setTimeout(resolve, RETRY_MS);
						});
					}
				};
				loop();
				return () => controller.abort();
			}, [reload, call]);
			const [choices, setChoices] = react.useState();
			react.useEffect(() => {
				let live = true;
				call("models").then((value) => {
					if (live) setChoices(value);
				}).catch((failure) => {
					if (live) setChoices({
						providers: [],
						stale: /unknown endpoint/u.test(clearMessage(failure))
					});
				});
				return () => {
					live = false;
				};
			}, [call]);
			const [model, setModel] = useModelChoice(choices);
			const [runtimes, setRuntimes] = react.useState();
			react.useEffect(() => {
				let live = true;
				call("runtimes").then((value) => {
					if (live) setRuntimes(value);
				}).catch(() => void 0);
				return () => {
					live = false;
				};
			}, [call]);
			const [scan, setScan] = react.useState();
			const [scanning, setScanning] = react.useState(false);
			const [scanError, setScanError] = react.useState();
			react.useEffect(() => {
				let live = true;
				call("scan/last").then((saved) => {
					if (live) setScan((current) => current ?? saved ?? null);
				}).catch(() => {
					if (live) setScan((current) => current ?? null);
				});
				return () => {
					live = false;
				};
			}, [call]);
			const rescan = () => {
				setScanning(true);
				setScanError(void 0);
				call("scan").then((next) => {
					setScan(next);
					if (next?.runtimes) setRuntimes(next.runtimes);
				}).catch((failure) => setScanError(clearMessage(failure))).finally(() => setScanning(false));
			};
			const editServer = (server) => call("servers/config", { entryId: server.entryId }).then((result) => {
				if (!result.editable) return fill(t("editUnavailable"), { reason: result.reason ?? "" });
				setEditing({
					server,
					form: result.form
				});
			}).catch((failure) => clearMessage(failure));
			const added = (result) => {
				reload();
				if (result === void 0) return;
				showToast(result.application === "restart-required" ? t("importedRestart") : fill(t("addedToast"), { name: result.serverName }));
				setSource(void 0);
				setTab("installed");
			};
			const edited = (result) => {
				setEditing(void 0);
				reload();
				showToast(result.application === "restart-required" ? t("restartRequired") : fill(t("editSaved"), { name: result.serverName }));
			};
			const goAdd = (next) => {
				setTab("add");
				if (next !== void 0) setSource(next);
			};
			const mismatch = status !== void 0 && status.version !== CLIENT_VERSION;
			react.useEffect(() => {
				if (mismatch) call("log/client", {
					event: "version-mismatch",
					detail: `page ${CLIENT_VERSION}, host ${status?.version ?? "?"}`
				}).catch(() => void 0);
			}, [mismatch]);
			const servers = status?.servers ?? [];
			const failed = servers.filter((server) => server.status === "failed").length;
			const existing = servers.map((server) => server.name);
			const ai = {
				choices,
				model,
				setModel,
				openSession,
				sessionsAvailable: status?.sessions !== false
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-page",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: "mcpc-head",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										className: "mcpc-h1",
										children: t("title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "mcpc-sub",
										children: t("intro")
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "mcpc-sp" }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Button, {
										variant: "primary",
										size: "md",
										onClick: () => goAdd(),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
											name: "plus",
											size: 14
										}), t("addMcp")]
									})
								]
							}),
							mismatch && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "mcpc-banner",
								role: "alert",
								children: fill(t("restartNeeded"), {
									page: CLIENT_VERSION,
									host: status.version ?? "?"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
								className: "mcpc-tabs",
								role: "tablist",
								"aria-label": t("title"),
								children: TABS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									role: "tab",
									className: "mcpc-tab",
									"aria-selected": tab === id,
									onClick: () => setTab(id),
									children: [t(`tab_${id}`), id === "installed" && status !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-count",
										"data-tone": failed > 0 ? "bad" : void 0,
										children: failed > 0 ? fill(t("tabFailed"), { count: failed }) : servers.length
									})]
								}, id))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TabBoundary, {
								call,
								t,
								onDiagnostics: () => setDiagnosing(true),
								children: [
									tab === "installed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InstalledView, {
										status,
										loading,
										error,
										reload,
										call,
										t,
										onEdit: editServer,
										onExport: () => setExporting(true),
										onDiagnostics: () => setDiagnosing(true),
										onAdd: () => goAdd(),
										onDiscover: () => setTab("discover")
									}),
									tab === "add" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddView, {
										source,
										setSource,
										call,
										t,
										runtimes,
										existing,
										scan,
										scanning,
										rescan,
										onSaved: added,
										ai
									}),
									tab === "discover" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiscoverView, {
										call,
										t,
										scan,
										scanning,
										scanError,
										rescan,
										onImport: () => goAdd("import"),
										ai
									})
								]
							}, tab)
						]
					}),
					editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Drawer, {
						title: fill(t("editTitle"), { name: editing.server.name }),
						onClose: () => setEditing(void 0),
						closeLabel: t("close"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-muted",
							children: t("editIntro")
						}),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerForm, {
							mode: "edit",
							initial: editing.form,
							entryId: editing.server.entryId,
							call,
							t,
							runtimes,
							onSaved: edited
						})
					}),
					exporting && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExportDrawer, {
						call,
						t,
						onClose: () => setExporting(false)
					}),
					diagnosing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiagnosticsDrawer, {
						call,
						t,
						onClose: () => setDiagnosing(false)
					}),
					toast && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mcpc-toast",
						role: "status",
						children: toast
					})
				]
			});
		}
		const inject = [
			"slots",
			"locale",
			"connection",
			"layout"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "mcp-console: copy");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-mcp-console";
				tag.textContent = STYLE;
				document.head.append(tag);
				return () => tag.remove();
			}, "mcp-console: style");
			const connection = ctx.get("connection");
			const t = ctx.locale.bind(NS);
			const openSession = (sessionId) => {
				const workspace = ctx.get("uiWorkspace");
				if (typeof sessionId === "string" && typeof workspace?.openSession === "function") workspace.openSession(sessionId);
			};
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS,
				inject: () => ({
					rpc: connection.rpc,
					t,
					openSession
				})
			}, ConsolePage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 5,
				label: () => t("panel"),
				locale: NS
			}, PanelIcon));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
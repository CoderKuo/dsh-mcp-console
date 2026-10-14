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
			intro: "管理当前 profile 的 MCP 服务器：查看连接状态、启用、禁用、编辑，从官方目录搜索、手动添加或让 AI 安装，以及检索本机可以接入的软件。",
			refresh: "刷新",
			refreshing: "刷新中…",
			error: "出错了",
			restartNeeded: "MCP 管理已更新到 v{page}，但 DSH 后台还在运行旧版本 v{host}。请完全退出 DSH（包括托盘图标）再重新打开，否则部分功能不可用。",
			listTitle: "已配置的 MCP",
			listEmpty: "当前 profile 还没有配置 MCP 服务器。可以用下面的「AI 快捷添加」或「手动添加」接入一个。",
			listCount: "共 {count} 个，{connected} 个已连接",
			noManager: "当前运行环境没有插件管理器，只能查看，不能启用或禁用。",
			statusConnected: "已连接",
			statusStarting: "连接中",
			statusFailed: "失败",
			statusDisabled: "已禁用",
			statusStopped: "已停止",
			startingHint: "已启动但还没有工具：可能正在连接，也可能首次连接失败（查看 DSH 日志），或这个服务器本身不提供工具。",
			enable: "启用",
			disable: "禁用",
			toggling: "切换中…",
			restartRequired: "已保存，重启 DSH 后生效。",
			overridden: "已保存，但被更高优先级的配置覆盖，当前状态没有变化。",
			readOnly: "这一项由插件包或其他配置提供，不能在这里切换：{reason}",
			transport: "传输",
			command: "命令",
			url: "地址",
			env: "环境变量",
			headers: "请求头",
			cwd: "工作目录",
			tools: "工具",
			toolsNone: "暂无",
			toolsShow: "查看 {count} 个工具",
			toolsHide: "收起",
			source: "来源",
			repository: "开源地址",
			repositoryNone: "未设置",
			repositoryEdit: "编辑",
			repositorySave: "保存",
			repositoryCancel: "取消",
			repositoryPlaceholder: "https://github.com/owner/project",
			valueExpression: "表达式",
			valueLiteral: "明文",
			addTitle: "AI 快捷添加",
			addIntro: "告诉 AI 这个 MCP 服务器从哪来，插件会在默认工作区开一个新会话，让 AI 查清怎么运行、安装并接入。会话以创作模式运行，每一步安装都会先征求你的同意。",
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
			manualTitle: "手动添加",
			manualIntro: "已经知道怎么运行（README 写好了命令，或服务商给了地址）时，直接填写即可，不经过 AI、不消耗模型额度。添加前会先在本机测试连接，通过后插件生成配置包并用插件管理器安装。",
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
			manualUrlHint: "只支持 streamable-http。只提供 SSE（地址通常以 /sse 结尾）的服务器不能接入。",
			manualValuePlaceholder: "值",
			manualEnvPlaceholder: "变量名，如 API_TOKEN，或模板 Bearer ${API_TOKEN}",
			manualFromEnv: "读环境变量",
			manualFromEnvHint: "勾选后，配置里只写「读取某个环境变量」，不保存值本身；DSH 启动这个服务器时再读取。",
			manualAddRow: "+ 添加一行",
			manualRemoveRow: "删除这一行",
			manualSecrets: "密钥建议勾选「读环境变量」：在系统里设置好环境变量，然后完全退出并重新打开 DSH。不勾选时值会原样保存在本机 mcp-bundles 目录的配置文件里。",
			manualAdd: "添加",
			manualAdding: "添加中…",
			manualAdded: "已添加为 {name}，在上面的列表里可以看到连接状态。",
			edit: "编辑",
			editTitle: "编辑 {name}",
			editIntro: "修改后会先测试连接，再通过插件管理器重新安装这个配置包（先卸载再安装）；安装失败会自动恢复原来的配置。",
			editNameFixed: "编辑时不能改名；要换名字请删除后重新添加。",
			editSave: "保存",
			editSaveAnyway: "仍然保存",
			editSaved: "已保存 {name}。",
			editUnavailable: "不能在这里编辑：{reason}",
			bundleOff: "这个服务器所在的插件包已关闭，打开开关即可恢复。",
			bundleToggleMany: "开关作用于整个插件包，其中 {count} 个服务器会一起启用或禁用。",
			export: "导出",
			exportTitle: "导出配置",
			exportCount: "导出 {count} 个服务器",
			exportClose: "关闭",
			exportIntro: "标准 mcpServers 格式，可用于 Claude Desktop、Claude Code、Cursor、Windsurf 等。密钥不会导出：读环境变量的值写成 ${变量名}，明文密钥换成占位符，需要在目标客户端里填写。",
			exportCopy: "复制",
			exportCopied: "已复制",
			exportDownload: "下载 JSON",
			importAll: "全部导入（{count} 个）",
			registryTitle: "搜索 MCP 目录",
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
			registryFill: "填入",
			registryFilled: "已填入目录条目「{name}」。请检查命令和环境变量（标有「读环境变量」的需要先在系统里设置），测试通过后再添加。",
			manualBridge: "通过 mcp-remote 桥接（用于只支持 SSE 或需要 OAuth 登录的服务）",
			manualBridgeOn: "将在本机用 npx -y mcp-remote 连接这个地址；它同时支持 streamable-http 和 SSE，需要登录时会打开浏览器。需要本机装有 Node.js。",
			manualSseHint: "地址以 /sse 结尾，通常是只支持 SSE 的服务器，DSH 不能直连。建议勾选上面的 mcp-remote 桥接。",
			manualExpressionHint: "这是配置包里原有的表达式，表单无法修改它，保存时会原样保留；不需要可以删掉这一行。",
			manualRequired: "必填",
			manualAddAnyway: "仍然添加",
			envMissing: "DSH 当前读不到环境变量 {names}。在系统里设置后，需要完全退出并重新打开 DSH。",
			runtimeMissing: "DSH 在 PATH 里没找到 {name}，这条命令启动不了。请先安装 {install}，然后完全退出并重新打开 DSH。",
			testOnly: "测试连接",
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
			scanTitle: "检索本机可接入的服务",
			scanIntro: "扫描本机已安装的软件、后台服务、监听端口、Docker 容器，以及 Claude Desktop、Cursor 等客户端里已经配置的 MCP。扫描只在本机进行。",
			scanStart: "扫描本机",
			scanning: "扫描中…",
			scanAgain: "重新扫描",
			scanAt: "上次扫描于 {time}，结果已保存；软件有变化时点「重新扫描」。",
			scanSummary: "找到 {apps} 个应用、{services} 个服务、{processes} 个进程、{ports} 个监听端口、{containers} 个容器、{clients} 个其他客户端的 MCP 配置。",
			scanApps: "已安装的应用",
			scanServices: "后台服务",
			scanProcesses: "运行中的进程",
			scanPorts: "监听端口",
			scanContainers: "Docker 容器",
			scanClients: "其他客户端的 MCP",
			importIntro: "这些 MCP 已经在别的客户端里配好，可以直接导入，不经过 AI。环境变量和请求头会原样复制（可能含密钥），保存在本机的 mcp-bundles 目录。",
			importCount: "{count} 个",
			importPresent: "已有同名",
			import: "导入",
			importAgain: "再导入一份",
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
			modelHint: "只对这次打开的会话生效，不会改动你的默认模型。"
		};
		const en = {
			lang: "en",
			panel: "MCP",
			title: "MCP Console",
			intro: "Manage the MCP servers of this profile: see their status, switch, edit, and export them; add one from the official registry, by hand, or with AI; and find local software that can be connected.",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			error: "Error",
			restartNeeded: "MCP Console was updated to v{page}, but the DSH host still runs v{host}. Fully quit DSH (including the tray icon) and reopen it; some features are unavailable until then.",
			listTitle: "Configured MCP servers",
			listEmpty: "This profile has no MCP server yet. Connect one with AI quick add or Add manually below.",
			listCount: "{count} servers, {connected} connected",
			noManager: "The Plugin Manager is not available here: servers can be viewed but not switched.",
			statusConnected: "Connected",
			statusStarting: "Connecting",
			statusFailed: "Failed",
			statusDisabled: "Disabled",
			statusStopped: "Stopped",
			startingHint: "Running but no tools yet: it may still be connecting, its first connection may have failed (see the DSH log), or it offers no tools.",
			enable: "Enable",
			disable: "Disable",
			toggling: "Switching…",
			restartRequired: "Saved; restart DSH to apply it.",
			overridden: "Saved, but a higher-priority layer overrides it, so nothing changed.",
			readOnly: "Provided by a bundle or another layer; it cannot be switched here: {reason}",
			transport: "Transport",
			command: "Command",
			url: "URL",
			env: "Environment",
			headers: "Headers",
			cwd: "Directory",
			tools: "Tools",
			toolsNone: "none",
			toolsShow: "Show {count} tools",
			toolsHide: "Hide",
			source: "Source",
			repository: "Repository",
			repositoryNone: "not set",
			repositoryEdit: "Edit",
			repositorySave: "Save",
			repositoryCancel: "Cancel",
			repositoryPlaceholder: "https://github.com/owner/project",
			valueExpression: "expression",
			valueLiteral: "literal",
			addTitle: "AI quick add",
			addIntro: "Tell the AI where the MCP server comes from. A new session opens in the default workspace and the AI works out how to run it, installs it, and connects it. The session runs in Creator mode and asks before every install step.",
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
			manualTitle: "Add manually",
			manualIntro: "When you already know how it runs (the README gives the command, or the provider gives an address), fill it in: no AI and no model usage. It is tried here first; once it connects, the plugin writes a configuration bundle and installs it with the Plugin Manager.",
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
			manualUrlHint: "streamable-http only. Servers that offer only SSE (URLs usually ending in /sse) cannot be connected.",
			manualValuePlaceholder: "value",
			manualEnvPlaceholder: "a variable such as API_TOKEN, or a template such as Bearer ${API_TOKEN}",
			manualFromEnv: "from environment",
			manualFromEnvHint: "The configuration only says which environment variable to read, not its value; DSH reads it when it starts the server.",
			manualAddRow: "+ Add a row",
			manualRemoveRow: "Remove this row",
			manualSecrets: "For secrets, tick \"from environment\": set the variable in your system, then fully quit and reopen DSH. Unticked values are saved as they are in the configuration file under the local mcp-bundles directory.",
			manualAdd: "Add",
			manualAdding: "Adding…",
			manualAdded: "Added as {name}; its status shows in the list above.",
			edit: "Edit",
			editTitle: "Edit {name}",
			editIntro: "Saving tries the server first, then reinstalls its bundle through the Plugin Manager (remove, then install); a failed install puts the old configuration back.",
			editNameFixed: "The name cannot change here; remove the server and add it again to rename it.",
			editSave: "Save",
			editSaveAnyway: "Save anyway",
			editSaved: "Saved {name}.",
			editUnavailable: "Cannot be edited here: {reason}",
			bundleOff: "The bundle of this server is switched off; switch it on to bring it back.",
			bundleToggleMany: "The switch acts on the whole bundle; its {count} servers go on and off together.",
			export: "Export",
			exportTitle: "Export",
			exportCount: "{count} servers exported",
			exportClose: "Close",
			exportIntro: "The common mcpServers format for Claude Desktop, Claude Code, Cursor, Windsurf, and others. No secret is exported: values read from the environment become ${NAME}, and literal secrets become placeholders to fill in the other client.",
			exportCopy: "Copy",
			exportCopied: "Copied",
			exportDownload: "Download JSON",
			importAll: "Import all ({count})",
			registryTitle: "Search the MCP Registry",
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
			registryFill: "Fill in",
			registryFilled: "Filled in from the registry entry \"{name}\". Check the command and environment variables (those read from the environment must be set first), test it, then add it.",
			manualBridge: "Connect through mcp-remote (for SSE-only servers or OAuth sign-in)",
			manualBridgeOn: "Runs npx -y mcp-remote on this computer to reach the URL; it speaks streamable-http and SSE and opens the browser when a sign-in is needed. Needs Node.js.",
			manualSseHint: "The URL ends in /sse, usually an SSE-only server that DSH cannot reach directly. Tick mcp-remote above.",
			manualExpressionHint: "An expression from the bundle. The form cannot change it and keeps it as it is; remove the row if it is not needed.",
			manualRequired: "required",
			manualAddAnyway: "Add anyway",
			envMissing: "DSH cannot see the environment variable {names}. Set it in your system, then fully quit and reopen DSH.",
			runtimeMissing: "DSH did not find {name} on its PATH, so this command cannot start. Install {install}, then fully quit and reopen DSH.",
			testOnly: "Test connection",
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
			scanTitle: "Find local services that support MCP",
			scanIntro: "Scan installed applications, background services, listening ports, Docker containers, and MCP servers already configured in clients such as Claude Desktop and Cursor. The scan runs on this computer only.",
			scanStart: "Scan this computer",
			scanning: "Scanning…",
			scanAgain: "Scan again",
			scanAt: "Last scanned {time}; the result is kept. Scan again when your software changes.",
			scanSummary: "Found {apps} applications, {services} services, {processes} processes, {ports} listening ports, {containers} containers, and MCP settings of {clients} other clients.",
			scanApps: "Installed applications",
			scanServices: "Background services",
			scanProcesses: "Running processes",
			scanPorts: "Listening ports",
			scanContainers: "Docker containers",
			scanClients: "MCP in other clients",
			importIntro: "Already configured in other clients; import them directly, without the AI. Environment variables and headers are copied as they are (they may contain secrets) into the local mcp-bundles directory.",
			importCount: "{count}",
			importPresent: "name in use",
			import: "Import",
			importAgain: "Import a copy",
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
			modelHint: "Applies to this session only; your default model is not changed."
		};
		//#endregion
		//#region src/client-style.js
		/**
		* The settings panel's stylesheet, built only from DSH design tokens so it
		* follows the host theme (light and dark) and matches the host's own settings
		* pages: settings cards, hairline-divided rows, 0.5px tags, layer-1 inputs.
		* Fallbacks cover hosts that predate the settings-card tokens.
		*
		* @module dsh-mcp-console/client-style
		*/
		const STYLE = `
.mcpc{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.mcpc-intro{margin:0;color:var(--dsw-alias-label-tertiary)}
.mcpc-card{display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:.5px solid var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l4,rgba(127,127,127,.3)));border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2))}
.mcpc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:28px}
.mcpc-title{display:flex;align-items:center;gap:8px;margin:0;font-size:15px;font-weight:600;line-height:22px}
.mcpc-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mcpc-warn{margin:0;color:var(--dsw-alias-state-warn-label,#dd8629);font-size:12px;line-height:18px}
.mcpc-error{margin:0;color:var(--dsw-alias-state-error-primary,#ec1313);font-size:12px;line-height:18px}
.mcpc-label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}
.mcpc-mono{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;word-break:break-all}
.mcpc-detail{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto}

.mcpc-btn{box-sizing:border-box;display:inline-flex;flex:none;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}
.mcpc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.mcpc-btn:disabled{opacity:.4;cursor:not-allowed}
.mcpc-btn[data-size=md]{height:32px;padding:0 14px;border-radius:var(--dsw-radius-md,12px);font-size:13px}
.mcpc-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.mcpc-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.mcpc-btn[data-variant=ghost]{border-color:transparent;color:var(--dsw-alias-label-secondary)}
.mcpc-btn[data-variant=danger]{border-color:transparent;color:var(--dsw-alias-state-error-primary)}
.mcpc-btn[data-variant=danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}

.mcpc-input{box-sizing:border-box;flex:1 1 200px;min-width:0;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.mcpc-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.mcpc-input::placeholder{color:var(--dsw-alias-label-caption)}
.mcpc-input:disabled{opacity:.5}
.mcpc-link{color:var(--dsw-alias-state-business-primary);font-size:12px;text-decoration:none}
.mcpc-link:hover{text-decoration:underline}
.mcpc-textarea{display:block;width:100%;height:auto;min-height:96px;padding:8px 10px;line-height:1.6;resize:vertical;white-space:pre;overflow-x:auto}
.mcpc-form{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

.mcpc-chip{flex:none;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;line-height:18px;white-space:nowrap}
.mcpc-chip[data-tone=success]{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary)}
.mcpc-chip[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.mcpc-chip[data-tone=info]{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary)}
.mcpc-chip[data-tone=neutral]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.mcpc-tag{flex:none;padding:0 6px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xs,4px);color:var(--dsw-alias-label-secondary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11px;line-height:18px;cursor:default}
.mcpc-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.mcpc-dot[data-tone=success]{background:var(--dsw-alias-state-success-primary)}
.mcpc-dot[data-tone=warn]{background:var(--dsw-alias-state-warn-primary)}
.mcpc-dot[data-tone=danger]{background:var(--dsw-alias-state-error-primary)}

.mcpc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.mcpc-stat{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-stat-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mcpc-stat-value{font-size:20px;font-weight:600;line-height:28px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.mcpc-list{display:flex;flex-direction:column}
.mcpc-row{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:.5px solid var(--dsw-alias-border-l2)}
.mcpc-row:first-child{border-top:0;padding-top:2px}
.mcpc-row-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.mcpc-row-name{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;font-weight:500}
.mcpc-row-name>.mcpc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mcpc-actions{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.mcpc-figures{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.mcpc-figures b{margin-left:4px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.mcpc-bar{height:4px;overflow:hidden;border-radius:999px;background:var(--dsw-alias-interactive-bg-active)}
.mcpc-bar>span{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-state-success-primary)}
.mcpc-bar[data-level=warn]>span{background:var(--dsw-alias-state-warn-primary)}
.mcpc-bar[data-level=low]>span{background:var(--dsw-alias-state-error-primary)}
.mcpc-groups{display:flex;flex-wrap:wrap;align-items:center;gap:6px 6px}
.mcpc-groups>.mcpc-label{margin-right:2px}
.mcpc-reach{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;font-size:12px;line-height:18px}
.mcpc-reach>span{display:inline-flex;align-items:center;gap:4px;cursor:default}
.mcpc-reach>span[data-state=ok]{color:var(--dsw-alias-state-success-primary)}
.mcpc-reach>span[data-state=partial]{color:var(--dsw-alias-state-warn-label,#dd8629)}
.mcpc-reach>span[data-state=no]{color:var(--dsw-alias-label-caption);text-decoration:line-through}
.mcpc-add{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:.5px solid var(--dsw-alias-border-l2)}

.mcpc-models{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;min-width:0;border:0}
.mcpc-model{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover);cursor:pointer}
.mcpc-model>input{flex:none;width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-state-business-primary)}
.mcpc-model>span{display:flex;flex-direction:column;min-width:0;gap:2px}
.mcpc-model b{font-size:13px;font-weight:500}
.mcpc-models:disabled .mcpc-model{opacity:.5;cursor:not-allowed}

.mcpc-setting{display:grid;grid-template-columns:112px minmax(0,1fr);gap:6px 16px;align-items:start}
.mcpc-setting>.mcpc-label{padding-top:5px}
.mcpc-setting>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.mcpc-seg{display:inline-flex;flex-wrap:wrap;align-self:flex-start;gap:2px;max-width:100%;padding:2px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-seg>button{height:28px;padding:0 12px;border:0;border-radius:calc(var(--dsw-radius-md,12px) - 2px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.mcpc-seg>button:hover:not(:disabled):not([aria-checked=true]){color:var(--dsw-alias-label-primary)}
.mcpc-seg>button[aria-checked=true]{background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--dsw-shadow-lv1)}
.mcpc-seg>button:disabled{cursor:not-allowed;opacity:.5}
.mcpc-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px}
.mcpc-status>b{font-weight:600;font-variant-numeric:tabular-nums}
.mcpc-callout{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-state-warn-tertiary)}
.mcpc-callout[data-tone=info]{background:var(--dsw-alias-state-business-tertiary)}
.mcpc-callout[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-label-primary)}
.mcpc-callout>.mcpc-title{font-size:13px}
.mcpc-split{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}

.mcpc-advanced>summary{width:fit-content;padding:2px 4px;margin-left:-4px;border-radius:var(--dsw-radius-sm,8px);color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px;cursor:pointer}
.mcpc-advanced>summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-advanced[open]>summary{margin-bottom:10px}
.mcpc-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.mcpc-field>.mcpc-input,.mcpc-field>.mcpc-textarea{flex:none;width:100%}

.mcpc-composer{display:inline-flex;flex:0 0 auto;align-items:center;box-sizing:border-box;height:28px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:20px;font-variant-numeric:tabular-nums;white-space:nowrap;user-select:none}

@media (max-width:640px){
  .mcpc-stats{grid-template-columns:1fr}
  .mcpc-setting{grid-template-columns:1fr}
  .mcpc-models{grid-template-columns:1fr}
  .mcpc-setting>.mcpc-label{padding-top:0}
}

.mcpc-page{box-sizing:border-box;height:100%;overflow:auto;padding:28px 24px 48px}
.mcpc-page>.mcpc{max-width:960px;margin:0 auto}
.mcpc-header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}
.mcpc-h1{margin:0;color:var(--dsw-alias-label-primary);font-size:20px;font-weight:600;line-height:28px}
.mcpc-server{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px)}
.mcpc-server[data-enabled=false]{opacity:.72}
.mcpc-server-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.mcpc-server-name{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:600}
.mcpc-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mcpc-kv>dt{color:var(--dsw-alias-label-tertiary)}
.mcpc-kv>dd{margin:0;min-width:0;word-break:break-all}
.mcpc-tags{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-switch{position:relative;display:inline-flex;align-items:center;width:36px;height:20px;padding:0;border:0;border-radius:10px;background:var(--dsw-alias-border-l3);cursor:pointer;flex:none}
.mcpc-switch::after{content:'';position:absolute;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:left .15s}
.mcpc-switch[aria-checked=true]{background:var(--dsw-alias-state-success-primary)}
.mcpc-switch[aria-checked=true]::after{left:18px}
.mcpc-switch:disabled{opacity:.45;cursor:not-allowed}
.mcpc-textarea{box-sizing:border-box;width:100%;min-height:64px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.5;resize:vertical;outline:none}
.mcpc-textarea:focus{border-color:var(--dsw-alias-state-business-primary)}
.mcpc-columns{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.mcpc-group{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.mcpc-group>ul{margin:0;padding-left:16px;max-height:180px;overflow:auto;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mcpc-link{color:var(--dsw-alias-state-business-primary);text-decoration:none;word-break:break-all}
.mcpc-link:hover{text-decoration:underline}
.mcpc-select{flex:1 1 180px;height:32px;padding:0 8px;cursor:pointer}
.mcpc-imports{display:flex;flex-direction:column;gap:8px}
.mcpc-imports>p{margin:-4px 0 2px}
.mcpc-imports-head{display:flex;align-items:baseline;gap:8px}
.mcpc-import-list{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}
.mcpc-import-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1)}
.mcpc-import-row:hover{border-color:var(--dsw-alias-border-l3)}
.mcpc-import-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.mcpc-import-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
.mcpc-import-name{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px}
.mcpc-import-cmd{overflow:hidden;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:11.5px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}
.mcpc-import-action{display:flex;align-items:center;justify-content:flex-end}
.mcpc-tag-soft{border-color:transparent;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-family:inherit}
.mcpc-recognised{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0}
.mcpc-pair{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.mcpc-pair>.mcpc-input{flex:1 1 160px;height:30px}
.mcpc-pair>.mcpc-pair-name{flex:0 1 180px;font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px}
.mcpc-check{display:inline-flex;flex:none;align-items:center;gap:4px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}
.mcpc-check>input{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-state-business-primary)}
.mcpc-pair-wrap{display:flex;flex-direction:column;gap:2px}
.mcpc-pair-expr{display:flex;align-items:center;overflow:hidden;color:var(--dsw-alias-label-tertiary);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;white-space:nowrap;text-overflow:ellipsis;cursor:default}
.mcpc-check-row{align-self:flex-start}
.mcpc-callout[data-tone=success]{background:var(--dsw-alias-state-success-tertiary)}
.mcpc-callout[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger)}
.mcpc-callout .mcpc-tags{display:flex;flex-wrap:wrap;gap:4px}
.mcpc-notes{margin:0;padding-left:18px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.mcpc-reg-row{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1)}
.mcpc-reg-option{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding-top:6px;border-top:.5px solid var(--dsw-alias-border-l2)}
.mcpc-imports-head .mcpc-btn{margin-left:auto}
`;
		//#endregion
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
		//#region src/client-ui.jsx
		/**
		* Shared page primitives: cards, buttons, and message helpers.
		*
		* @module dsh-mcp-console/client-ui
		*/
		const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => values[name] === void 0 ? match : String(values[name]));
		const clearMessage = (error) => String(error instanceof Error ? error.message : error).replace(/^MCP console:\s*/u, "");
		function Card({ title, aside, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mcpc-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "mcpc-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "mcpc-title",
						children: title
					}), aside]
				}), children]
			});
		}
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
		//#endregion
		//#region src/client-manual.jsx
		/**
		* Add manually and edit: the form for a server the person knows how to run.
		*
		* The form is tried before it is saved (the MCP handshake runs on the host);
		* a failed try can still be saved on purpose. Environment references show
		* whether DSH can see the variable, and a command whose runtime is missing
		* on DSH's PATH says so before anything runs.
		*
		* @module dsh-mcp-console/client-manual
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
		/** Whether DSH sees each referenced variable, re-asked shortly after the rows change. */
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
		/** The runtime the form needs that DSH did not find, if any. */
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
		function PairsEditor({ label, pairs, onChange, namePlaceholder, valuePlaceholder, disabled, environment, t }) {
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
					pairs.map((pair, index) => {
						const missing = referencedVariables(pair).filter((name) => environment[name] === false);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mcpc-pair-wrap",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "mcpc-pair",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "mcpc-input mcpc-pair-name",
											spellCheck: false,
											disabled: disabled || pair.expression,
											placeholder: namePlaceholder,
											value: pair.name,
											onChange: (event) => update(index, { name: event.target.value })
										}),
										pair.expression ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-input mcpc-pair-expr",
											title: t("manualExpressionHint"),
											children: `!!js ${pair.value}`
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "mcpc-input",
											spellCheck: false,
											disabled,
											type: !pair.fromEnv && SECRET_NAME.test(pair.name) ? "password" : "text",
											autoComplete: "off",
											placeholder: pair.fromEnv ? t("manualEnvPlaceholder") : valuePlaceholder,
											value: pair.value,
											onChange: (event) => update(index, { value: event.target.value })
										}),
										!pair.expression && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
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
											variant: "ghost",
											disabled,
											"aria-label": t("manualRemoveRow"),
											onClick: () => onChange(pairs.filter((_, i) => i !== index)),
											children: "×"
										})
									]
								}),
								pair.description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-meta",
									children: `${pair.required ? `${t("manualRequired")} · ` : ""}${pair.description}`
								}),
								missing.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-warn",
									children: fill(t("envMissing"), { names: missing.join(", ") })
								})
							]
						}, index);
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						disabled,
						onClick: () => onChange([...pairs, emptyPair()]),
						children: t("manualAddRow")
					}) })
				]
			});
		}
		const BRIDGE_REASONS = /* @__PURE__ */ new Set(["oauth", "not-streamable"]);
		/** The failure reasons the host reports, each with its own sentence. */
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
		/** What a try found: the server and its tools, or why it failed and what to do. */
		function TestResult({ result, remote, bridged, t, onBridge }) {
			if (result.ok) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-callout",
				"data-tone": "success",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fill(t("testOk"), {
					server: [result.server.name, result.server.version].filter(Boolean).join(" ") || "—",
					count: result.toolCount,
					ms: result.ms
				}) }), result.tools.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mcpc-tags",
					children: result.tools.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-tag",
						children: name
					}, name))
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-callout",
				"data-tone": "danger",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: `${t(REASONS.has(result.reason) ? `test_${result.reason}` : "test_failed")}${result.message ? ` (${result.message})` : ""}` }),
					result.output && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "mcpc-detail",
						children: result.output
					}),
					remote && !bridged && BRIDGE_REASONS.has(result.reason) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "mcpc-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-meta",
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
		* The Add manually card, also used to edit a server.
		* @param props - `draft` (`{ key, form, mode, entryId?, origin? }`), the
		*   caller, the copy, the runtimes found, and what to do after a save or a
		*   cancelled edit.
		*/
		function ManualAddCard({ draft, call, t, runtimes, onSaved, onCancel, cardRef }) {
			const editing = draft?.mode === "edit";
			const [form, setForm] = react.useState(() => ({
				...INITIAL_FORM,
				...draft?.form ?? {}
			}));
			const [busy, setBusy] = react.useState(false);
			const [testing, setTesting] = react.useState(false);
			const [test, setTest] = react.useState();
			const [done, setDone] = react.useState();
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
				setDone(void 0);
				return (editing ? call("servers/update", {
					...payload(),
					entryId: draft.entryId
				}) : call("servers/add", payload())).then((result) => {
					setDone(result);
					setTest(void 0);
					if (!editing) setForm(INITIAL_FORM);
					return onSaved(result);
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const submit = (event) => {
				event.preventDefault();
				runTest().then((result) => {
					if (result?.ok === true) return save();
				});
			};
			const title = editing ? fill(t("editTitle"), { name: draft.form.name }) : t("manualTitle");
			const working = busy || testing;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: cardRef,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
					title,
					aside: editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						disabled: working,
						onClick: onCancel,
						children: t("repositoryCancel")
					}) : void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: editing ? t("editIntro") : t("manualIntro")
						}),
						draft?.origin && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-callout",
							"data-tone": "info",
							children: fill(t("registryFilled"), { name: draft.origin })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
							className: "mcpc-add",
							onSubmit: submit,
							children: [
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
										editing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-meta",
											children: t("editNameFixed")
										})
									]
								}),
								remote ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "mcpc-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-label",
												children: t("manualUrl")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: "mcpc-input mcpc-mono",
												type: "url",
												spellCheck: false,
												disabled: working,
												placeholder: "https://mcp.example.com/mcp",
												value: form.url,
												onChange: (event) => set({ url: event.target.value })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-meta",
												children: form.bridge ? t("manualBridgeOn") : t("manualUrlHint")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "mcpc-check mcpc-check-row",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											disabled: working,
											checked: form.bridge,
											onChange: (event) => set({ bridge: event.target.checked })
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("manualBridge") })]
									}),
									!form.bridge && /\/sse\/?(?:\?|$)/u.test(form.url) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-warn",
										children: t("manualSseHint")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PairsEditor, {
										label: t("headers"),
										pairs: form.headers,
										onChange: (headers) => set({ headers }),
										namePlaceholder: "Authorization",
										valuePlaceholder: t("manualValuePlaceholder"),
										disabled: working,
										environment,
										t
									})
								] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "mcpc-field",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-label",
												children: t("manualCommand")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												className: "mcpc-input mcpc-mono",
												spellCheck: false,
												disabled: working,
												placeholder: "npx -y @upstash/context7-mcp",
												value: form.commandLine,
												onChange: (event) => set({ commandLine: event.target.value })
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mcpc-meta",
												children: t("manualCommandHint")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PairsEditor, {
										label: t("env"),
										pairs: form.env,
										onChange: (env) => set({ env }),
										namePlaceholder: "API_KEY",
										valuePlaceholder: t("manualValuePlaceholder"),
										disabled: working,
										environment,
										t
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "mcpc-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-label",
											children: t("manualCwd")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: "mcpc-input mcpc-mono",
											spellCheck: false,
											disabled: working,
											placeholder: t("manualCwdPlaceholder"),
											value: form.cwd,
											onChange: (event) => set({ cwd: event.target.value })
										})]
									})
								] }),
								missing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "mcpc-warn",
									children: fill(t("runtimeMissing"), {
										name: missing.name,
										install: missing.install
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "mcpc-note",
									children: t("manualSecrets")
								}),
								test && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TestResult, {
									result: test,
									remote,
									bridged: form.bridge,
									t,
									onBridge: () => set({ bridge: true })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "mcpc-split",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "mcpc-actions",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												type: "submit",
												variant: "primary",
												size: "md",
												disabled: working || !ready,
												children: testing ? t("testRunning") : busy ? t("manualAdding") : editing ? t("editSave") : t("manualAdd")
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
											})
										]
									}), testing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-meta",
										children: remote && !form.bridge ? t("testWaitRemote") : t("testWaitLocal")
									})]
								})
							]
						}),
						done && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: done.application === "restart-required" ? t("importedRestart") : fill(t(editing ? "editSaved" : "manualAdded"), { name: done.serverName })
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-error",
							role: "alert",
							children: `${t("error")}: ${error}`
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client-registry.jsx
		/**
		* Search the official MCP Registry and fill a result into Add manually.
		*
		* @module dsh-mcp-console/client-registry
		*/
		const SAFE_LINK = /^https:\/\//u;
		function Result({ result, existing, runtimes, onFill, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "mcpc-reg-row",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-import-title",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-import-name",
								children: result.title || result.name
							}),
							result.version && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-tag",
								children: result.version
							}),
							result.title && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-meta mcpc-mono",
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
						className: "mcpc-meta",
						children: result.description
					}),
					result.options.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: t("registryNoOption")
					}),
					result.options.map((option, index) => {
						const missing = missingRuntime(option.form, runtimes);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mcpc-reg-option",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-import-cmd",
								title: option.form.commandLine || option.form.url,
								children: option.form.commandLine || option.form.url
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mcpc-actions",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-tag mcpc-tag-soft",
										children: t(`registryKind_${option.kind}`)
									}),
									option.form.bridge && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-tag mcpc-tag-soft",
										children: "mcp-remote"
									}),
									missing && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-chip",
										"data-tone": "danger",
										children: fill(t("registryMissing"), { name: missing.name })
									}),
									existing.includes(option.form.name) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-chip",
										"data-tone": "neutral",
										children: t("importPresent")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "primary",
										onClick: () => onFill(option.form, result.title || result.name),
										children: t("registryFill")
									})
								]
							})]
						}, index);
					}),
					result.skipped.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: fill(t("registrySkipped"), { list: result.skipped.join("; ") })
					})
				]
			});
		}
		function RegistryCard({ call, t, runtimes, existing, onFill }) {
			const [query, setQuery] = react.useState("");
			const [state, setState] = react.useState({
				results: [],
				searched: false
			});
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState();
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("registryTitle"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("registryIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: "mcpc-form",
						onSubmit: (event) => {
							event.preventDefault();
							search();
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "mcpc-input",
							type: "search",
							spellCheck: false,
							placeholder: t("registryPlaceholder"),
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
					state.searched && state.results.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: fill(t("registryNone"), { query: state.query })
					}),
					state.results.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "mcpc-import-list",
						children: state.results.map((result) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Result, {
							result,
							existing,
							runtimes,
							onFill,
							t
						}, `${result.name}@${result.version}`))
					}),
					state.nextCursor && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: busy,
						onClick: () => search(state.nextCursor),
						children: t("registryMore")
					}) }),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-error",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		//#endregion
		//#region src/client.jsx
		/**
		* Browser half: the MCP sidebar entry and the page it opens.
		*
		* Every figure comes from the host over this plugin's loopback RPC channel;
		* configuration arrives redacted. Sessions the AI flows open are shown with
		* the workspace UI's own navigation.
		*
		* @module dsh-mcp-console/client
		*/
		const NS = "mcpConsole";
		const CHANNEL = "/mcp-console";
		const PANEL_ID = "mcp-console";
		/** Pause before waiting again after a failed wait (host restarting, connection reset). */
		const RETRY_MS = 3e3;
		/** This page's build; compared with the host's to catch a DSH that was not restarted after an update. */
		const CLIENT_VERSION = "0.1.8";
		function channelCaller(rpc) {
			return (endpoint, payload = {}, signal) => rpc.call(CHANNEL, endpoint, payload, signal).then((response) => {
				if (!response?.ok) throw new Error(response?.error?.message ?? "MCP console request failed");
				return response.value;
			});
		}
		/** The sidebar glyph: two plugs meeting, drawn inline (no host UI imports). */
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
						className: "mcpc-meta",
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
						className: "mcpc-form",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "mcpc-input mcpc-select",
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
							className: "mcpc-input mcpc-select",
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
						className: "mcpc-meta",
						children: isDefault ? t("modelIsDefault") : t("modelHint")
					})
				]
			});
		}
		const STATUS_TONE = {
			connected: "success",
			starting: "info",
			failed: "danger",
			disabled: "neutral",
			stopped: "neutral"
		};
		const STATUS_KEY = {
			connected: "statusConnected",
			starting: "statusStarting",
			failed: "statusFailed",
			disabled: "statusDisabled",
			stopped: "statusStopped"
		};
		function ServerRow({ server, call, t, onChanged, onEdit }) {
			const [busy, setBusy] = react.useState(false);
			const [notice, setNotice] = react.useState();
			const [error, setError] = react.useState();
			const [showTools, setShowTools] = react.useState(false);
			const [editing, setEditing] = react.useState();
			const [confirming, setConfirming] = react.useState(false);
			const remove = () => {
				setBusy(true);
				setError(void 0);
				setNotice(void 0);
				call("servers/remove", { entryId: server.entryId }).then((result) => {
					setConfirming(false);
					if (result?.application === "restart-required") setNotice(t("restartRequired"));
					return onChanged();
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const edit = () => {
				setBusy(true);
				setError(void 0);
				Promise.resolve(onEdit(server)).then((reason) => {
					if (typeof reason === "string") setError(reason);
				}).finally(() => setBusy(false));
			};
			const toggle = () => {
				setBusy(true);
				setError(void 0);
				setNotice(void 0);
				call("servers/toggle", {
					entryId: server.entryId,
					enabled: !server.enabled
				}).then((result) => {
					if (result?.application === "restart-required") setNotice(t("restartRequired"));
					else if (result?.application === "overridden") setNotice(t("overridden"));
					return onChanged();
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const saveRepository = () => {
				setBusy(true);
				setError(void 0);
				call("servers/repository", {
					rowId: server.rowId,
					url: editing ?? ""
				}).then(() => {
					setEditing(void 0);
					return onChanged();
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const config = server.config ?? {};
			const mapTags = (list) => Array.isArray(list) && list.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "mcpc-tags",
				children: list.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mcpc-tag",
					title: item.source === "expression" ? t("valueExpression") : t("valueLiteral"),
					children: item.name
				}, item.name))
			}) : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-server",
				"data-enabled": server.enabled ? "true" : "false",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-server-top",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "mcpc-server-name",
							children: [
								server.name,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-chip",
									"data-tone": STATUS_TONE[server.status] ?? "neutral",
									children: t(STATUS_KEY[server.status] ?? "statusStopped")
								}),
								server.toolCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-meta",
									children: `${server.toolCount} ${t("tools")}`
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "mcpc-actions",
							children: [
								server.removable && server.bundle?.disabled !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									disabled: busy,
									onClick: edit,
									children: t("edit")
								}),
								server.removable && !confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "danger",
									disabled: busy,
									onClick: () => setConfirming(true),
									children: t("remove")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-meta",
									children: busy ? t("toggling") : server.enabled ? t("disable") : t("enable")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									role: "switch",
									className: "mcpc-switch",
									"aria-checked": server.enabled,
									"aria-label": server.enabled ? t("disable") : t("enable"),
									title: server.toggleable ? void 0 : fill(t("readOnly"), { reason: server.readOnlyReason ?? "—" }),
									disabled: busy || !server.toggleable,
									onClick: toggle
								})
							]
						})]
					}),
					server.bundle?.disabled === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: t("bundleOff")
					}),
					server.toggleVia === "bundle" && server.bundle?.mcpRows > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: fill(t("bundleToggleMany"), { count: server.bundle.mcpRows })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
						className: "mcpc-kv",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("transport") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: config.transport }),
							config.transport === "streamable-http" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("url") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
									className: "mcpc-mono",
									children: config.url
								}),
								mapTags(config.headers) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("headers") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: mapTags(config.headers) })] })
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("command") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
									className: "mcpc-mono",
									children: [config.command, ...config.args ?? []].join(" ")
								}),
								mapTags(config.env) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("env") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: mapTags(config.env) })] }),
								config.cwd && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("cwd") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
									className: "mcpc-mono",
									children: config.cwd
								})] })
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("repository") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: editing === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mcpc-actions",
								children: [server.repository ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									className: "mcpc-link",
									href: server.repository,
									target: "_blank",
									rel: "noreferrer noopener",
									children: server.repository
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-meta",
									children: t("repositoryNone")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									disabled: busy,
									onClick: () => setEditing(server.repository ?? ""),
									children: t("repositoryEdit")
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mcpc-form",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "mcpc-input",
										type: "url",
										autoFocus: true,
										placeholder: t("repositoryPlaceholder"),
										value: editing,
										onChange: (event) => setEditing(event.target.value),
										onKeyDown: (event) => {
											if (event.key === "Enter") saveRepository();
											if (event.key === "Escape") setEditing(void 0);
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "primary",
										disabled: busy,
										onClick: saveRepository,
										children: t("repositorySave")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										onClick: () => setEditing(void 0),
										children: t("repositoryCancel")
									})
								]
							}) }),
							server.bundle && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("source") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
								className: "mcpc-mono",
								children: `${server.bundle.name}${server.bundle.version ? `@${server.bundle.version}` : ""}`
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("tools") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: server.toolCount === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-meta",
								children: t("toolsNone")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								onClick: () => setShowTools((open) => !open),
								children: showTools ? t("toolsHide") : fill(t("toolsShow"), { count: server.toolCount })
							}), showTools && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-tags",
								children: server.tools.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-tag mcpc-mono",
									children: name
								}, name))
							})] }) })
						]
					}),
					confirming && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mcpc-callout",
						"data-tone": "danger",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fill(t(server.bundle?.mcpRows > 1 ? "removeConfirmMany" : "removeConfirm"), {
							bundle: server.bundle?.name ?? "",
							count: server.bundle?.mcpRows ?? 1
						}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "mcpc-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								disabled: busy,
								onClick: remove,
								children: busy ? t("removing") : t("removeYes")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								disabled: busy,
								onClick: () => setConfirming(false),
								children: t("repositoryCancel")
							})]
						})]
					}),
					server.status === "starting" && server.toolCount === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: t("startingHint")
					}),
					server.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "mcpc-detail",
						children: server.error
					}),
					notice && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: notice
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-error",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		/** The export: JSON other clients read, to copy or save. Secrets are placeholders. */
		function ExportPanel({ call, t, onClose }) {
			const [state, setState] = react.useState();
			const [copied, setCopied] = react.useState(false);
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
				navigator.clipboard?.writeText(state.json).then(() => setCopied(true)).catch(() => setCopied(false));
			};
			const download = () => {
				const url = URL.createObjectURL(new Blob([state.json], { type: "application/json" }));
				const link = document.createElement("a");
				link.href = url;
				link.download = "mcp-servers.json";
				link.click();
				window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-callout",
				"data-tone": "info",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "mcpc-split",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-label",
							children: state?.count === void 0 ? t("exportTitle") : fill(t("exportCount"), { count: state.count })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: onClose,
							children: t("exportClose")
						})]
					}),
					state === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: t("refreshing")
					}),
					state?.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-error",
						children: state.error
					}),
					state?.json && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-meta",
							children: t("exportIntro")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: "mcpc-input mcpc-textarea mcpc-mono",
							readOnly: true,
							rows: 8,
							value: state.json,
							onFocus: (event) => event.target.select()
						}),
						state.notes.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "mcpc-notes",
							children: state.notes.map((note) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: note }, note))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "mcpc-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								onClick: copy,
								children: copied ? t("exportCopied") : t("exportCopy")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: download,
								children: t("exportDownload")
							})]
						})
					] })
				]
			});
		}
		function ServersCard({ status, loading, error, reload, call, t, onEdit }) {
			const servers = status?.servers ?? [];
			const connected = servers.filter((server) => server.status === "connected").length;
			const [exporting, setExporting] = react.useState(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("listTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "mcpc-actions",
					children: [servers.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: exporting,
						onClick: () => setExporting(true),
						children: t("export")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: loading,
						onClick: () => reload(),
						children: loading ? t("refreshing") : t("refresh")
					})]
				}),
				children: [
					exporting && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExportPanel, {
						call,
						t,
						onClose: () => setExporting(false)
					}),
					servers.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "mcpc-meta",
						children: fill(t("listCount"), {
							count: servers.length,
							connected
						})
					}),
					status !== void 0 && status.manageable === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("noManager")
					}),
					status !== void 0 && servers.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("listEmpty")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mcpc-list",
						children: servers.map((server) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerRow, {
							server,
							call,
							t,
							onChanged: reload,
							onEdit
						}, server.entryId))
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-error",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		/** What the quick-add field was recognised as, or undefined while it is not a source. */
		function recognised(text) {
			if (text.trim() === "") return void 0;
			try {
				return classifySource(text);
			} catch {
				return null;
			}
		}
		function QuickAddCard({ call, t, openSession, sessionsAvailable, choices, model, setModel }) {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("addTitle"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("addIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: "mcpc-add",
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
										required: true,
										spellCheck: false,
										placeholder: t("addSourcePlaceholder"),
										value: source,
										onChange: (event) => setSource(event.target.value)
									}),
									kind === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-meta",
										children: t("addSourceHint")
									}),
									kind === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-warn",
										children: t("addSourceUnknown")
									}),
									kind && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "mcpc-recognised",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-chip",
											"data-tone": "info",
											children: t(`kind_${kind.kind}`)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-mono",
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
									className: "mcpc-textarea",
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "mcpc-split",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: busy || !kind || !sessionsAvailable,
									children: busy ? t("addStarting") : t("addStart")
								})
							})
						]
					}),
					!sessionsAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("noSessions")
					}),
					done && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("addOpened")
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-error",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		function Group({ title, items, render }) {
			if (!Array.isArray(items) || items.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mcpc-group",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "mcpc-label",
					children: `${title} (${items.length})`
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: items.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: render(item) }, index)) })]
			});
		}
		/** MCP servers configured in other clients, each importable in one step. */
		function ClientServers({ servers, existing, call, t, onImported }) {
			const [state, setState] = react.useState({});
			const [all, setAll] = react.useState(false);
			const rows = react.useMemo(() => groupClientServers(servers), [servers]);
			if (rows.length === 0) return null;
			const importOne = (row) => {
				setState((current) => ({
					...current,
					[row.key]: { busy: true }
				}));
				return call("servers/import", {
					client: row.clients[0],
					name: row.name
				}).then((result) => {
					setState((current) => ({
						...current,
						[row.key]: { done: result }
					}));
					return onImported();
				}).catch((failure) => setState((current) => ({
					...current,
					[row.key]: { error: clearMessage(failure) }
				})));
			};
			const pending = rows.filter((row) => !existing.includes(row.name) && state[row.key]?.done === void 0);
			const importAll = async () => {
				setAll(true);
				for (const row of pending) await importOne(row);
				setAll(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mcpc-imports",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "mcpc-imports-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-label",
								children: t("scanClients")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mcpc-meta",
								children: fill(t("importCount"), { count: rows.length })
							}),
							pending.length > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								disabled: all,
								onClick: () => {
									importAll();
								},
								children: all ? t("importing") : fill(t("importAll"), { count: pending.length })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-meta",
						children: t("importIntro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "mcpc-import-list",
						children: rows.map((row) => {
							const entry = state[row.key] ?? {};
							const present = existing.includes(row.name);
							const line = launchLine(row);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: "mcpc-import-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "mcpc-import-main",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "mcpc-import-title",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mcpc-import-name",
													children: row.name
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mcpc-tag",
													children: row.command ? "stdio" : "http"
												}),
												row.clients.map((client) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mcpc-tag mcpc-tag-soft",
													children: client
												}, client)),
												present && entry.done === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mcpc-chip",
													"data-tone": "neutral",
													children: t("importPresent")
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-import-cmd",
											title: line,
											children: line
										}),
										entry.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mcpc-error",
											children: entry.error
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "mcpc-import-action",
									children: entry.done ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "mcpc-chip",
										"data-tone": "success",
										children: entry.done.application === "restart-required" ? t("importedRestart") : fill(t("imported"), { name: entry.done.serverName })
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: present ? void 0 : "primary",
										disabled: entry.busy === true || all,
										onClick: () => {
											importOne(row);
										},
										children: entry.busy ? t("importing") : present ? t("importAgain") : t("import")
									})
								})]
							}, row.key);
						})
					})
				]
			});
		}
		function ScanCard({ call, t, openSession, sessionsAvailable, choices, model, setModel, existing, onImported }) {
			const [scan, setScan] = react.useState();
			const [busy, setBusy] = react.useState(false);
			const [analyzing, setAnalyzing] = react.useState(false);
			const [error, setError] = react.useState();
			react.useEffect(() => {
				let live = true;
				call("scan/last").then((saved) => {
					if (live && saved) setScan((current) => current ?? saved);
				}).catch(() => void 0);
				return () => {
					live = false;
				};
			}, [call]);
			const start = () => {
				setBusy(true);
				setError(void 0);
				call("scan").then(setScan).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const analyze = () => {
				setAnalyzing(true);
				setError(void 0);
				call("scan/analyze", {
					locale: t("lang"),
					...model === void 0 ? {} : { model }
				}).then((result) => openSession(result.sessionId)).catch((failure) => setError(clearMessage(failure))).finally(() => setAnalyzing(false));
			};
			const clientServers = (scan?.clients ?? []).flatMap((client) => client.servers.map((server) => ({
				...server,
				client: client.client
			})));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("scanTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					disabled: busy,
					onClick: start,
					children: busy ? t("scanning") : scan === void 0 ? t("scanStart") : t("scanAgain")
				}),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-note",
						children: t("scanIntro")
					}),
					scan !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-meta",
							children: fill(t("scanAt"), { time: new Date(scan.scannedAt).toLocaleString() })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-meta",
							children: fill(t("scanSummary"), {
								apps: scan.apps.length,
								services: scan.services.length,
								processes: scan.processes.length,
								ports: scan.ports.length,
								containers: scan.containers.length,
								clients: scan.clients.length
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClientServers, {
							servers: clientServers,
							existing,
							call,
							t,
							onImported
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mcpc-columns",
							children: [
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
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-note",
							children: t("scanPrivacy")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelPicker, {
							choices,
							value: model,
							onChange: setModel,
							disabled: analyzing,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "mcpc-split",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "primary",
								size: "md",
								disabled: analyzing || !sessionsAvailable,
								onClick: analyze,
								children: analyzing ? t("scanAnalyzing") : t("scanAnalyze")
							})
						})
					] }),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "mcpc-error",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		function ConsolePage({ rpc, t, openSession }) {
			const call = react.useMemo(() => channelCaller(rpc), [rpc]);
			const [status, setStatus] = react.useState();
			const [loading, setLoading] = react.useState(false);
			const [error, setError] = react.useState();
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
			const [draft, setDraft] = react.useState({
				key: 0,
				mode: "add"
			});
			const manualRef = react.useRef(null);
			const showDraft = (next) => {
				setDraft((current) => ({
					...next,
					key: current.key + 1
				}));
				window.setTimeout(() => manualRef.current?.scrollIntoView?.({
					behavior: "smooth",
					block: "start"
				}), 50);
			};
			const fillFromRegistry = (form, origin) => showDraft({
				mode: "add",
				form,
				origin
			});
			const editServer = (server) => call("servers/config", { entryId: server.entryId }).then((result) => {
				if (!result.editable) return fill(t("editUnavailable"), { reason: result.reason ?? "" });
				showDraft({
					mode: "edit",
					form: result.form,
					entryId: server.entryId
				});
			}).catch((failure) => clearMessage(failure));
			const draftSaved = () => {
				if (draft.mode === "edit") setDraft((current) => ({
					key: current.key + 1,
					mode: "add"
				}));
				return reload();
			};
			const sessionsAvailable = status?.sessions !== false;
			const existing = (status?.servers ?? []).map((server) => server.name);
			const ai = {
				choices,
				model,
				setModel
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mcpc-page",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mcpc",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
							className: "mcpc-header",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: "mcpc-h1",
								children: t("title")
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-intro",
							children: t("intro")
						}),
						status !== void 0 && status.version !== CLIENT_VERSION && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mcpc-warn",
							role: "alert",
							children: fill(t("restartNeeded"), {
								page: CLIENT_VERSION,
								host: status.version ?? "?"
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServersCard, {
							status,
							loading,
							error,
							reload,
							call,
							t,
							onEdit: editServer
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RegistryCard, {
							call,
							t,
							runtimes,
							existing,
							onFill: fillFromRegistry
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ManualAddCard, {
							draft,
							call,
							t,
							runtimes,
							onSaved: draftSaved,
							onCancel: () => setDraft((current) => ({
								key: current.key + 1,
								mode: "add"
							})),
							cardRef: manualRef
						}, draft.key),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuickAddCard, {
							call,
							t,
							openSession,
							sessionsAvailable,
							...ai
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScanCard, {
							call,
							t,
							openSession,
							sessionsAvailable,
							...ai,
							existing,
							onImported: reload
						})
					]
				})
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
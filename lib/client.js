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
			intro: "管理当前 profile 的 MCP 服务器：查看连接状态、启用或禁用、用 AI 从开源仓库安装，或检索本机可以接入的软件。",
			refresh: "刷新",
			refreshing: "刷新中…",
			error: "出错了",
			restartNeeded: "MCP 管理已更新到 v{page}，但 DSH 后台还在运行旧版本 v{host}。请完全退出 DSH（包括托盘图标）再重新打开，否则部分功能不可用。",
			listTitle: "已配置的 MCP",
			listEmpty: "当前 profile 还没有配置 MCP 服务器。可以用下面的「AI 快捷添加」从开源仓库安装一个。",
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
			addIntro: "填一个 MCP 服务器的开源仓库地址，插件会在默认工作区开一个新会话，让 AI 阅读仓库、安装并接入。会话以创作模式运行，每一步安装都会先征求你的同意。",
			addUrl: "仓库地址",
			addNotes: "补充说明（可选）",
			addNotesPlaceholder: "例如：用 Docker 运行；只读模式；需要的 API Key 我已经放在环境变量 XXX 里",
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
			intro: "Manage the MCP servers of this profile: see their status, switch them on and off, install one from an open-source repository with AI, or find local software that can be connected.",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			error: "Error",
			restartNeeded: "MCP Console was updated to v{page}, but the DSH host still runs v{host}. Fully quit DSH (including the tray icon) and reopen it; some features are unavailable until then.",
			listTitle: "Configured MCP servers",
			listEmpty: "This profile has no MCP server yet. Use AI quick add below to install one from a repository.",
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
			addIntro: "Enter the repository of an MCP server. A new session opens in the default workspace and the AI reads the repository, installs it, and connects it. The session runs in Creator mode and asks before every install step.",
			addUrl: "Repository URL",
			addNotes: "Notes (optional)",
			addNotesPlaceholder: "e.g. run it with Docker; read-only mode; the API key is in the environment variable XXX",
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
		const CLIENT_VERSION = "0.1.6";
		const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => values[name] === void 0 ? match : String(values[name]));
		function channelCaller(rpc) {
			return (endpoint, payload = {}, signal) => rpc.call(CHANNEL, endpoint, payload, signal).then((response) => {
				if (!response?.ok) throw new Error(response?.error?.message ?? "MCP console request failed");
				return response.value;
			});
		}
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
		function ServerRow({ server, call, t, onChanged }) {
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
		function ServersCard({ status, loading, error, reload, call, t }) {
			const servers = status?.servers ?? [];
			const connected = servers.filter((server) => server.status === "connected").length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("listTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					disabled: loading,
					onClick: () => reload(),
					children: loading ? t("refreshing") : t("refresh")
				}),
				children: [
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
							onChanged: reload
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
		function QuickAddCard({ call, t, openSession, sessionsAvailable, choices, model, setModel }) {
			const [url, setUrl] = react.useState("");
			const [notes, setNotes] = react.useState("");
			const [busy, setBusy] = react.useState(false);
			const [done, setDone] = react.useState(false);
			const [error, setError] = react.useState();
			const start = (event) => {
				event.preventDefault();
				setBusy(true);
				setError(void 0);
				setDone(false);
				call("quick-add", {
					repositoryUrl: url,
					notes,
					locale: t("lang"),
					...model === void 0 ? {} : { model }
				}).then((result) => {
					setDone(true);
					setUrl("");
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mcpc-label",
									children: t("addUrl")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mcpc-input",
									type: "url",
									required: true,
									placeholder: t("repositoryPlaceholder"),
									value: url,
									onChange: (event) => setUrl(event.target.value)
								})]
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
									disabled: busy || url.trim() === "" || !sessionsAvailable,
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
			const rows = react.useMemo(() => groupClientServers(servers), [servers]);
			if (rows.length === 0) return null;
			const importOne = (row) => {
				setState((current) => ({
					...current,
					[row.key]: { busy: true }
				}));
				call("servers/import", {
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mcpc-imports",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "mcpc-imports-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-label",
							children: t("scanClients")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mcpc-meta",
							children: fill(t("importCount"), { count: rows.length })
						})]
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
										disabled: entry.busy === true,
										onClick: () => importOne(row),
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
			const sessionsAvailable = status?.sessions !== false;
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
							t
						}),
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
							existing: (status?.servers ?? []).map((server) => server.name),
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
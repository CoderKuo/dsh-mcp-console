<div align="center">

<img src="docs/assets/icon.png" width="120" height="120" alt="MCP 管理">

# DSH MCP 管理（dsh-mcp-console）

**简体中文** · [English](README.en.md)

**在 DeepSeek Harness 里集中管理 MCP 服务器：看状态、一键启停、让 AI 安装或手动添加、自动发现本机可接入的软件。**

</div>

## 功能

| 能力 | 说明 |
| --- | --- |
| **MCP 列表** | 侧栏新增「MCP」入口，列出当前 profile 配置的全部 MCP 服务器：名称、连接状态、传输方式、启动命令或地址、环境变量名、提供的工具、开源地址 |
| **启用 / 禁用** | 每个服务器一个开关，通过 DSH 官方插件管理器写入 profile 并立即生效，不用重启 |
| **删除** | AI 安装或导入的服务器可以一键删除：通过官方插件管理器卸载插件包，并清理它在 `mcp-bundles` 目录里的配置文件（目录外的文件一律不碰） |
| **一键导入** | 扫描到的其他客户端（Claude Desktop、Claude Code、Cursor、VS Code、Windsurf、Codex）里的 MCP，可以直接导入，不经过 AI |
| **实时刷新** | 服务器连上、断开、启停时页面自动更新，不靠定时轮询 |
| **AI 快捷添加** | 填 MCP 服务器的来源（代码仓库、npm/PyPI 包名、Docker 镜像、README 里的启动命令或任意网页链接，可加补充说明），插件在默认工作区开一个新会话，让 AI 查清运行方式、安装、写好配置并接入，全程每一步安装都会先征求你同意 |
| **手动添加** | 已经知道怎么运行时直接填：本地命令（如 `npx -y 包名`、`uvx 包名`、`docker run -i --rm 镜像`）或远程服务地址，不经过 AI；添加前先在本机测试连接；密钥可以只写「读取哪个环境变量」，不保存明文；只支持 SSE 或需要 OAuth 登录的服务可以通过 mcp-remote 桥接 |
| **搜索 MCP 目录** | 从官方 MCP 目录搜索，选中后自动填好手动添加的表单（命令、环境变量、请求头） |
| **编辑 / 导出** | 插件生成或 AI 安装的服务器可以用表单编辑；全部服务器可以导出成其他客户端通用的 `mcpServers` JSON（不含密钥） |
| **选择供应商和模型** | AI 快捷添加和联网分析都可以像模型选择器一样选供应商和模型，只对这次打开的会话生效，不改动你的默认模型 |
| **发现本机可接入的服务** | 扫描本机已安装的应用、后台服务、监听端口、Docker 容器，以及 Claude Desktop / Claude Code / Cursor / VS Code / Windsurf / Codex 里已经配置的 MCP；确认后交给 AI 联网检索哪些有 MCP 服务器，再问你要接入哪些 |
| **不泄露密钥** | 页面只显示环境变量和请求头的**名字**，参数里像密钥的值会被打码；扫描清单不含文件路径 |

## 安装

在桌面应用的**插件**页点**添加插件**，**安装源**选**官方源**，填入：

```text
dsh-mcp-console
```

安装后侧栏会出现「MCP」入口。新版本发布后 24 小时内按包名安装会被 DSH 的包管理器拒绝，可以改填 GitHub Release 的安装包地址：

```text
https://github.com/CoderKuo/dsh-mcp-console/releases/latest/download/dsh-mcp-console.tgz
```

## 使用说明

### 状态是怎么判断的

DSH 的 MCP 客户端（`@deepseek-ai/dsh-mcp-client`）不对外提供连接状态，插件按能观察到的信息判断：

| 状态 | 含义 |
| --- | --- |
| 已连接 | 正在运行，并且已经注册了 `mcp__<名称>__*` 工具 |
| 连接中 | 正在启动，或已运行但还没有工具（也可能首次连接失败、或服务器本身不提供工具，详见 DSH 日志） |
| 失败 | 加载失败（服务器配置了 `failOnStartupError: true` 时才会出现） |
| 已禁用 | 在 profile 里被关掉了 |

### 启用和禁用

开关调用 DSH 官方插件管理器的 `setPluginEnabled`，它会在 profile 的 `cordis.patch.yml` 里写 `disabled: true/false` 并立即生效。由插件包内置、或在别的配置层定义的服务器不能在这里切换，开关会显示原因。

### 页面结构

侧栏「MCP」打开后有三个标签：

- **已安装**：每个服务器一行（状态点、名称、传输方式、工具数、开关、`⋯` 菜单），失败的排在最前并直接展开报错；点一行看配置、工具和来源。编辑、设置开源地址、删除在 `⋯` 菜单里，导出和刷新在右上角。
- **添加**：先选来源（搜索官方目录、手动填写、让 AI 安装、从其他客户端导入），再在下方完成。目录和手动用同一张表单，工作目录和 mcp-remote 桥接收在「高级选项」里。
- **发现**：扫描本机的摘要和运行环境，各分组默认折叠；其他客户端里的 MCP 可以一键跳到导入；最后是交给 AI 联网分析。

编辑和导出从右侧抽屉打开。

### 日志和诊断

- 插件把每次操作（启停、删除、导入、添加、编辑、测试连接、目录搜索、扫描、打开 AI 会话）和出错原因写进 `<DSH_HOME>/storages/dsh-mcp-console/logs/`，每天一个文件，保留 7 天，总共不超过 5MB。环境变量和请求头只记名字，密钥一律打码。
- 「已安装」右上角的「诊断信息」会列出插件和 DSH 版本、运行环境、每个服务器的状态和最近的错误，点「复制诊断信息」就能直接发给开发者，也可以打开日志文件夹。

### AI 快捷添加

1. 填来源，可写补充说明（例如「用 Docker 运行」「API Key 在环境变量 XXX」）。可以填：
   - 代码仓库：`https://github.com/owner/project`（GitLab、Gitee、Codeberg、Bitbucket 也行），或简写 `owner/project`
   - npm 包：`@upstash/context7-mcp`、`npx -y @upstash/context7-mcp`、npmjs.com 的包页面
   - PyPI 包：`uvx mcp-server-time`、`pip install mcp-server-fetch`、pypi.org 的项目页面
   - Docker 镜像：`ghcr.io/github/github-mcp-server`、`mcp/fetch`、`docker run -i --rm …`、Docker Hub 页面
   - 任意网页：MCP 目录（registry.modelcontextprotocol.io、Smithery、mcp.so）的详情页，或远程 MCP 端点地址

   输入框下面会显示识别结果；给 AI 的提示会按类型写明优先用哪种方式运行。
2. 点「开始安装」，插件在**默认工作区**新开一个会话并切过去。会话使用**创作模式**（agent 预设 `cordis`），因为只有它带有安装插件包的 `plugin_manager` 工具。
3. AI 会按 DSH 官方推荐的方式接入：阅读仓库 → 选择运行方式 → 本机试运行 → 在 `~/.dsh/mcp-bundles/<名称>` 写一个只含配置的 bundle → 用 `plugin_manager install_bundle` 安装 → 验证工具可用。每一步安装都需要你批准。
4. 密钥不会写成明文，AI 会用 `!!js process.env.变量名` 引用，并告诉你要设置哪些环境变量。

### 手动添加

不经过 AI，几秒完成，不消耗模型额度。

- **本地命令**：整行填写启动命令，例如 `npx -y @upstash/context7-mcp`、`uvx mcp-server-time`、`docker run -i --rm mcp/fetch`。带空格的参数用引号；命令不经过 shell，管道、重定向不起作用。可以加环境变量和工作目录。
- **远程服务**：填 streamable-http 端点地址和请求头。只支持 SSE 的服务器不能接入。
- **密钥**：环境变量或请求头勾选「读环境变量」后，值一栏填变量名（如 `API_TOKEN`）或模板（如 `Bearer ${API_TOKEN}`），配置里写的是 `!!js` 表达式，不保存密钥本身。在系统里设置好环境变量后，需要完全退出并重新打开 DSH。
- 名称留空时按命令或地址自动起名。添加后和导入的一样，是 `mcp-bundles` 目录下的一个配置包，可以在列表里禁用、编辑或删除。
- **先测试再添加**：点「添加」会先在本机启动服务器（或连接远程地址）做一次 MCP 握手并列出工具，成功才安装；失败会显示原因和输出，也可以「仍然添加」。
- **环境变量和运行环境检查**：勾了「读环境变量」的行，DSH 读不到这个变量时会提示；命令要用的 `npx`、`uvx`、`docker` 等在 DSH 的 PATH 里找不到时也会提示。
- **mcp-remote 桥接**：勾选后用 `npx -y mcp-remote <地址>` 在本机连接远程服务，支持只有 SSE 的服务器和 OAuth 浏览器登录。

### 搜索 MCP 目录

在官方目录 registry.modelcontextprotocol.io 里按名称搜索。每个结果列出可用的运行方式（npm、PyPI、Docker 镜像、远程地址），点「填入」会把命令、环境变量（密钥默认设为读环境变量）、请求头填进手动添加的表单，检查、测试后再添加。目录地址可以在设置里改（`registryUrl`）。

### 编辑、导出、启停

- **编辑**：`mcp-bundles` 目录里、只包含一个 MCP 服务器的配置包（导入、手动添加、AI 安装的）可以点「编辑」。保存时先测试，再卸载并重新安装这个配置包；安装失败会自动恢复原配置。表单表示不了的 `!!js` 表达式会原样保留。
- **导出**：列表右上角「导出」，生成标准 `mcpServers` JSON，可复制或下载。密钥不会导出，会换成 `${变量名}` 占位。
- **启停**：插件包里的服务器如果不能单独切换，开关会改为启用或禁用整个插件包（只含 MCP 服务器的插件包才会这样做）。插件包关闭后服务器仍留在列表里，随时可以打开。

### 发现本机可接入的服务

1. 点「扫描本机」：只在本机读取信息，不会发给任何人。Windows 用一次 PowerShell 查询，macOS/Linux 用 `ps`、`lsof`/`ss`、`systemctl`、`/Applications`；系统组件会被过滤掉。
2. 页面列出扫描结果。确认后点「交给 AI 联网分析」，清单（不含路径和密钥）会作为消息发给你当前使用的模型，AI 联网检索后列出表格，并问你要接入哪些。确认的项目按上面同样的流程接入。

### 设置项

在 profile 的 `cordis.patch.yml` 里可以调整（行 id 为 `mcp-console`）：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `agentPreset` | `cordis` | AI 会话使用的 agent 预设 |
| `bundleDirectory` | 空（= `<DSH_HOME>/mcp-bundles`） | AI 写配置 bundle 的目录 |
| `scanTimeoutMs` | `20000` | 单个扫描命令的超时 |
| `repositories` | `{}` | 手动设置的开源地址，页面上编辑后自动保存 |

## 边界与安全

- 插件**不会**自己往 profile 里插入 MCP 配置，只通过官方插件管理器启停已有条目；新增一律由 AI 在你批准后用官方 `install_bundle` 完成。
- 扫描命令通过 DSH 的 `ctx.subprocess` 运行，使用其清洗过的环境变量并带超时。
- AI 会话里的提示词就是一条普通的用户消息，你看到的就是模型看到的。

## 本地开发

```sh
pnpm install
pnpm run check   # 测试 + 构建 + 打包到 .artifacts/
```

## License

[MIT](LICENSE)

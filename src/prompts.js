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

import { MAX_INVENTORY_CHARS } from './constants.js'

const SERVER_NAME_RULE = '[A-Za-z0-9_-]{1,32}'

/** The bundle procedure both flows end with, in the person's language. */
function bundleSteps(locale, { bundleDir, source }) {
  const link = source?.link === undefined ? '' : `"${source.kind === 'repository' ? 'repository' : 'homepage'}": "${source.link}", `
  if (locale === 'en') {
    return [
      `Create a configuration-only bundle directory under \`${bundleDir}\` (one directory per server, e.g. \`${bundleDir}/<serverName>\`) with:`,
      `   - \`package.json\`: \`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<one line>", ${link}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
      '   - `cordis.patch.yml` inserting one row: `- insert: [ { id: mcp-<serverName>, name: \'@deepseek-ai/dsh-mcp-client\', config: { serverName: <serverName>, transport: stdio | streamable-http, ... } } ]`',
      `   - \`serverName\` must match \`${SERVER_NAME_RULE}\` and must not clash with an existing server.`,
      '   - Never write a secret literally. Reference it as `!!js process.env.NAME` and tell me which environment variables to set.',
      'Install the bundle with the `plugin_manager` tool, action `install_bundle`, using the absolute directory path. Do not edit the profile\'s own `cordis.patch.yml` or `package.json`.',
      'Check that the result says `application: applied`, that tools named `mcp__<serverName>__*` appear, and call one harmless tool to prove it works.',
      'Finish with a short summary: server name, transport, the tools it offers, environment variables I still need to set, and that it can be switched off in the MCP Console page.',
    ]
  }
  return [
    `在 \`${bundleDir}\` 下创建一个只含配置的 bundle 目录（每个服务器一个目录，例如 \`${bundleDir}/<serverName>\`），包含：`,
    `   - \`package.json\`：\`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<一句话说明>", ${link}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
    '   - `cordis.patch.yml`，插入一行：`- insert: [ { id: mcp-<serverName>, name: \'@deepseek-ai/dsh-mcp-client\', config: { serverName: <serverName>, transport: stdio 或 streamable-http, ... } } ]`',
    `   - \`serverName\` 必须符合 \`${SERVER_NAME_RULE}\`，且不能和已有服务器重名。`,
    '   - 密钥绝不写明文，用 `!!js process.env.变量名` 引用，并告诉我需要设置哪些环境变量。',
    '用 `plugin_manager` 工具的 `install_bundle` 操作安装这个 bundle（传目录的绝对路径）。不要直接修改 profile 自己的 `cordis.patch.yml` 或 `package.json`。',
    '确认结果是 `application: applied`、出现了 `mcp__<serverName>__*` 工具，并调用一个无副作用的工具验证可用。',
    '最后简短总结：服务器名、传输方式、提供哪些工具、我还需要设置哪些环境变量，并说明可以在「MCP 管理」页面随时禁用。',
  ]
}

const numbered = lines => {
  let n = 0
  return lines.map(line => (line.startsWith('   ') ? line : `${++n}. ${line}`)).join('\n')
}

const existingLine = (locale, names) => {
  if (names.length === 0) return locale === 'en' ? 'No MCP server is configured yet.' : '当前还没有配置任何 MCP 服务器。'
  return locale === 'en' ? `Already configured MCP servers (do not reuse these names): ${names.join(', ')}.` : `已配置的 MCP 服务器（不要重名）：${names.join('、')}。`
}

/** How each kind of source is introduced, read, and run first. */
const SOURCE_STEPS = {
  repository: {
    en: v => [`Install the open-source MCP server at ${v} and connect it to this DeepSeek Harness profile.`,
      'Read the repository (README, docs, package manifest) and confirm it is an MCP server. Work out its transport (stdio or streamable-http), the command or URL that starts it, and the environment variables it needs. If it is not an MCP server, stop and tell me.',
      'Choose the simplest reliable way to run it: a no-install launcher (`npx -y`, `uvx`, a published Docker image) first; otherwise clone it into this workspace and build it.'],
    zh: v => [`请安装 ${v} 这个开源 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
      '阅读仓库（README、文档、包清单），确认它是 MCP 服务器，弄清传输方式（stdio 或 streamable-http）、启动命令或 URL、需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。',
      '选最简单可靠的运行方式：优先免安装启动（`npx -y`、`uvx`、已发布的 Docker 镜像）；否则克隆到当前工作区再构建。'],
  },
  npm: {
    en: v => [`Install the MCP server published as the npm package \`${v}\` and connect it to this DeepSeek Harness profile.`,
      'Read the package (its npm page, README, and source repository) and confirm it is an MCP server. Work out its transport, its arguments, and the environment variables it needs. If it is not an MCP server, stop and tell me.',
      `Run it with \`npx -y ${v}\` (Node.js must be installed; check \`node --version\`). Only fall back to another way when that cannot work.`],
    zh: v => [`请安装 npm 包 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
      '查看这个包（npm 页面、README、源码仓库），确认它是 MCP 服务器，弄清传输方式、启动参数和需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。',
      `用 \`npx -y ${v}\` 运行（需要已安装 Node.js，先用 \`node --version\` 确认）。只有这样行不通时才换别的方式。`],
  },
  pypi: {
    en: v => [`Install the MCP server published as the PyPI package \`${v}\` and connect it to this DeepSeek Harness profile.`,
      'Read the package (its PyPI page, README, and source repository) and confirm it is an MCP server. Work out its transport, its arguments, and the environment variables it needs. If it is not an MCP server, stop and tell me.',
      `Run it with \`uvx ${v}\` when uv is installed (check \`uvx --version\`); otherwise tell me and offer \`pipx run\` or a virtual environment with \`pip install\`.`],
    zh: v => [`请安装 PyPI 包 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
      '查看这个包（PyPI 页面、README、源码仓库），确认它是 MCP 服务器，弄清传输方式、启动参数和需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。',
      `已安装 uv 时用 \`uvx ${v}\` 运行（先用 \`uvx --version\` 确认）；没有的话告诉我，并给出 \`pipx run\` 或虚拟环境 \`pip install\` 的方案。`],
  },
  package: {
    en: v => [`Install the MCP server published as the package \`${v}\` and connect it to this DeepSeek Harness profile.`,
      `Find out whether \`${v}\` is an npm or a PyPI package (check both registries) and confirm it is an MCP server. Work out its transport, its arguments, and the environment variables it needs. If it is neither, or not an MCP server, stop and tell me.`,
      'Run an npm package with `npx -y <package>`, a PyPI package with `uvx <package>`; check that Node.js or uv is installed first.'],
    zh: v => [`请安装包 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
      `先查清 \`${v}\` 是 npm 包还是 PyPI 包（两个仓库都查），并确认它是 MCP 服务器，弄清传输方式、启动参数和需要的环境变量。都找不到或不是 MCP 服务器，就停下来告诉我。`,
      'npm 包用 `npx -y <包名>` 运行，PyPI 包用 `uvx <包名>` 运行；先确认已安装 Node.js 或 uv。'],
  },
  docker: {
    en: v => [`Install the MCP server from the Docker image or command \`${v}\` and connect it to this DeepSeek Harness profile.`,
      "Read the image's documentation (Docker Hub page, README, source repository) and confirm it is an MCP server. Work out its transport, the options it needs, and its environment variables. If it is not an MCP server, stop and tell me.",
      'Run it with `docker run -i --rm <image>` for stdio (keep `-i`; pass each variable with `-e NAME` and set it in the config `env`). Check that Docker is installed and running first (`docker version`).'],
    zh: v => [`请安装 Docker 镜像或命令 \`${v}\` 提供的 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
      '查看这个镜像的文档（Docker Hub 页面、README、源码仓库），确认它是 MCP 服务器，弄清传输方式、需要的参数和环境变量。如果它不是 MCP 服务器，就停下来告诉我。',
      'stdio 方式用 `docker run -i --rm <镜像>` 运行（必须带 `-i`；环境变量用 `-e 变量名` 传入，并写进配置的 `env`）。先用 `docker version` 确认 Docker 已安装并在运行。'],
  },
  url: {
    en: v => [`Connect the MCP server described at ${v} to this DeepSeek Harness profile.`,
      'Find out what this link is. If it is a remote MCP endpoint, connect it directly with `transport: streamable-http` (SSE-only servers are not supported) and work out the headers it needs, such as an API key. If it is a web page (a README, a registry or directory entry, documentation), read it and work out how the server runs: transport, command or URL, and environment variables. If there is no MCP server, stop and tell me.',
      'For a local server choose the simplest reliable way to run it: `npx -y`, `uvx`, or a published Docker image first; otherwise clone it into this workspace and build it.'],
    zh: v => [`请把 ${v} 对应的 MCP 服务器接入当前 DeepSeek Harness profile。`,
      '先判断这个链接是什么：如果是远程 MCP 端点，直接用 `transport: streamable-http` 接入（只支持 SSE 的服务器不能接），弄清需要的请求头（如 API Key）；如果是网页（README、MCP 目录/注册表详情页、文档），阅读它，弄清服务器怎么运行：传输方式、启动命令或 URL、环境变量。找不到 MCP 服务器就停下来告诉我。',
      '本地运行的服务器选最简单可靠的方式：优先 `npx -y`、`uvx` 或已发布的 Docker 镜像；否则克隆到当前工作区再构建。'],
  },
}

/**
 * The prompt for installing and connecting an MCP server.
 * @param options - the source (from `classifySource`; a bare
 *   `repositoryUrl` is taken as a repository), the person's notes, the
 *   configured server names, where bundles go, and the UI locale (`zh` | `en`).
 * @returns the prompt text.
 */
export function quickAddPrompt({ source, repositoryUrl, notes, existingNames = [], bundleDir, locale = 'zh' }) {
  const from = source ?? { kind: 'repository', value: repositoryUrl, link: repositoryUrl }
  const lang = locale === 'en' ? 'en' : 'zh'
  const [intro, read, run] = (SOURCE_STEPS[from.kind] ?? SOURCE_STEPS.url)[lang](from.value)
  const extra = typeof notes === 'string' && notes.trim() !== '' ? notes.trim().slice(0, 2000) : ''
  const confirm = lang === 'en'
    ? 'Tell me what you are about to run before any install command, and do not run install scripts I have not seen.'
    : '执行任何安装命令前先告诉我要运行什么，不要运行我没看过的安装脚本。'
  const tryIt = lang === 'en'
    ? 'Start it once locally to confirm it launches (for a remote endpoint, check that it answers).'
    : '在本机先启动一次，确认能正常运行（远程端点则确认能连通）。'
  return [
    intro,
    '',
    existingLine(lang, existingNames),
    ...(extra === '' ? [] : ['', lang === 'en' ? `My notes: ${extra}` : `我的补充说明：${extra}`]),
    '',
    numbered([read, `${run} ${confirm}`, tryIt, ...bundleSteps(lang, { bundleDir, source: from })]),
  ].join('\n')
}

/**
 * The prompt for researching what the local inventory could connect.
 * @param options - the inventory text, the configured server names, where
 *   bundles go, and the UI locale.
 * @returns the prompt text.
 */
export function discoveryPrompt({ inventory, existingNames = [], bundleDir, locale = 'zh' }) {
  const text = typeof inventory === 'string' ? inventory.slice(0, MAX_INVENTORY_CHARS) : ''
  const truncated = typeof inventory === 'string' && inventory.length > MAX_INVENTORY_CHARS
  if (locale === 'en') {
    return [
      'Below is an inventory of software and background services found on my computer, plus MCP servers already configured in other AI clients. Find what could be connected to DeepSeek Harness through MCP.',
      '',
      existingLine('en', existingNames),
      '',
      numbered([
        'For each item that plausibly has an MCP server (official, or a well-maintained community one), search the web to confirm it. Skip system components and anything without a credible MCP server.',
        'Report a table: software | evidence on this computer | MCP server (link) | transport / how it connects | confidence. Put the MCP servers configured in other clients in a separate list; they can be imported as they are.',
        'Do not install or change anything yet. Ask me which ones to connect.',
        'For each one I confirm, follow this procedure:',
        ...bundleSteps('en', { bundleDir }),
      ]),
      '',
      `Inventory${truncated ? ' (truncated)' : ''}:`,
      '```text',
      text,
      '```',
    ].join('\n')
  }
  return [
    '下面是在我电脑上找到的软件和后台服务清单，以及其他 AI 客户端里已经配置的 MCP 服务器。请找出哪些可以通过 MCP 接入 DeepSeek Harness。',
    '',
    existingLine('zh', existingNames),
    '',
    numbered([
      '对可能有 MCP 服务器的条目（官方的，或维护良好的社区项目）联网检索确认。系统组件、找不到可信 MCP 服务器的条目直接跳过。',
      '用表格汇报：软件 | 本机检测依据 | MCP 服务器（链接）| 传输方式/接入方式 | 可信度。其他客户端里已配置的 MCP 服务器单独列出，它们可以直接照搬接入。',
      '先不要安装或修改任何东西，问我要接入哪些。',
      '我确认要接入的，按下面的流程做：',
      ...bundleSteps('zh', { bundleDir }),
    ]),
    '',
    `清单${truncated ? '（已截断）' : ''}：`,
    '```text',
    text,
    '```',
  ].join('\n')
}

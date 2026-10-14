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
function bundleSteps(locale, { bundleDir, repositoryUrl }) {
  const repo = repositoryUrl === undefined ? '' : repositoryUrl
  if (locale === 'en') {
    return [
      `Create a configuration-only bundle directory under \`${bundleDir}\` (one directory per server, e.g. \`${bundleDir}/<serverName>\`) with:`,
      `   - \`package.json\`: \`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<one line>", ${repo === '' ? '' : `"repository": "${repo}", `}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
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
    `   - \`package.json\`：\`{ "name": "@local/mcp-<serverName>", "version": "0.1.0", "private": true, "description": "<一句话说明>", ${repo === '' ? '' : `"repository": "${repo}", `}"dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }\``,
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

/**
 * The prompt for installing and connecting an MCP server from a repository.
 * @param options - the repository URL, the person's notes, the configured
 *   server names, where bundles go, and the UI locale (`zh` | `en`).
 * @returns the prompt text.
 */
export function quickAddPrompt({ repositoryUrl, notes, existingNames = [], bundleDir, locale = 'zh' }) {
  const extra = typeof notes === 'string' && notes.trim() !== '' ? notes.trim().slice(0, 2000) : ''
  if (locale === 'en') {
    return [
      `Install the open-source MCP server at ${repositoryUrl} and connect it to this DeepSeek Harness profile.`,
      '',
      existingLine('en', existingNames),
      ...(extra === '' ? [] : ['', `My notes: ${extra}`]),
      '',
      numbered([
        'Read the repository (README, docs, package manifest) and confirm it is an MCP server. Work out its transport (stdio or streamable-http), the command or URL that starts it, and the environment variables it needs. If it is not an MCP server, stop and tell me.',
        'Choose the simplest reliable way to run it: a no-install launcher (`npx -y`, `uvx`, a published Docker image) first; otherwise clone it into this workspace and build it. Tell me what you are about to run before any install command, and do not run install scripts I have not seen.',
        'Start it once locally to confirm it launches.',
        ...bundleSteps('en', { bundleDir, repositoryUrl }),
      ]),
    ].join('\n')
  }
  return [
    `请安装 ${repositoryUrl} 这个开源 MCP 服务器，并把它接入当前 DeepSeek Harness profile。`,
    '',
    existingLine('zh', existingNames),
    ...(extra === '' ? [] : ['', `我的补充说明：${extra}`]),
    '',
    numbered([
      '阅读仓库（README、文档、包清单），确认它是 MCP 服务器，弄清传输方式（stdio 或 streamable-http）、启动命令或 URL、需要的环境变量。如果它不是 MCP 服务器，就停下来告诉我。',
      '选最简单可靠的运行方式：优先免安装启动（`npx -y`、`uvx`、已发布的 Docker 镜像）；否则克隆到当前工作区再构建。执行任何安装命令前先告诉我要运行什么，不要运行我没看过的安装脚本。',
      '在本机先启动一次，确认能正常运行。',
      ...bundleSteps('zh', { bundleDir, repositoryUrl }),
    ]),
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
        ...bundleSteps('en', { bundleDir, repositoryUrl: undefined }),
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
      ...bundleSteps('zh', { bundleDir, repositoryUrl: undefined }),
    ]),
    '',
    `清单${truncated ? '（已截断）' : ''}：`,
    '```text',
    text,
    '```',
  ].join('\n')
}

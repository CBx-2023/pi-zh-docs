# 设置参考

本参考列出用户可配置的设置、类型、默认值及用途。项目设置覆盖智能体目录中的设置，资源列表则会合并。文件位置与信任行为见[配置](configuration.md)。

在 `settings.json` 中添加 `"$schema": "https://pi.dev/schemas/settings.schema.json"`，即可获得编辑器校验与补全。

## 模型与思考

<a id="model-cycling"></a>

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultProvider` | string | 自动 | 启动时使用的 AI 提供商。 |
| `defaultModel` | string | 自动 | 启动时使用的模型 ID。 |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | `"medium"` | 启动时使用的思考级别。 |
| `modelThinkingLevels` | object | 无 | 各模型启动时的思考级别，键为精确的 `provider/modelId`。 |
| `thinkingBudgets` | object | 内置预算 | `minimal`、`low`、`medium` 和 `high` 思考级别的 Token 预算。 |
| `enabledModels` | `string[]` | 全部可用模型 | 用于启动选择和模型循环切换的模型模式，格式与 `--models` 相同。 |
| `hideThinkingBlock` | boolean | `false` | 在对话记录中隐藏思考块。 |
| `showCacheMissNotices` | boolean | `false` | 显示显著缓存未命中、缓存保温成功、压缩用量和提供商恢复的通知。 |
| `cacheWarming` | `"off" \| "streaming" \| "idle"` | `"streaming"` | 在活动运行期间为符合条件的提供商提示缓存保温；设为 `"idle"` 时，也会在两次运行之间保温。仅限全局设置。 |

只有模型声明了缓存寿命，且 Pi 估计可避免至少 0.05 美元的缓存未命中费用时，才会执行缓存保温。刷新的用量计入会话总量，但不进入模型上下文。`/session` 显示下一次决定；扩展可以通过 `cache_warming_decision` 覆盖。见[提示缓存寿命](models.md#prompt-cache-lifetimes)。

模型选择和思考控制见[选择模型](models.md)。

## 交互

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | 排队的引导消息如何送达。 |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | 排队的后续消息如何送达。 |
| `externalEditor` | string | `$VISUAL`, `$EDITOR`, 然后使用平台默认值 | 外部编辑器快捷键打开的命令。 |
| `doubleEscapeAction` | `"tree" \| "fork" \| "none"` | `"tree"` | 编辑器为空时，连按两次 Escape 执行的操作。 |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` 初始使用的过滤器。 |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | 项目信任的回退行为。**只能在智能体目录的设置中配置。** |

## 工具

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `defaultTools` | `string[]` | `read`, `bash`, `edit`, `write` | 启动时启用的工具。普通名称替换默认值；`+name` 添加工具，`-name` 移除工具。空数组禁用全部内置工具，但不禁用扩展或 SDK 工具。 |
| `codemode.mode` | `"on"` \| `"only"` | `"on"` | `codemode` 工具启用时如何呈现工具。`on`：已声明工具的描述追加从脚本调用的说明，`codemode` 只列出未声明工具。`only`：`codemode` 列出脚本可调用的每个工具，活动的内置和扩展工具对模型隐藏，模型通过 `codemode` 访问它们。 |
| `codemode.inlineBudget` | number | `3000` | `codemode` 工具描述可用于工具声明的估算 Token 数，按字符数除以 4 计算。放不下的工具会省略，可通过 `searchTools()` 查找。`0` 表示只列出命名空间。 |

可用内置工具有 `read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find` 和 `ls`。`defaultTools` 也可以指定由内置扩展注册为未激活的 `codemode` 和 `tool_search`，以及其他注册为未激活的扩展工具。

仅由 `+name` 和 `-name` 条目组成的列表会修改继承的选择，而不是替换它。例如，以下配置在默认工具之外启用 `codemode`：

```json
{
  "defaultTools": ["+codemode"]
}
```

以下配置用 `powershell` 替换 `bash`，并启用 `grep`：`["-bash", "+powershell", "+grep"]`。项目设置应用于用户设置之上：只含 `+name` 和 `-name` 条目的项目列表会修改用户选择，包含普通名称的项目列表则替换它。在同一个列表中，普通名称先形成选择，然后按顺序应用 `+name` 和 `-name`。

`/reload` 会启用新加入 `defaultTools` 的工具，但不会禁用从中移除的工具，也不会重新启用你已关闭且配置未变的工具。使用普通名称的 `--tools`、`--no-tools` 和 `--no-builtin-tools` 会覆盖 `defaultTools`，重新加载时也一样。

CLI 工具选项只为一次调用覆盖此设置。仅含 `+name` 和 `-name` 条目的 `--tools` 则修改解析后的 `defaultTools` 选择，例如 `pi --tools +codemode`。执行 `/reload` 时，这些条目也会应用于重新加载的设置，因此用 `-name` 移除的工具仍保持移除。见[命令行](cli.md#tools)。

## 会话与上下文

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `sessionDir` | string | 智能体会话目录 | 会话存储目录。相对路径基于工作目录解析。`PI_CODING_AGENT_SESSION_DIR` 和 `--session-dir` 会覆盖此设置。 |
| `sessionShareDestination` | `"auto" \| "gist" \| "radius"` | `"auto"` | `/share` 使用的目标。`auto` 在已通过身份验证时使用 Radius，否则创建 GitHub gist。`gist` 始终使用 gist。`radius` 要求 Radius 身份验证，且绝不回退到 gist。 |

### 上下文压缩

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `compaction.enabled` | boolean | `true` | 启用自动压缩。 |
| `compaction.reserveTokens` | number | `16384` | 可用上下文 Token 低于此值时开始自动压缩。 |
| `compaction.keepRecentTokens` | number | `20000` | 不经过摘要、直接保留的最近 Token 数。 |
| `compaction.modelOverrides` | object | 无 | 按模型配置的 Token 设置，键为精确的 `provider/modelId`。 |

<a id="per-model-compaction-overrides"></a>

压缩 Token 值必须为非负安全整数。每个值独立解析，依次优先使用匹配的模型覆盖配置、普通压缩设置和内置默认值。在查找模型之前，先合并项目和用户对象。

触发、摘要和校验行为见[上下文压缩参考](compaction.md)。

### 分支摘要

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `branchSummary.reserveTokens` | number | `16384` | 为总结分支历史预留的 Token 数。 |
| `branchSummary.skipPrompt` | boolean | `false` | 跳过分支摘要提示，默认不生成摘要。 |

## 终端与显示

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `theme` | string | `"system"` | 内置或自定义主题名称。`system` 根据终端主题推导颜色。 |
| `quietStartup` | boolean \| `"header"` | `false` | `true` 隐藏启动标题和已加载资源列表。`"header"` 保留标题，即版本和按键提示，但隐藏模型范围行和已加载资源列表。 |
| `tuiMode` | `"regular" \| "fullscreen"` | `"fullscreen"` | 交互式终端 UI 模式。 |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | 退出全屏模式时打印的输出。 |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | 全屏对话记录滚动条的行为。 |
| `fullscreenCopyOnSelect` | boolean | `true` | 在全屏模式中自动复制选中文本。 |
| `fullscreenWheelScrollLines` | `"auto"` \| number | `"auto"` | 全屏模式中每次鼠标滚轮事件滚动的行数，范围为 1 到 100。`"auto"` 在本地 macOS 终端中每次移动一行，因为终端已对滚轮和触控板输入加速；在其他环境和 SSH 上，会将快速滚轮输入加速至每次最多 6 行。Alt 加滚轮移动五倍距离。 |
| `editorPaddingX` | number | `0` | 编辑器的水平内边距，范围为 0 到 3 个字符单元。 |
| `outputPad` | `0 \| 1` | `1` | 消息、工具输出、`!` 命令输出和摘要块在对话记录中的水平内边距。 |
| `autocompleteMaxVisible` | number | `5` | 可见自动补全条目数，范围为 3 到 20。 |
| `showHardwareCursor` | boolean | `false` | 使用终端光标，而不是 Pi 绘制的光标。Pi 仍会为输入法定位光标。 |
| `terminal.showImages` | boolean | `true` | 支持时显示内联图像。 |
| `terminal.imageWidthCells` | number | `60` | 内联图像的期望宽度，以终端字符单元为单位。 |
| `terminal.clearOnShrink` | boolean | `false` | 渲染内容缩短时清空空白行。未设置时，`PI_CLEAR_ON_SHRINK=1` 可启用。 |
| `terminal.showTerminalProgress` | boolean | `false` | 在终端标签页显示 OSC 9;4 进度。 |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | 覆盖 OSC 8 超链接检测。 |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | 覆盖内联图像协议检测。 |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | 覆盖真彩色检测。 |
| `images.autoResize` | boolean | `true` | 向模型发送图像前，将其缩放到最多 2000 × 2000 像素。 |
| `images.blockImages` | boolean | `false` | 禁止向模型发送图像。 |
| `markdown.codeBlockIndent` | string | `"  "` | 渲染代码块时用于缩进的前缀。 |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid 渲染模式。 |

格式和平台细节见[主题](themes.md)与[终端配置](terminal-setup.md)。

## 网络与重试

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `transport` | `"auto" \| "sse" \| "websocket" \| "websocket-cached"` | `"auto"` | 支持多种传输方式的 AI 提供商优先使用的传输方式。 |
| `httpProxy` | string | 无 | 作为 `HTTP_PROXY` 和 `HTTPS_PROXY` 应用于 Pi 管理的 HTTP 客户端的代理 URL。**只能在智能体目录的设置中配置。** |
| `httpIdleTimeoutMs` | number \| `"disabled"` | `300000` | HTTP 头部和正文的空闲超时，单位毫秒。设为 `0` 或 `"disabled"` 可禁用。 |
| `websocketConnectTimeoutMs` | number \| `"disabled"` | `15000` | WebSocket 连接超时，单位毫秒。设为 `0` 或 `"disabled"` 可禁用。 |
| `retry.enabled` | boolean | `true` | 为暂时性故障启用智能体级自动重试。 |
| `retry.maxRetries` | number | `3` | 智能体级重试次数上限。 |
| `retry.baseDelayMs` | number | `2000` | 指数退避的初始延迟，单位毫秒。 |
| `retry.maxAgentDelayMs` | number | `60000` | 智能体级重试的最大延迟，单位毫秒。 |
| `retry.provider.timeoutMs` | number | `httpIdleTimeoutMs` | 提供商请求超时，单位毫秒。 |
| `retry.provider.maxRetries` | number | `0` | 提供商级重试次数。 |
| `retry.provider.maxRetryDelayMs` | number | `60000` | 服务器要求的最大等待时长，单位毫秒。设为 `0` 可禁用该限制。 |

除非确实需要提供商级重试，否则将 `retry.provider.maxRetries` 保持为 `0`。提供商重试可能延迟 Pi 自行处理配额和用量限制错误。

## Shell

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `shellPath` | string | 平台默认值 | 自定义 Shell 可执行文件路径，支持开头的 `~`。 |
| `shellCommandPrefix` | string | 无 | 每条 Shell 命令前追加的前缀。 |
| `npmCommand` | `string[]` | `npm` | 查询和安装 npm 软件包时使用的命令与参数。 |

Shell 配置见 [Shell 别名](shell-aliases.md)，包管理器行为见 [Pi 软件包](packages.md)。

## 资源

用户设置中的资源路径基于智能体目录解析，项目设置中的路径基于项目的 `.pi` 目录解析。支持绝对路径和 `~`。

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `packages` | array | `[]` | npm、git 或本地 Pi 软件包来源。见 [Pi 软件包](packages.md)。 |
| `extensions` | `string[]` | `[]` | 扩展文件或目录。 |
| `skills` | `string[]` | `[]` | 技能文件或目录。 |
| `prompts` | `string[]` | `[]` | 提示模板文件或目录。 |
| `themes` | `string[]` | `[]` | 主题文件或目录。 |
| `enableSkillCommands` | boolean | `true` | 将技能注册为 `/skill:name` 命令。 |

资源数组支持使用 `!pattern` 进行 glob 排除、`+path` 精确包含，以及 `-path` 精确排除。Pi 会加载用户级和项目设置中列出的资源。

内置扩展在 `extensions` 中的名称为 `builtin:mcp`、`builtin:llama.cpp`、`builtin:codemode` 和 `builtin:tool-search`。它们默认加载；`-builtin:mcp` 禁用其中一个。项目设置中的 `+builtin:<name>` 或 `-builtin:<name>` 条目覆盖用户设置。`pi config` 在 Built-in 下列出它们。`--no-extensions` 同样会禁用它们，`-e builtin:<name>` 则显式加载其中一个。

## 更新、遥测与警告

| 设置 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `collapseChangelog` | boolean | `false` | 更新后显示精简的变更日志。 |
| `enableInstallTelemetry` | boolean | `true` | 启用匿名安装／更新报告，以及选定提供商的归因请求头。不控制更新检查。 |
| `enableAnalytics` | boolean | `false` | 主动启用分析数据共享。目前仅供实验性的首次运行设置使用。 |
| `warnings.anthropicExtraUsage` | boolean | `true` | Anthropic 订阅身份验证可能使用付费额外用量时发出警告。 |

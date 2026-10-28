# 配置

Pi 支持用户级和项目级配置。用户级配置保存在智能体目录中，默认位置为 `~/.pi/agent`。项目配置位于工作目录下的 `.pi` 中，只有授予[项目信任](security.md#understand-project-trust)后才会加载。唯一的例外是 `sessionDir`：Pi 会在确定信任状态前读取它，以便查找会话。

交互模式下，可通过 `/settings` 修改常用偏好。其他选项可以让 Pi 更新配置，也可以直接编辑相关文件。手动修改设置、按键绑定、指令或资源后，请运行 `/reload`。

## 智能体目录

下文以 `<agent-dir>` 表示智能体目录。可以通过 `PI_CODING_AGENT_DIR` 环境变量或 SDK 的 [`agentDir`](sdk.md) 选项设置其位置。

| 路径 | 用途 |
|---|---|
| `<agent-dir>/settings.json` | 用户级[设置](settings.md)，包含偏好、默认值、资源路径和 Pi 包声明。 |
| `<agent-dir>/keybindings.json` | 自定义终端 UI 与应用的[按键绑定](keybindings.md)。 |
| `<agent-dir>/mcp.json` | 在所有项目中可用的 [MCP Server](mcp.md)。 |
| `<agent-dir>/models.json` | [兼容端点、模型与模型覆盖配置](models.md#configure-a-compatible-endpoint)。 |
| `<agent-dir>/auth.json` | 保存的 API Key 与 OAuth 凭据。 |
| `<agent-dir>/AGENTS.override.md`、`AGENTS.md`、`AGENTS.MD`、`CLAUDE.md` 或 `CLAUDE.MD` | 跨工作目录应用的用户指令。 |
| `<agent-dir>/SYSTEM.md` | 替换 Pi 的默认系统提示。 |
| `<agent-dir>/APPEND_SYSTEM.md` | 向 Pi 的系统提示追加指令。 |
| `<agent-dir>/extensions/` | 用户[扩展](extensions.md)。 |
| `<agent-dir>/skills/` | 用户[技能](skills.md)及其辅助文件。 |
| `<agent-dir>/prompts/` | 以斜杠命令形式提供的用户[提示模板](prompt-templates.md)。 |
| `<agent-dir>/themes/` | 用户[主题](themes.md)文件。 |

## 项目 `.pi` 目录

| 路径 | 用途 |
|---|---|
| `.pi/settings.json` | 项目级[设置](settings.md)、资源路径和 Pi 包声明。 |
| `.pi/mcp.json` | 项目 [MCP Server](mcp.md)。 |
| `.pi/SYSTEM.md` | 替换项目的系统提示。 |
| `.pi/APPEND_SYSTEM.md` | 向系统提示追加项目专用指令。 |
| `.pi/extensions/` | 项目扩展。 |
| `.pi/skills/` | 项目技能。 |
| `.pi/prompts/` | 以斜杠命令形式提供的项目提示模板。 |
| `.pi/themes/` | 项目主题。 |

对于 `SYSTEM.md` 和 `APPEND_SYSTEM.md`，受信任的项目文件优先于智能体目录中的同名文件。相同名称的文件不会合并。

## 上下文文件

上下文文件与项目 `.pi` 配置相互独立。Pi 从智能体目录、工作目录及其父目录加载这些文件。只要 Pi 在某个上下文文件所在目录或其子目录中运行，该文件就会生效。

`AGENTS.override.md` 仅替代同一目录中的 `AGENTS.md` 或 `CLAUDE.md`，不会屏蔽智能体目录或其他目录中的上下文文件。

发现上下文文件不需要项目信任。

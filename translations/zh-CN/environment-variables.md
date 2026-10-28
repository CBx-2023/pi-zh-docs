# 环境变量

Pi 以三种方式使用环境变量：

- `PI_OFFLINE` 等变量配置 Pi 进程。
- Pi 设置进程标记，使子进程能够识别 Pi 是启动它的智能体。
- 可由 LLM 调用的 Shell 工具所执行的命令，会收到描述当前会话的 `PI_*` 变量。

提供商 API Key 变量单独记录于[提供商](providers.md#use-an-api-key-from-the-environment)。

## 进程标记

CLI 和 RPC 入口会设置两个进程标记：

- `AI_AGENT=pi` 是通用标记，供其他工具识别 Pi 是启动该进程的智能体。
- `PI_CODING_AGENT=true` 是 Pi 专用标记，供子进程检测自己是否运行在 Pi 中。

子进程会继承这两个标记。它们不属于特定会话，通过 SDK 嵌入 Pi 时也不会自动设置。

## Shell 工具的会话环境

`bash` 和 `powershell` 工具运行的命令会收到当前 Pi 会话状态：

| 变量 | 说明 |
|----------|-------------|
| `PI_SESSION_ID` | 当前会话 ID |
| `PI_SESSION_FILE` | 当前会话 JSONL 文件的绝对路径；临时会话不设置 |
| `PI_PROVIDER` | 当前选中的模型提供商 |
| `PI_MODEL` | 当前选中的模型 ID |
| `PI_REASONING_LEVEL` | 当前实际生效的推理级别：`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` |

这些值在每条命令启动时解析。因此，切换模型或更改推理级别后，下一条 Shell 命令就会受到影响，无需重启 Pi。`PI_PROVIDER` 和 `PI_MODEL` 标识 Pi 选中的模型，而不是路由器内部可能选择的另一个上游模型。

当需要确认正在使用哪个模型或提供商时，应检查这些变量，而不是根据系统提示推断：

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

会话持久化时，可以直接检查会话文件：

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

这些变量注入可由 LLM 调用的 `bash` 和 `powershell` 工具，但不会注入用户输入的 `!` 或 `!!` 命令。

### 自定义 Shell 工具

通过 `createBashTool()` 或 `createPowerShellTool()` 创建的工具，在注册到 Pi 后默认暴露会话环境。注入发生在 `spawnHook` 之前，因此钩子可以在 `ctx.env` 中收到这些变量：

```typescript
const bashTool = createBashTool(cwd, {
  spawnHook: (ctx) => ({
    ...ctx,
    env: { ...ctx.env, CI: "1" },
  }),
});
```

会话元数据可以独立于生成进程的钩子关闭：

```typescript
const powershellTool = createPowerShellTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx,
});
```

关闭后，Pi 会移除继承的这些变量值，避免嵌套的 Pi 进程暴露过期的父会话元数据。

## Pi 进程配置

以下变量由 Pi 自身读取：

| 变量 | 说明 |
|----------|-------------|
| `PI_CODING_AGENT_DIR` | 覆盖配置目录；默认为 `~/.pi/agent` |
| `PI_CODING_AGENT_SESSION_DIR` | 覆盖会话存储位置；会被 `--session-dir` 覆盖 |
| `PI_PACKAGE_DIR` | 覆盖软件包目录，适用于 Nix/Guix 存储路径 |
| `PI_OFFLINE` | 禁用包括模型目录刷新在内的自动网络活动 |
| `PI_SKIP_VERSION_CHECK` | 禁用对 `pi.dev` 的最新版本请求 |
| `PI_TELEMETRY` | 覆盖安装／更新遥测及提供商归因请求头：`1`/`true`/`yes` 或 `0`/`false`/`no` |
| `PI_CODEMODE_MAX_WORKERS` | 进程内所有会话合计可同时存活的 codemode 工作线程数上限；默认为 `2`。每个线程中的脚本最多使用 256 MB 内存。一个进程运行多个会话，例如进程内子智能体时，可以提高此值。更多脚本等待空闲线程。见 [Codemode](codemode.md) |
| `PI_CACHE_RETENTION` | 设为 `long`，在支持的提供商上延长提示缓存 |
| `PI_SHARE_VIEWER_URL` | 覆盖 `/share` 使用的基础 URL |
| `PI_RADIUS_GATEWAY` | 覆盖 `/bug` 上传使用的 Radius 网关来源 |
| `PI_CLEAR_ON_SHRINK` | 设为 `1`，在渲染内容缩短时清空空白行；`terminal.clearOnShrink` 设置优先。见[设置](settings.md) |
| `PI_HARDWARE_CURSOR` | 设为 `1`，显示硬件光标；见[终端配置](terminal-setup.md) |
| `PI_CLIPBOARD_OSC52` | 设为 `1`，在写入本地剪贴板后，也通过 OSC 52 将复制的文本发送给终端，与 Pi 通过 SSH 运行时的行为相同。远程客户端访问 Pi 却没有 SSH 变量时可使用，例如从另一台机器连接的复用器，或远程 IDE 守护进程 |
| `PI_HYPERLINKS` | 使用 `1`、`0` 或 `auto` 覆盖 OSC 8 超链接检测 |
| `PI_PROGRAM_STATUS` | 覆盖 OSC 7501 程序状态检测：`1` 表示始终报告，`0` 表示从不报告；其他情况只在终端确认支持后报告。见[终端配置](terminal-setup.md#program-status) |
| `PI_IMAGE_PROTOCOL` | 使用 `kitty`、`iterm2`、`none` 或 `auto` 覆盖内联图像检测 |
| `PI_TRUE_COLOR` | 使用 `1`、`0` 或 `auto` 覆盖真彩色检测 |
| `PI_TUI_ESC_TIMEOUT` | 收到单独 ESC 后，等待多久才将其视为 Escape，单位毫秒；SSH 上默认为 `100`，其他情况为 `10`。Alt 组合键被误读为 Escape 时可提高此值 |
| `VISUAL`, `EDITOR` | 未设置 `externalEditor` 时使用的外部编辑器回退值 |
| `HTTP_PROXY`, `HTTPS_PROXY` | 为出站 HTTP 请求设置代理 |

`ANTHROPIC_API_KEY`、`OPENAI_API_KEY` 等提供商凭据和专用配置，见[提供商](providers.md#use-an-api-key-from-the-environment)。

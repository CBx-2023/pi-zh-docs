# RPC 模式

RPC 模式将 Pi 作为长期运行的子进程，通过 stdin 与 stdout 上的 JSON 记录控制它。适用于与语言无关的集成、进程隔离、IDE 和自定义用户界面。

对于进程内 Node.js 或 Bun 集成，优先使用 [SDK](sdk.md)。对于基于子进程的 TypeScript 集成，优先使用导出的 `RpcClient`，它负责启动 Pi、关联响应、提供类型化命令方法，并将事件交给监听器。

| 接口 | 进程边界 | 控制方式 | 最适合 |
|---|---|---|---|
| [SDK](sdk.md) | 进程内 | 直接使用 TypeScript 方法与事件 | 需要完整 API 访问能力的 Node.js 或 Bun 宿主 |
| RPC | 子进程 | JSONL 命令、响应与事件 | 其他语言、隔离进程、IDE 或自定义客户端 |

## 启动 RPC 模式

```bash
pi --mode rpc --no-session
```

普通 CLI 选项仍用于选择工作目录、模型、工具、资源和会话行为。常见选项包括 `--provider`、`--model`、`--name`、`--no-session` 和 `--session-dir`。完整且与版本对应的接口见[命令行](cli.md)；已安装版本以 `pi --help` 为准。

RPC 模式拒绝 `@file` 提示参数。请改用 [`prompt`](rpc-commands.md#prompt) 命令发送提示。

## 协议记录

协议包含四类记录：

| 方向 | 记录 | 用途 |
|---|---|---|
| stdin | 命令 | 要求 Pi 执行提示、检查状态、更改配置或管理会话 |
| stdout | `response` | 报告一条命令是否成功，并返回命令数据 |
| stdout | 会话事件 | 流式发送运行、消息、工具、队列、压缩和重试活动 |
| 双向 | 扩展 UI 记录 | 在 Pi 与客户端之间转发受支持的扩展交互 |

权威的记录定义见 [RPC 命令](rpc-commands.md)、[JSON 事件流](json.md)和 [RPC 扩展 UI](rpc-extension-ui.md)。

### 关联命令与响应

每条命令都接受可选的字符串 `id`，匹配响应会重复该值：

```json
{"id":"req-1","type":"get_state"}
{"id":"req-1","type":"response","command":"get_state","success":true,"data":{"...":"..."}}
```

可能有多条命令同时等待完成时，应始终使用唯一 ID。命令处理是异步的，因此客户端应按 ID 关联，而不是依靠响应顺序。

会话事件通常没有命令 ID，因为它们描述会话活动。`bash_execution_update` 是例外：如果发起它的 [`bash`](rpc-commands.md#bash) 命令有 ID，其输出事件会重复该 ID。

`extension_ui_response` 使用对应 `extension_ui_request` 提供的 ID，不会产生普通命令响应。

## 分帧

RPC 使用严格的 JSONL 分帧。每条记录写入一个完整 JSON 对象，以 LF（`\n`）终止。按字节流或 UTF-8 流读取 stdout，只按 LF 切分记录。移除前面可选的回车符，以接受 CRLF 输入。

不要使用把 Unicode 行分隔符或段落分隔符视为记录边界的通用行读取器。尤其是 Node.js 的 `readline`，也会在 `U+2028` 和 `U+2029` 处分隔，而它们在 JSON 字符串内部是有效字符。

持续读取 stdout。Pi 会遵循 stdout 背压，但客户端停止读取可能让进程停滞。写入命令时也应遵循 stdin 背压。stdout 保留给协议记录，诊断与应用日志写入 stderr。

## 运行生命周期

`prompt` 响应成功表示提示已被接受、排队或处理，不代表模型工作已经完成：

```json
{"id":"req-2","type":"prompt","message":"Review this repository"}
{"id":"req-2","type":"response","command":"prompt","success":true,"data":{"disposition":"started"}}
```

`data.disposition` 报告提示发生了什么。如果为 `"handled"`，此提示没有启动运行，因此不要等待 `agent_settled`。所有取值见 [RPC 命令](rpc-commands.md#prompt)。

收到响应后，继续消费[事件](json.md)。`agent_end` 标记一次底层智能体运行结束，但之后仍可能有重试、溢出恢复、压缩、引导消息或后续工作。如果客户端需要确认 Pi 不会再自动继续，应等待 `agent_settled`。

发送提示前就订阅事件，避免错过快速完成的情况。`RpcClient.promptAndWait()` 内部会这样处理。如果分别调用 `RpcClient` 方法，请在 `prompt()` 之前安装事件监听器，并且只在运行仍活动时调用 `waitForIdle()`。

## 错误

命令失败时返回一条带有 `success: false` 的响应：

```json
{"id":"req-3","type":"response","command":"set_model","success":false,"error":"Model not found: invalid/model"}
```

格式错误的 JSON 会产生不带请求 ID 的解析响应：

```json
{"type":"response","command":"parse","success":false,"error":"Failed to parse command: Unexpected token..."}
```

成功响应仅表示命令处理成功。提示被接受后发生的提供商失败或中止，会出现在消息与事件流中。

客户端还必须处理子进程启动失败、意外退出、stderr 诊断、取消和自身时限。不要将 stderr 当作协议数据解析。

## 关闭

关闭子进程的 stdin，请求有序关闭。Pi 会在退出前释放活动运行时。客户端仍需处理进程信号和意外退出。

扩展也可以通过其扩展上下文请求关闭。Pi 会在当前命令结束，或活动运行发出 `agent_settled` 后完成关闭。

## 最小客户端

以下 Python 示例使用二进制管道读取器，只按 LF 切分，不会把 Unicode 分隔符当作协议边界：

```python
import json
import subprocess

process = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
)

assert process.stdin is not None
assert process.stdout is not None

command = {"id": "prompt-1", "type": "prompt", "message": "Hello"}
process.stdin.write(json.dumps(command).encode("utf-8") + b"\n")
process.stdin.flush()

while line := process.stdout.readline():
    record = json.loads(line)
    if record.get("type") == "message_update":
        update = record["assistantMessageEvent"]
        if update["type"] == "text_delta":
            print(update["delta"], end="", flush=True)
    elif record.get("type") == "agent_settled":
        print()
        break

process.stdin.close()
process.wait()
```

需要持续维护的 TypeScript 客户端时，请使用经过检查的 [RPC 客户端示例](../examples/rpc-client.ts)。它要求已经构建 Pi CLI，因为仓库示例指向 `dist/cli.js`。

## 参考

- [RPC 命令](rpc-commands.md)：每条 stdin 命令及响应
- [JSON 事件流](json.md)：共享的 stdout 会话事件与流式重建
- [RPC 扩展 UI](rpc-extension-ui.md)：对话框、通知、响应和限制
- [消息类型](message-types.md)：响应与事件使用的消息和内容块
- [会话文件格式](session-format.md)：会话命令返回的条目
- [`rpc-types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-types.ts)：导出的 TypeScript 协议定义
- [`RpcClient`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-client.ts)：子进程客户端实现

## 已迁移的参考锚点

原本位于本页的详细参考现已拆分为独立页面。以下锚点用于保留现有链接。

<a id="prompt"></a>
<a id="steer"></a>
<a id="follow_up"></a>
<a id="abort"></a>
<a id="clear_queue"></a>
<a id="new_session"></a>
<a id="get_state"></a>
<a id="get_messages"></a>
<a id="set_model"></a>
<a id="cycle_model"></a>
<a id="get_available_models"></a>
<a id="set_thinking_level"></a>
<a id="cycle_thinking_level"></a>
<a id="get_available_thinking_levels"></a>
<a id="set_steering_mode"></a>
<a id="set_follow_up_mode"></a>
<a id="compact"></a>
<a id="set_auto_compaction"></a>
<a id="set_auto_retry"></a>
<a id="abort_retry"></a>
<a id="bash"></a>
<a id="abort_bash"></a>
<a id="get_session_stats"></a>
<a id="export_html"></a>
<a id="switch_session"></a>
<a id="fork"></a>
<a id="clone"></a>
<a id="get_fork_messages"></a>
<a id="get_entries"></a>
<a id="get_tree"></a>
<a id="get_last_assistant_text"></a>
<a id="set_session_name"></a>
<a id="get_commands"></a>

命令详情已移至 [RPC 命令](rpc-commands.md)。

<a id="message_update-streaming"></a>
<a id="bash_execution_update"></a>
<a id="compaction_start--compaction_end"></a>
<a id="summarization_retry_scheduled--summarization_retry_attempt_start--summarization_retry_finished"></a>

事件详情已移至 [JSON 事件流](json.md)。

<a id="extension-ui-protocol"></a>

扩展交互详情已移至 [RPC 扩展 UI](rpc-extension-ui.md)。

# JSON 事件流

JSON 模式为一次调用输出结构化进度：

```bash
pi --mode json "Review this repository"
```

Pi 先写入一个会话头部，随后写入会话事件，提供的提示全部完成后退出。RPC 模式输出相同形状的会话事件，但没有会话头部，因为它是长期运行的双向协议。见 [RPC 模式](rpc.md)。

本页是 JSON 与 RPC 模式共享事件的权威参考。消息值使用[共享消息类型](message-types.md)。

## 分帧与进程 I/O

流采用严格的 JSONL 分帧。每条记录是一个 JSON 对象，以 LF（`\n`）结尾。只按 LF 切分记录，并移除前面可选的回车符。Unicode 行分隔符和段落分隔符在 JSON 字符串内部有效，不是记录边界。

Node.js 的 `readline` 不适合此流，因为它也会识别这些 Unicode 分隔符。请使用字节流或 UTF-8 流解码器，并按 LF 切分。

持续读取 stdout。读取方停止消费记录时，管道缓冲区填满后可能使 Pi 停滞。stdout 保留给 JSONL，诊断和应用日志写入 stderr。

## 会话头部

JSON 模式的首条记录是当前[会话头部](session-format.md#sessionheader)：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path"}
```

RPC 模式不输出此记录。通过 [`get_state`](rpc-commands.md#get_state) 获取当前会话 ID 和文件。

## 事件顺序

一次基本运行会产生如下记录：

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_end","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_start","message":{"role":"assistant","content":[],"stopReason":"pending","...":"..."}}
{"type":"message_update","usage":{"...":"..."},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{"role":"assistant","...":"..."}}
{"type":"turn_end","message":{"role":"assistant","...":"..."},"toolResults":[]}
{"type":"agent_end","messages":[{"...":"..."}],"willRetry":false}
{"type":"agent_settled","aborted":false}
```

`agent_end` 结束一次底层智能体运行。之后仍可能继续自动重试、溢出恢复、压缩重试、引导消息或后续工作。`agent_settled` 才表示 Pi 对此次会话级运行已没有剩余自动工作。

## 智能体与轮次事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `agent_start` | 无 | 底层智能体运行开始。 |
| `agent_end` | `messages`, `willRetry` | 该次底层运行结束。`messages` 包含本次运行生成的消息。 |
| `agent_settled` | `aborted` | Pi 不会再通过重试、压缩恢复或排队消息自动继续。运行因中止而结束时，`aborted` 为 `true`。 |
| `turn_start` | 无 | 一个助手轮次开始。 |
| `turn_end` | `message`, `toolResults` | 一条助手响应及其产生的工具调用完成。 |

一个轮次包括一条助手响应，以及由该响应产生的所有工具调用和工具结果。

## 消息事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `message_start` | `message` | 一条消息开始。 |
| `message_update` | `usage`, `assistantMessageEvent` | 助手消息发出内容块更新。 |
| `message_end` | `message` | 一条消息完成。这是权威的最终消息。 |

### 重建流式消息

在线路上传输的 `message_update` 记录只包含增量，会省略 SDK 事件中的累积 `message` 字段，以及每个 `assistantMessageEvent.partial` 快照，使流大小保持线性增长。

嵌套事件为以下类型之一：

| 类型 | 除 `type` 外的字段 | 含义 |
|---|---|---|
| `start` | 无 | 提供商流开始；在线路上移除了累积 `partial` 字段。 |
| `text_start` | `contentIndex` | 一个文本块开始。 |
| `text_delta` | `contentIndex`, `delta` | 向块追加文本。 |
| `text_end` | `contentIndex`, `content` | 文本块结束，并给出权威内容。 |
| `thinking_start` | `contentIndex` | 一个思考块开始。 |
| `thinking_delta` | `contentIndex`, `delta` | 向块追加思考文本。 |
| `thinking_end` | `contentIndex`, `content` | 思考块结束，并给出权威内容。 |
| `toolcall_start` | `contentIndex`, `id`, `toolName` | 一个工具调用块开始。 |
| `toolcall_delta` | `contentIndex`, `delta` | 追加序列化后的参数数据。 |
| `toolcall_end` | `contentIndex`, `toolCall` | 工具调用结束，并给出完整 `ToolCall`。 |
| `done` | `reason`, `message` | 提供商流成功完成。 |
| `error` | `reason`, `error` | 提供商流以错误或中止消息结束。 |

普通智能体循环会将提供商级的 `start`、`done` 和 `error` 转换为 `message_start` 与 `message_end` 会话事件，而不是作为 `message_update` 发出。对于自行构造匹配会话事件的调用方，导出的 `JsonAgentSessionEvent` 转换仍然接受这些类型。

使用 `contentIndex` 标识内容块。为实时显示缓冲 `delta` 字段，但在收到 `text_end`、`thinking_end` 或 `toolcall_end` 时，用其中完成的内容替换重建的数据。`message_end.message` 到达时，用它替换整个部分消息。

顶层 `usage` 是提供商最近报告的、该条助手响应的累计用量。如果提供商在流式生成期间不报告用量，它可能一直为零，直到完成。

```json
{"type":"message_update","usage":{"input":100,"output":1,"cacheRead":0,"cacheWrite":0,"totalTokens":101,"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"total":0}},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello "}}
```

## 工具执行事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `tool_execution_start` | `toolCallId`, `toolName`, `args` | 工具执行开始。 |
| `tool_execution_update` | `toolCallId`, `toolName`, `args`, `partialResult` | 工具报告部分结果。 |
| `tool_execution_end` | `toolCallId`, `toolName`, `result`, `isError`, `durationMs` | 工具执行结束。`durationMs` 是工具 `execute()` 的耗时，使用单调时钟测量；工具未运行时不存在。 |

通过 `toolCallId` 关联生命周期。`partialResult` 是工具提供的最新部分结果。它替换还是扩展先前更新，取决于该工具的结果约定。

```json
{"type":"tool_execution_start","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"}}
{"type":"tool_execution_update","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"},"partialResult":{"content":[{"type":"text","text":"partial output"}],"details":{}}}
{"type":"tool_execution_end","toolCallId":"call_abc123","toolName":"bash","result":{"content":[{"type":"text","text":"complete output"}],"details":{}},"isError":false}
```

## 队列与状态事件

| 事件 | 字段 | 含义 |
|---|---|---|
| `queue_update` | `steering`, `followUp` | 待处理的引导或后续消息队列发生变化。两个字段都包含当前完整队列。 |
| `entry_appended` | `entry` | 扩展通过 `pi.appendEntry()` 追加了自定义会话条目。 |
| `session_info_changed` | `name` | 会话显示名称变化。没有 `name` 表示名称已清除。 |
| `thinking_level_changed` | `level` | 当前思考级别变化。 |

`entry` 值使用持久化的[会话条目类型](session-format.md#entry-types)。

## 压缩事件

`compaction_start` 报告压缩开始的原因：

```json
{"type":"compaction_start","reason":"threshold"}
```

`reason` 为 `"manual"`、`"threshold"` 或 `"overflow"`。

压缩成功时，`compaction_end` 包含结果：

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {"...": "..."},
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

压缩被中止时，没有 `result`，且 `aborted` 为 true。压缩失败时，没有 `result`，`aborted` 为 false，`errorMessage` 描述失败原因。溢出恢复成功时，会在 Pi 重试提示前将 `willRetry` 设为 true。

结果语义见[上下文压缩与分支摘要](compaction.md)。

## 重试事件

助手轮次重试时输出：

```json
{"type":"auto_retry_start","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"529 overloaded"}
{"type":"auto_retry_end","success":true,"attempt":2}
```

最终失败时，`auto_retry_end` 包含 `success: false` 和 `finalError` 字符串。

压缩与分支摘要重试时输出：

```json
{"type":"summarization_retry_scheduled","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"terminated"}
{"type":"summarization_retry_attempt_start","source":"compaction","reason":"threshold"}
{"type":"summarization_retry_finished"}
```

对于分支摘要，`source` 为 `"branchSummary"`，没有 `reason`。压缩重试的 `reason` 为 `"manual"`、`"threshold"` 或 `"overflow"`。

## RPC 专用事件

直接发出的 RPC [`bash`](rpc-commands.md#bash) 命令会为每个输出块产生一条 `bash_execution_update`。其可选 `id` 与命令 ID 相同。最终命令响应可能包含截断输出，但这些事件会流式发送全部输出：

```json
{"type":"bash_execution_update","id":"req-1","delta":"total 48\n"}
```

扩展处理器抛出异常时，RPC 还会添加 `extension_error`：

```json
{"type":"extension_error","extensionPath":"/path/to/extension.ts","event":"tool_call","error":"Error message"}
```

扩展 UI 记录属于独立的 RPC 子协议，不是 `AgentSessionEvent` 值。见 [RPC 扩展 UI](rpc-extension-ui.md)。

## TypeScript 类型

SDK 的 `AgentSessionEvent` 为进程内使用方提供累积的流式快照。JSON 和 RPC 只转换 `message_update`：

```typescript
type WithoutPartial<T> = T extends { partial: unknown } ? Omit<T, "partial"> : T;

type JsonAssistantMessageEvent<T> = T extends { type: "toolcall_start"; partial: unknown }
  ? WithoutPartial<T> & { id: string; toolName: string }
  : WithoutPartial<T>;

type JsonAgentSessionEvent =
  | Exclude<AgentSessionEvent, { type: "message_update" }>
  | {
      type: "message_update";
      usage: Usage;
      assistantMessageEvent: JsonAssistantMessageEvent<AssistantMessageEvent>;
    };
```

请使用 `@earendil-works/pi-coding-agent` 导出的 `JsonAgentSessionEvent` 类型。实现见 [`json-event.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/json-event.ts)。

## 示例

打印一次性运行中完成的消息：

```bash
pi --mode json "List files" 2>/dev/null | jq -c 'select(.type == "message_end")'
```

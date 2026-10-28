# RPC 命令

本参考列出 [RPC 模式](rpc.md)在 stdin 上接受的命令。每条命令和响应都是一个 JSON 对象。共享的消息值采用[消息类型](message-types.md)。

## 发送提示

### prompt

向智能体发送用户提示。提示被接受、排队或处理后，才会发出命令响应。接受之后，事件仍会异步持续输出。

```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

携带图像：
```json
{"type": "prompt", "message": "What's in this image?", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

**流式生成期间**：如果智能体已经在流式生成，必须指定 `streamingBehavior`，将消息加入队列：

```json
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
```

- `"steer"`：在智能体运行时将消息排队。当前助手轮次完成工具调用执行后、下一次 LLM 调用之前送达。
- `"followUp"`：等待智能体完成。只有智能体停止后才送达消息。

如果智能体正在流式生成，且未指定 `streamingBehavior`，命令会返回错误。

**扩展命令**：如果消息是扩展命令，例如 `/mycommand`，即使正在流式生成也会立即执行。扩展命令通过 `pi.sendMessage()` 管理自身的 LLM 交互。

**输入展开**：技能命令（`/skill:name`）和提示模板（`/template`）会在发送／排队前展开。

响应：
```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true, "data": {"disposition": "started"}}
```

扩展命令或输入处理器消费了提示时，`data.disposition` 为 `"handled"`；Pi 在运行期间将其排队时为 `"queued"`；Pi 接受它以启动运行时为 `"started"`。这描述的是提交的提示，不是扩展启动的独立工作，也不保证完成。

`success: true` 表示提示已被接受、排队或立即处理。`success: false` 表示在接受前被拒绝。接受后的失败通过普通事件和消息流报告，而不会为同一请求 ID 再发送第二条 `response`。

`images` 为可选字段。每张图像使用 `ImageContent` 格式：`{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`。

### steer

在智能体运行时，将引导消息排入队列。当前助手轮次完成工具调用执行后、下一次 LLM 调用之前送达。技能命令和提示模板会展开。不允许扩展命令，请改用 `prompt`。

```json
{"type": "steer", "message": "Stop and do this instead"}
```

携带图像：
```json
{"type": "steer", "message": "Look at this instead", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` 为可选字段。每张图像使用 `ImageContent` 格式，与 `prompt` 相同。

响应：
```json
{"type": "response", "command": "steer", "success": true, "data": {"disposition": "queued"}}
```

输入处理器消费了此次引导消息时，`data.disposition` 为 `"handled"`；Pi 将其排队时为 `"queued"`，也包括处理器转换后再排队的情况。它不保证该消息仍然留在队列中。

如何控制引导消息处理方式，见 [set_steering_mode](#set_steering_mode)。

### follow_up

将后续消息加入队列，等待智能体完成后处理。只有智能体不再有工具调用或引导消息时才送达。技能命令和提示模板会展开。不允许扩展命令，请改用 `prompt`。

```json
{"type": "follow_up", "message": "After you're done, also do this"}
```

携带图像：
```json
{"type": "follow_up", "message": "Also check this image", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` 为可选字段。每张图像使用 `ImageContent` 格式，与 `prompt` 相同。

响应：
```json
{"type": "response", "command": "follow_up", "success": true, "data": {"disposition": "queued"}}
```

`data.disposition` 的 `"handled"` 或 `"queued"` 与 `steer` 中的含义相同，但作用于此次后续消息。

如何控制后续消息处理方式，见 [set_follow_up_mode](#set_follow_up_mode)。

### abort

中止当前操作，并等待会话空闲后再响应。

```json
{"type": "abort"}
```

响应：
```json
{"type": "response", "command": "abort", "success": true}
```

### clear_queue

移除排队的引导和后续消息，并返回它们的文本。

```json
{"type": "clear_queue"}
```

响应：
```json
{
  "type": "response",
  "command": "clear_queue",
  "success": true,
  "data": {
    "steering": ["Change direction"],
    "followUp": ["Summarize when finished"]
  }
}
```

要实现交互式 Esc 行为，请先发送 `clear_queue`，再发送 `abort`，然后在客户端编辑器中恢复返回的文本。如果会话中仍有排队消息，`abort` 会继续处理它们。

### new_session

开始全新会话。`session_before_switch` 扩展事件处理器可以取消此操作。

```json
{"type": "new_session"}
```

附带可选的父会话跟踪：
```json
{"type": "new_session", "parentSession": "/path/to/parent-session.jsonl"}
```

响应：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": false}}
```

扩展取消时：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": true}}
```

## 状态

### get_state

获取当前会话状态。

```json
{"type": "get_state"}
```

响应：
```json
{
  "type": "response",
  "command": "get_state",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isStreaming": false,
    "isCompacting": false,
    "steeringMode": "all",
    "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "sessionName": "my-feature-work",
    "autoCompactionEnabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

`model` 字段是完整的 [Model](#model-object) 对象，未选择模型时省略。`sessionName` 字段是通过 `set_session_name` 设置的显示名称，未设置时省略。

### get_messages

获取对话中的全部消息。

```json
{"type": "get_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_messages",
  "success": true,
  "data": {"messages": [...]}
}
```

消息是 `AgentMessage` 对象，见[消息类型](message-types.md)。

## 模型

### set_model

切换到指定模型。

```json
{"type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514"}
```

响应包含完整 [Model](#model-object) 对象：
```json
{
  "type": "response",
  "command": "set_model",
  "success": true,
  "data": {...}
}
```

### cycle_model

循环切换到下一个可用模型。只有一个模型可用时，返回 `null` 数据。

```json
{"type": "cycle_model"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_model",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isScoped": false
  }
}
```

`model` 字段是完整的 [Model](#model-object) 对象。

### get_available_models

列出所有已配置模型。

```json
{"type": "get_available_models"}
```

响应包含完整 [Model](#model-object) 对象数组：
```json
{
  "type": "response",
  "command": "get_available_models",
  "success": true,
  "data": {
    "models": [...]
  }
}
```

## 思考

### set_thinking_level

为支持此能力的模型设置推理／思考级别。

```json
{"type": "set_thinking_level", "level": "high"}
```

级别：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`

只有选中的模型支持时，才会提供 `"xhigh"` 和 `"max"`。包括 GPT-5.6 在内的一些模型同时提供两者。

响应：
```json
{"type": "response", "command": "set_thinking_level", "success": true}
```

### cycle_thinking_level

循环切换可用的思考级别。模型不支持思考时，返回 `null` 数据。

```json
{"type": "cycle_thinking_level"}
```

响应：
```json
{
  "type": "response",
  "command": "cycle_thinking_level",
  "success": true,
  "data": {"level": "high"}
}
```

### get_available_thinking_levels

列出当前模型支持的思考级别。模型不支持推理时，返回 `["off"]`。

```json
{"type": "get_available_thinking_levels"}
```

响应：
```json
{
  "type": "response",
  "command": "get_available_thinking_levels",
  "success": true,
  "data": {
    "levels": ["off", "minimal", "low", "medium", "high"]
  }
}
```

## 队列模式

### set_steering_mode

控制来自 `steer` 的引导消息如何送达。

```json
{"type": "set_steering_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：当前助手轮次完成工具调用执行后，送达全部引导消息
- `"one-at-a-time"`：每完成一个助手轮次，送达一条引导消息，默认模式

响应：
```json
{"type": "response", "command": "set_steering_mode", "success": true}
```

### set_follow_up_mode

控制来自 `follow_up` 的后续消息如何送达。

```json
{"type": "set_follow_up_mode", "mode": "one-at-a-time"}
```

模式：
- `"all"`：智能体完成时送达全部后续消息
- `"one-at-a-time"`：每次智能体完成时送达一条后续消息，默认模式

响应：
```json
{"type": "response", "command": "set_follow_up_mode", "success": true}
```

## 上下文压缩

### compact

手动压缩对话上下文，减少 Token 使用。

```json
{"type": "compact"}
```

提供自定义指令：
```json
{"type": "compact", "customInstructions": "Focus on code changes"}
```

响应：
```json
{
  "type": "response",
  "command": "compact",
  "success": true,
  "data": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  }
}
```

`estimatedTokensAfter` 是压缩后立即对重建消息上下文作出的启发式估算，不是提供商精确的 Token 数。`usage` 报告生成摘要所用的一次或多次 LLM 调用，自定义压缩处理器可以省略它。

### set_auto_compaction

启用或禁用上下文接近满额时的自动压缩。

```json
{"type": "set_auto_compaction", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_compaction", "success": true}
```

## 重试

### set_auto_retry

启用或禁用暂时性错误的自动重试，包括过载、速率限制和 5xx。

```json
{"type": "set_auto_retry", "enabled": true}
```

响应：
```json
{"type": "response", "command": "set_auto_retry", "success": true}
```

### abort_retry

中止正在进行的重试，即取消延迟并停止重试。

```json
{"type": "abort_retry"}
```

响应：
```json
{"type": "response", "command": "abort_retry", "success": true}
```

## Bash

### bash

执行 Shell 命令，并将输出加入对话上下文。命令运行时，输出以 `bash_execution_update` 事件流式发送；响应包含最终结果。

```json
{"id": "req-1", "type": "bash", "command": "ls -la"}
```

如果命令输出应保存在会话中，但在下一次提示时从模型上下文省略，请将 `excludeFromContext` 设为 `true`。

提供 `id`，将流式 `bash_execution_update` 事件与此命令关联。

响应：
```json
{
  "id": "req-1",
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "total 48\ndrwxr-xr-x ...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": false
  }
}
```

输出被截断时，包含 `fullOutputPath`：
```json
{
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "truncated output...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": true,
    "fullOutputPath": "/tmp/pi-bash-abc123.log"
  }
}
```

**bash 结果如何抵达 LLM：**

`bash` 命令立即执行，并返回 `BashResult`。内部会创建一个 `BashExecutionMessage`，保存到智能体消息状态中。

发送下一条 `prompt` 命令时，Pi 会先转换上下文消息，再发送给模型。除非 `excludeFromContext` 为 true，否则 `BashExecutionMessage` 会变成以下格式的 `UserMessage`：

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

这意味着：
1. 被包含的 bash 输出在**下一次提示**时才送到模型，而不是立即送达。
2. 一个提示之前可以执行多条 bash 命令；Pi 包含每条未设置 `excludeFromContext` 的命令输出。

### abort_bash

中止正在运行的 bash 命令。

```json
{"type": "abort_bash"}
```

响应：
```json
{"type": "response", "command": "abort_bash", "success": true}
```

## 会话

### get_session_stats

获取 Token 用量、费用统计及当前上下文窗口用量。

```json
{"type": "get_session_stats"}
```

响应：
```json
{
  "type": "response",
  "command": "get_session_stats",
  "success": true,
  "data": {
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "userMessages": 5,
    "assistantMessages": 5,
    "toolCalls": 12,
    "toolResults": 12,
    "totalMessages": 22,
    "tokens": {
      "input": 50000,
      "output": 10000,
      "cacheRead": 40000,
      "cacheWrite": 5000,
      "total": 105000
    },
    "cost": 0.45,
    "contextUsage": {
      "tokens": 60000,
      "contextWindow": 200000,
      "percent": 30
    }
  }
}
```

`tokens` 和 `cost` 包含完整会话中的助手消息、工具报告的用量，以及压缩／分支摘要生成。`contextUsage` 包含用于压缩和页脚显示的实际当前上下文窗口估算。

没有可用模型或上下文窗口时，省略 `contextUsage`。压缩后，`contextUsage.tokens` 和 `contextUsage.percent` 立即变为 `null`，直到压缩后新的助手响应提供有效用量数据。

### export_html

将会话导出为 HTML 文件。

```json
{"type": "export_html"}
```

使用自定义路径：
```json
{"type": "export_html", "outputPath": "/tmp/session.html"}
```

响应：
```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": {"path": "/tmp/session.html"}
}
```

### switch_session

加载另一个会话文件。`session_before_switch` 扩展事件处理器可以取消此操作。

```json
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
```

响应：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": false}}
```

扩展取消切换时：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": true}}
```

### fork

从活动分支上较早的一条用户消息创建新分叉。`session_before_fork` 扩展事件处理器可以取消此操作。返回分叉起点消息的文本。

```json
{"type": "fork", "entryId": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": false}
}
```

扩展取消分叉时：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"cancelled": true}
}
```

### clone

在当前位置将当前活动分支复制为新会话。`session_before_fork` 扩展事件处理器可以取消此操作。

```json
{"type": "clone"}
```

响应：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": false}
}
```

扩展取消复制时：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": true}
}
```

### get_fork_messages

获取可用作分叉起点的用户消息。

```json
{"type": "get_fork_messages"}
```

响应：
```json
{
  "type": "response",
  "command": "get_fork_messages",
  "success": true,
  "data": {
    "messages": [
      {"entryId": "abc123", "text": "First prompt..."},
      {"entryId": "def456", "text": "Second prompt..."}
    ]
  }
}
```

### get_entries

按追加顺序获取全部会话条目，不含会话头部。会话是由具有稳定 ID 的条目构成、仅可追加的树，因此条目 ID 可以作为持久游标：将最后看到的条目 ID 作为 `since` 传入，就只会获得严格位于其后的条目，跨客户端重启也有效。与 `get_messages` 不同，这包括压缩前的历史和已放弃分支。

```json
{"type": "get_entries"}
```

使用游标：
```json
{"type": "get_entries", "since": "abc123"}
```

响应：
```json
{
  "type": "response",
  "command": "get_entries",
  "success": true,
  "data": {
    "entries": [
      {"type": "message", "id": "def456", "parentId": "abc123", "timestamp": "...", "message": {"role": "user", "...": "..."}}
    ],
    "leafId": "def456"
  }
}
```

`leafId` 是当前叶条目的 ID，空会话为 `null`，客户端因此可以在一次往返中判断活动分支是否移动。如果 `since` 不匹配任何条目 ID，响应为 `success: false`。

### get_tree

将会话作为条目树获取。每个节点为 `{entry, children, label?, labelTimestamp?}`。结果是数组，因为导航 API 可以创建多个根节点；父链断裂的孤立条目也会作为根节点出现。

```json
{"type": "get_tree"}
```

响应：
```json
{
  "type": "response",
  "command": "get_tree",
  "success": true,
  "data": {
    "tree": [
      {
        "entry": {"type": "message", "id": "abc123", "parentId": null, "...": "..."},
        "children": [
          {"entry": {"type": "message", "id": "def456", "parentId": "abc123", "...": "..."}, "children": []}
        ]
      }
    ],
    "leafId": "def456"
  }
}
```

### get_last_assistant_text

获取助手最后一条消息的文本内容。

```json
{"type": "get_last_assistant_text"}
```

响应：
```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": {"text": "The assistant's response..."}
}
```

不存在助手文本时，`text` 值为 `null`。

### set_session_name

为当前会话设置显示名称。该名称会出现在会话列表中，帮助识别会话。

```json
{"type": "set_session_name", "name": "my-feature-work"}
```

响应：
```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

当前会话名称可通过 `get_state` 的 `sessionName` 字段获取。启动 RPC 模式时要设置初始名称，请向 `pi --mode rpc` 进程传入 `--name <name>` 或 `-n <name>`。

## 可发现的命令

### get_commands

获取可用命令，包括扩展命令、提示模板和技能。在名称前加 `/`，通过 `prompt` 命令运行。

```json
{"type": "get_commands"}
```

响应：
```json
{
  "type": "response",
  "command": "get_commands",
  "success": true,
  "data": {
    "commands": [
      {
        "name": "fix-tests",
        "description": "Fix failing tests",
        "source": "prompt",
        "sourceInfo": {
          "path": "/home/user/myproject/.pi/agent/prompts/fix-tests.md",
          "source": "local",
          "scope": "project",
          "origin": "top-level"
        }
      }
    ]
  }
}
```

每个命令包含：
- `name`：命令名称，使用 `/name`
- `description`：便于人类阅读的说明，扩展命令可省略
- `source`：命令种类：
  - `"extension"`：扩展通过 `pi.registerCommand()` 注册
  - `"prompt"`：从提示模板 `.md` 文件加载
  - `"skill"`：从技能目录加载，名称带 `skill:` 前缀
- `sourceInfo`：注册该命令的资源元数据：
  - `path`：资源的绝对路径
  - `source`：Pi 如何发现它，例如 `"local"`、`"auto"` 或 `"cli"`
  - `scope`：`"user"`、`"project"` 或 `"temporary"`
  - `origin`：直接加载的资源为 `"top-level"`，软件包资源为 `"package"`
  - `baseDir`：适用时的软件包基础目录

**注意**：不包括 `/settings`、`/hotkeys` 等内置 TUI 命令。它们仅在交互模式处理，通过 `prompt` 发送不会执行。

## 模型对象

模型命令返回完整的已配置模型定义。费用单位为每百万 Token 的美元金额。

```json
{
  "id": "claude-sonnet-4-20250514",
  "name": "Claude Sonnet 4",
  "api": "anthropic-messages",
  "provider": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "reasoning": true,
  "input": ["text", "image"],
  "contextWindow": 200000,
  "maxTokens": 16384,
  "cost": {
    "input": 3.0,
    "output": 15.0,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  }
}
```

模型配置见[配置兼容端点](models.md#configure-a-compatible-endpoint)。TypeScript 中请使用 `@earendil-works/pi-ai` 导出的 `Model` 类型。

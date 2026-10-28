# 消息类型

Pi 在 SDK 状态、生命周期事件、RPC 响应和持久化会话消息条目中使用 `AgentMessage` 值。本页定义这些共享消息及其内容块。

消息时间戳是以毫秒为单位的 Unix 时间戳，与[会话条目](session-format.md#entry-base)上的 ISO 8601 时间戳不同。

源码定义：

- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) 定义面向提供商的消息和内容块。
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) 定义可扩展的 `AgentMessage` 联合类型。
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) 添加编程智能体的消息角色。

## 内容块

### TextContent

```typescript
interface TextContent {
  type: "text";
  text: string;
  textSignature?: string;
}
```

`textSignature` 包含提供商专用的消息元数据，应将其视为不透明值。

### ImageContent

```typescript
interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}
```

`data` 是 base64 编码的图像数据。`mimeType` 标识媒体类型，例如 `image/png` 或 `image/jpeg`。

### ThinkingContent

```typescript
interface ThinkingContent {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
}
```

思考签名包含提供商专用的回放数据，应将其视为不透明值。经过遮蔽的块可以没有可见思考文本，同时仍在 `thinkingSignature` 中保留加密载荷。

### ToolCall

```typescript
interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
  thoughtSignature?: string;
  namespace?: string;
}
```

`thoughtSignature` 是提供商专用值。`namespace` 标识动态加载工具或命名空间工具所属的 OpenAI Responses 命名空间。

## 用量

助手消息始终包含用量。工具执行了嵌套模型工作时，其结果也可以包含用量。

```typescript
interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  reasoning?: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}
```

存在 `reasoning` 时，它已包含在 `output` 中，不要再次相加。`cacheWrite1h` 是 `cacheWrite` 中按一小时保留期写入的子集。

## 基础消息

### SystemMessage

```typescript
interface SystemMessage {
  role: "system";
  content: string | TextContent[];
  sections?: Record<string, string | null>;
  toolsAdded?: Tool[];
  toolsRemoved?: ToolReference[];
  timestamp: number;
}
```

开头的系统消息声明初始提示与工具。之后的系统消息可以追加指令、替换或移除具名提示区段，以及添加或移除工具。按顺序回放即可得到当前状态。

### UserMessage

```typescript
interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}
```

### AssistantMessage

```typescript
interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  providerThinkingLevel?: string;
  thinkingLevel?: ModelThinkingLevel;
  diagnostics?: AssistantMessageDiagnostic[];
  usage: Usage;
  stopReason: "pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred";
  deferred?: DeferredHandle;
  errorMessage?: string;
  rawStopReason?: string;
  endTurn?: boolean;
  timestamp: number;
}
```

提供商报告具体模型时，`responseModel` 记录该模型。它可能与请求模型相同。`responseId`、`providerThinkingLevel`、`thinkingLevel`、`diagnostics` 和 `rawStopReason` 保留提供商或运行时细节。

`"pending"` 用于流式生成期间的部分助手消息。`message_end` 中完成的消息具有终态停止原因，Pi 不会将 `"pending"` 助手消息持久化到会话 JSONL。

`"deferred"` 响应带有 `DeferredHandle`，其中包含检索该响应所需的提供商数据：

```typescript
interface DeferredHandle {
  provider: string;
  modelId: string;
  api: string;
  id: string;
  expiresAt?: number;
  pollAfterMs?: number;
  data?: JsonValue;
}
```

### ToolResultMessage

```typescript
interface ToolResultMessage<TDetails = any> {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: TDetails;
  usage?: Usage;
  nestedCalls?: NestedToolCalls;
  isError: boolean;
  timestamp: number;
}
```

`details` 由工具自行定义。可选的 `usage` 报告工具执行的嵌套模型工作，计入完整会话统计，但不属于主模型调用的用量。`nestedCalls` 记录该工具调用其他工具时的有界元数据：

```typescript
interface NestedToolCalls {
  calls: NestedToolCallRecord[];
  complete: boolean;
}

interface NestedToolCallRecord {
  id: string;
  name: string;
  arguments?: JsonObject;
  argumentsBytes?: number;
  status: "ok" | "error" | "unfinished";
  durationMs?: number;
  error?: string;
}
```

## 编程智能体消息

编程智能体软件包为 `AgentMessage` 扩展了四种角色。

### BashExecutionMessage

由直接执行的 Shell 命令创建，包括 RPC [`bash`](rpc-commands.md#bash) 命令。它不是 LLM 工具结果。

```typescript
interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
  timestamp: number;
}
```

除非 `excludeFromContext` 为 true，否则 Pi 会在下一次模型请求前，将此消息转换为用户角色的文本。

### CustomMessage

扩展发送上下文消息时创建。

```typescript
interface CustomMessage<T = unknown> {
  role: "custom";
  customType: string;
  content: string | (TextContent | ImageContent)[];
  display: boolean;
  details?: T;
  timestamp: number;
}
```

Pi 在模型请求中将其内容转换为用户消息。`display` 控制终端渲染，`details` 不会发送给模型。

### BranchSummaryMessage

```typescript
interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string | null;
  timestamp: number;
}
```

Pi 根据持久化的 `branch_summary` 条目创建此上下文消息。

### CompactionSummaryMessage

```typescript
interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

Pi 根据持久化的 `compaction` 条目创建此上下文消息。

## AgentMessage 联合类型

在编程智能体中，该联合类型等价于：

```typescript
type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

在较底层的 agent 软件包中，`AgentMessage` 为 `Message | CustomAgentMessages[keyof CustomAgentMessages]`。应用可以通过 TypeScript 声明合并添加角色，因此从经过扩充的宿主接收消息时，使用方应容忍未知自定义角色。

# 会话文件格式

会话保存为 JSONL（JSON Lines）文件。每行是一个带有 `type` 字段的 JSON 对象。会话条目通过 `id`/`parentId` 字段形成树结构，从而可以在原文件中分支，无需创建新文件。

以编程方式创建、持久化和浏览会话树，见 [`SessionManager` API](sdk.md#sessionmanager-api)。


## 文件位置

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl
```

默认情况下，`<session-id>` 是 UUID。调用方可以通过 SDK 或 `--session-id` 提供自定义 ID。对于 `<path>`，Pi 会移除开头的路径分隔符，并将 `/`、`\\` 和 `:` 替换为 `-`。

## 删除会话

可以删除 `~/.pi/agent/sessions/` 下的 `.jsonl` 文件，移除会话。

Pi 也支持在 `/resume` 中交互式删除会话：选择会话，按 `Ctrl+D`，然后确认。如果可用，Pi 会使用 `trash` CLI，避免永久删除。

## 会话版本

会话在头部包含版本字段：

- **版本 1**：线性条目序列，属于旧版，加载时自动迁移
- **版本 2**：通过 `id`/`parentId` 连接的树结构
- **版本 3**：将 `hookMessage` 角色重命名为 `custom`，统一扩展机制

现有会话在加载时会自动迁移到当前版本 v3。

## 源文件

GitHub 上的源码（[pi](https://github.com/earendil-works/pi)）：
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) — 会话条目类型与 SessionManager
- [消息类型](message-types.md) — 共享的消息与内容块参考
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) — 扩展消息类型
- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) — 基础消息与内容块类型
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) — 可扩展的 `AgentMessage` 联合类型

项目中可用的 TypeScript 定义，见 `node_modules/@earendil-works/pi-coding-agent/dist/` 和 `node_modules/@earendil-works/pi-ai/dist/`。

## 消息

`message` 条目保存一个 [`AgentMessage`](message-types.md)。消息内容块、角色、用量和消息时间戳的定义，见[消息类型](message-types.md)。

会话条目的时间戳是 ISO 8601 字符串，嵌套消息的时间戳则是以毫秒为单位的 Unix 时间戳。

## 条目基类

除 `SessionHeader` 外，所有条目都扩展 `SessionEntryBase`：

```typescript
interface SessionEntryBase {
  type: string;
  id: string;           // Usually an 8-char hex ID; may fall back to a full UUID
  parentId: string | null;  // Parent entry ID (null for a root entry)
  timestamp: string;    // ISO timestamp
}
```

## 条目类型

### SessionHeader

文件第一行。仅包含元数据，不属于树的一部分，没有 `id`/`parentId`。

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project"}
```

对于具有父会话的会话，即通过 `/fork`、`/clone` 或 `newSession({ parentSession })` 创建的会话：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project","parentSession":"/path/to/original/session.jsonl"}
```

### SessionMessageEntry

对话中的一条消息。`message` 字段包含 `AgentMessage`。系统消息携带提示和工具配置：会话的首次请求会持久化一条包含所有提示区段和工具声明的系统消息；后续变化则作为系统消息保存，按名称修补 `sections`，其中 `null` 表示移除，并列出 `toolsAdded`/`toolsRemoved`。按顺序回放即可得到当前提示和工具，不存在单独的提示状态条目。

```json
{"type":"message","id":"a0b1c2d3","parentId":null,"timestamp":"2024-12-03T14:00:00.000Z","message":{"role":"system","content":"","sections":{"preamble":"You are an expert coding assistant...","tools":"<tools>\n- read: ...\n</tools>","cwd":"/project"},"toolsAdded":[{"name":"read","description":"...","parameters":{}}],"timestamp":1733234400000}}
{"type":"message","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:04:00.000Z","message":{"role":"system","content":"","sections":{"skills":"<skills>...</skills>"},"toolsRemoved":[{"name":"write"}],"timestamp":1733234640000}}
```

系统消息机制引入之前创建的会话，没有开头的系统消息；首次请求会将当前提示声明为较晚出现的系统消息，回放方式相同。

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"2024-12-03T14:00:01.000Z","message":{"role":"user","content":"Hello","timestamp":1733234401000}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"api":"anthropic-messages","provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop","timestamp":1733234402000}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"2024-12-03T14:00:03.000Z","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false,"timestamp":1733234403000}}
```

助手消息记录生成它的模型。较新的消息还会记录 `thinkingLevel`，即该响应请求使用的 Pi 思考级别。

### ModelChangeEntry

用户在会话中途切换模型时产生。最新条目表示选中的模型，它可能是[虚拟模型](virtual-models.md)；此时助手消息记录的则是实际回答的物理模型。

```json
{"type":"model_change","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:05:00.000Z","provider":"openai","modelId":"gpt-4o"}
```

### ThinkingLevelChangeEntry

用户更改思考／推理级别时产生。

```json
{"type":"thinking_level_change","id":"e5f6g7h8","parentId":"d4e5f6g7","timestamp":"2024-12-03T14:06:00.000Z","thinkingLevel":"high"}
```

### UsageEntry

记录归属于模型、但不是助手消息且不参与 LLM 上下文的用量。`kind` 是标识操作的任意字符串；例如，缓存保温使用 `"cache_warm"`。

```json
{"type":"usage","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:08:00.000Z","kind":"cache_warm","provider":"anthropic","model":"claude-sonnet-4-5","usage":{"input":0,"output":0,"cacheRead":50000,"cacheWrite":0,"totalTokens":50000,"cost":{"input":0,"output":0,"cacheRead":0.015,"cacheWrite":0,"total":0.015}}}
```

用量条目计入会话的 Token 和费用总量。Pi 在对话树中隐藏它们。消费这些条目的程序应将未知 `kind` 值视为普通用量，而不是拒绝。

### CompactionEntry

压缩上下文时创建。保存较早消息的摘要，以及完整的系统提示／工具检查点。

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:10:00.000Z","summary":"User discussed X, Y, Z...","firstKeptEntryId":"c3d4e5f6","tokensBefore":50000,"systemMessage":{"role":"system","content":"You are a coding assistant.","toolsAdded":[],"timestamp":1733235000000}}
```

`firstKeptEntryId` 为必填字段，标识压缩条目之前仍被保留的第一个条目。重建上下文时，Pi 用压缩摘要替换更早、已被总结的条目，并保留从该条目开始的范围。不保留任何旧条目的压缩会在此字段存入自身 ID，因此之前没有条目被保留。

可选字段：
- `systemMessage`：压缩边界处回放得到的提示区段和工具声明；它成为压缩后上下文开头的系统消息，保留条目中的系统消息会被丢弃，以它为准。较早的会话条目没有此字段。
- `usage`：生成摘要的 LLM 用量，计入会话 Token 和费用总量
- `details`：实现专用数据，例如默认实现中的 `{ readFiles: string[], modifiedFiles: string[] }`，或扩展的自定义数据
- `fromHook`：扩展生成时为 `true`；Pi 生成时为 `false`/`undefined`，字段名称沿用旧版

### ContextEditEntry

对之前某个会产生上下文的条目进行仅追加式编辑。只影响未来模型上下文；目标条目及其元数据在原始历史、UI、导出和会话统计中均保持不变。

```json
{"type":"context_edit","id":"g6h7i8j9","parentId":"f6g7h8i9","timestamp":"2024-12-03T14:11:00.000Z","targetId":"c3d4e5f6","replacement":null}
```

目标可以是用户、助手、工具结果或自定义消息条目。`replacement: null` 将目标从模型上下文中省略。非 null 的 `replacement` 只替换目标消息内容。助手和工具结果条目的字符串替换值，会被规范化为单个文本块，因为这些角色要求内容数组。多个编辑指向同一条目时，活动分支上最新的编辑生效。编辑与分支相关：浏览到编辑之前的位置，会再次看到目标原本对上下文的贡献。

### BranchSummaryEntry

通过 `/tree` 切换分支时创建，包含由 LLM 生成的、从离开的分支回溯到公共祖先的摘要，用于捕获被放弃路径上的上下文。

```json
{"type":"branch_summary","id":"g7h8i9j0","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:15:00.000Z","fromId":"f6g7h8i9","summary":"Branch explored approach A..."}
```

`parentId` 表示新分支从哪个条目继续。`fromId` 表示此前的叶节点，其被放弃的路径已被总结。

可选字段：
- `usage`：生成摘要的 LLM 用量，计入会话 Token 和费用总量
- `details`：默认实现中的文件跟踪数据（`{ readFiles: string[], modifiedFiles: string[] }`），或扩展自定义数据
- `fromHook`：扩展生成时为 `true`；Pi 生成时为 `false`/`undefined`，字段名称沿用旧版

### CustomEntry

用于持久化扩展状态，不参与 LLM 上下文。

```json
{"type":"custom","id":"h8i9j0k1","parentId":"g7h8i9j0","timestamp":"2024-12-03T14:20:00.000Z","customType":"my-extension","data":{"count":42}}
```

重新加载时，通过 `customType` 标识你的扩展条目。交互模式可以通过 `pi.registerEntryRenderer(customType, renderer)` 渲染自定义条目，但它们仍不参与 LLM 上下文。

Pi 将[虚拟模型](virtual-models.md)路由器状态存为自定义条目，其 `customType` 为 `pi.virtual-model-state`，`data` 为 `{ provider, modelId, state }`。

### CustomMessageEntry

扩展注入的消息，会参与 LLM 上下文。

```json
{"type":"custom_message","id":"i9j0k1l2","parentId":"h8i9j0k1","timestamp":"2024-12-03T14:25:00.000Z","customType":"my-extension","content":"Injected context...","display":true}
```

字段：
- `content`：字符串或 `(TextContent | ImageContent)[]`，与 UserMessage 相同
- `display`：`true` 表示在 TUI 中以独特样式显示，`false` 表示隐藏
- `details`：可选的扩展专用元数据，不发送给 LLM

### LabelEntry

用户在条目上定义的书签／标记。

```json
{"type":"label","id":"j0k1l2m3","parentId":"i9j0k1l2","timestamp":"2024-12-03T14:30:00.000Z","targetId":"a1b2c3d4","label":"checkpoint-1"}
```

将 `label` 设为 `undefined` 可清除标签。

### SessionInfoEntry

会话元数据，例如用户定义的显示名称。通过 `/name`、`--name` / `-n`，或扩展中的 `pi.setSessionName()` 设置。

```json
{"type":"session_info","id":"k1l2m3n4","parentId":"j0k1l2m3","timestamp":"2024-12-03T14:35:00.000Z","name":"Refactor auth module"}
```

设置会话名称后，会话选择器（`/resume`）显示该名称，而不是首条消息。

## 树结构

条目通常组成一棵树，但导航 API 可以创建多个根节点：
- 根条目的 `parentId: null`；首个条目最初就是根节点
- 每个非根条目通过 `parentId` 指向父节点
- 分支会从较早条目创建新的子节点
- “叶节点”表示树中的当前位置
- 调用 `resetLeaf()` 或 `branchWithSummary(null, ...)`，可以让后续条目成为另一个根节点

```
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← current leaf
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← alternate branch
```

## 构建上下文

`buildContextEntries()` 从当前叶节点回溯到根节点，生成活动条目列表，并遵循压缩规则：

1. 收集路径上的全部条目
2. 如果路径上存在一个或多个 `CompactionEntry`，使用最新的一个：
   - 首先包含压缩条目
   - 包含从 `firstKeptEntryId` 开始，到压缩条目之前的非系统条目，不包含压缩条目本身
   - 包含压缩条目之后的条目
3. 保留所选范围内的非消息条目，供交互模式渲染

随后，`buildSessionProjection()` 为每个选中的目标应用最新 `context_edit`，返回模型可见消息及其来源条目。被省略的目标不产生消息；替换则保留来源条目的角色与元数据，只更改内容。选中的原始条目不会被修改。

`buildSessionContext()` 在该投影上构建供 LLM 使用的消息列表：

1. 从完整路径提取当前模型和思考级别设置
2. 将选中条目转换为消息：
   - `message` -> 已存储的 `AgentMessage`
   - `compaction` -> 完整系统检查点，后接 `compactionSummary`
   - `branch_summary` -> `branchSummary`
   - `custom_message` -> `CustomMessage`
   - `context_edit` -> 自身不产生上下文消息
   - `usage` 和 `custom` -> 不产生上下文消息

压缩摘要替换 `firstKeptEntryId` 之前的条目。压缩之前的系统消息合并进完整检查点，而不是从保留范围中重新回放。保留的非系统条目，以及压缩后的全部条目，仍可供 LLM 使用。

## 解析示例

```typescript
import { readFileSync } from "fs";

const lines = readFileSync("session.jsonl", "utf8").trim().split("\n");

for (const line of lines) {
  const entry = JSON.parse(line);

  switch (entry.type) {
    case "session":
      console.log(`Session v${entry.version ?? 1}: ${entry.id}`);
      break;
    case "message":
      console.log(`[${entry.id}] ${entry.message.role}: ${JSON.stringify(entry.message.content)}`);
      break;
    case "compaction":
      console.log(`[${entry.id}] Compaction: ${entry.tokensBefore} tokens summarized`);
      break;
    case "branch_summary":
      console.log(`[${entry.id}] Branch from ${entry.fromId}`);
      break;
    case "usage":
      console.log(`[${entry.id}] Usage (${entry.kind}): ${entry.usage.totalTokens} tokens`);
      break;
    case "custom":
      console.log(`[${entry.id}] Custom (${entry.customType}): ${JSON.stringify(entry.data)}`);
      break;
    case "custom_message":
      console.log(`[${entry.id}] Extension message (${entry.customType}): ${entry.content}`);
      break;
    case "label":
      console.log(`[${entry.id}] Label "${entry.label}" on ${entry.targetId}`);
      break;
    case "model_change":
      console.log(`[${entry.id}] Model: ${entry.provider}/${entry.modelId}`);
      break;
    case "thinking_level_change":
      console.log(`[${entry.id}] Thinking: ${entry.thinkingLevel}`);
      break;
  }
}
```

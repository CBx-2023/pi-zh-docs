# 上下文压缩参考

本参考介绍自动压缩、分支摘要、持久化条目和扩展钩子。用户操作流程见[会话与上下文](sessions.md#manage-conversation-context)。

**源文件**（[pi](https://github.com/earendil-works/pi)）：
- [`packages/coding-agent/src/core/compaction/compaction.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) — 自动压缩逻辑
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) — 分支摘要
- [`packages/coding-agent/src/core/compaction/utils.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) — 共享工具函数，包括文件跟踪和序列化
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) — 条目类型，包含 `CompactionEntry` 和 `BranchSummaryEntry`
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) — 扩展事件类型

项目中可用的 TypeScript 定义，见 `node_modules/@earendil-works/pi-coding-agent/dist/`。

## 概览

Pi 有两种摘要机制：

| 机制 | 触发条件 | 用途 |
|-----------|---------|---------|
| 上下文压缩 | 上下文超过阈值，或执行 `/compact` | 总结旧消息，释放上下文空间 |
| 分支摘要 | `/tree` 导航 | 切换分支时保留上下文 |

两者使用相近的结构化格式，并累积跟踪文件操作。摘要请求会禁用提示缓存写入，因为这些一次性提示不太可能复用。

## 上下文压缩

### 何时触发

满足以下条件时触发自动压缩：

```
contextTokens > contextWindow - reserveTokens
```

`reserveTokens` 默认为 16384 个 Token，可以在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置。它只决定何时开始压缩。摘要请求使用模型的输出上限，必要时会降低，以便输入与输出共同容纳于上下文窗口。

在多轮智能体运行中，工具执行完成且结果追加后、下一条助手响应开始前，Pi 会检查规范的投影上下文。如果超过阈值，Pi 在 `prepareNextTurn` 中压缩，然后在 `turn_start` 前执行现有的补充引导消息轮询。如果已完成的工具批次会结束运行，且没有排队消息要求继续响应，则跳过此次轮间检查。Pi 还会在新用户提示之前检查，并在底层运行结束后进行最后一次尝试的溢出恢复。

提供商返回上下文溢出错误，或提前以 `stopReason: "length"` 结束的最终响应，可以触发一次压缩后重试的恢复尝试。包含工具调用的长度受限响应，会保留合成的失败工具结果，遵循普通工具／队列调度器，而不会强制结束运行。

你也可以通过 `/compact [instructions]` 手动触发；可选指令用于指定摘要重点。

### 工作原理

1. **寻找切分点**：沿最终确定的会话投影向后遍历，累加 Token 估算值，直到达到 `keepRecentTokens`；默认 20k，可在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置
2. **提取消息**：收集从上一次保留边界，或会话起点，到切分点之间的投影消息
3. **生成摘要**：调用 LLM 按结构化格式总结；存在先前摘要时，将其作为迭代上下文传入
4. **追加条目**：保存包含摘要和 `firstKeptEntryId` 的 `CompactionEntry`
5. **重建上下文**：会话为下一次请求重建上下文，使用摘要加上从 `firstKeptEntryId` 开始的消息

```
Before compaction:

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               messagesToSummarize            kept messages
                                   ↑
                          firstKeptEntryId (entry 4)

After compaction (new entry appended):

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                 not sent to LLM                    sent to LLM
                                                         ↑
                                              starts from firstKeptEntryId

What the LLM sees:

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    prompt   from cmp          messages from firstKeptEntryId
```

重复压缩时，被总结的范围从上一次压缩的保留边界，即 `firstKeptEntryId` 开始，而不是从压缩条目自身开始；如果路径上找不到该保留条目，则回退到上次压缩之后的条目。不保留旧条目的压缩会将自身 ID 记为 `firstKeptEntryId`，后续压缩从其后开始。这样，先前压缩中幸存的消息也会加入下一轮摘要，得以继续保留。Pi 还会在写入新 `CompactionEntry` 前，根据重建且应用上下文编辑后的会话投影重新计算 `tokensBefore`，使 Token 数反映实际将被替换的压缩前上下文。被省略的原始条目仍会存储，但不影响切分点选择、摘要、检查点或 Token 估算。

### 溢出与长度恢复的顺序

恢复会保留现有生命周期和队列顺序。已完成的尝试仍对 `turn_end` 和 `agent_end` 可见；之后，运行后恢复会在新一次重试前修复已持久化的模型上下文：

```text
persist final assistant response
→ extension/public turn_end
→ extension/public agent_end
→ append context_edit omissions for the selected attempt
→ for overflow/length: run session_before_compact and append compaction on success
→ start the retry as a fresh run
```

如果恢复压缩失败或被取消，Pi 会保留省略编辑，不追加压缩条目，也不安排内部重试。现有排队工作仍由普通的引导消息和后续消息规则管理。`agent_before_settle` 在恢复处理后看到修复的投影。原始对话历史、导出、费用总量，以及历史搜索扩展，仍能检查被省略的尝试。

### 拆分用户消息跨度

一个用户消息跨度从一条用户消息开始，包含之后的全部轮次，直到下一条用户消息。通常，压缩在用户消息边界处切分。

当单个用户消息跨度超过 `keepRecentTokens` 时，切分点会落在跨度内部的一条助手消息处。这就是被拆分的用户消息跨度：

```
Split user-message span (one span exceeds budget):

  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘
                                                      └── kept (7-8)

  isSplitTurn = true
  messagesToSummarize = []  (no earlier user-message spans)
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

对于被拆分的用户消息跨度，Pi 会生成并合并两份摘要：
1. **历史摘要**：之前的上下文，如果存在
2. **用户消息跨度前缀摘要**：被拆分跨度的前半部分

### 切分点规则

有效切分点包括：
- 用户消息
- 助手消息
- BashExecution 消息
- 自定义消息，包括 custom_message、branch_summary

绝不会在工具结果处切分，因为它们必须与对应工具调用保持在一起。

只有当一个对上下文不可见的后缀包含被省略的助手尝试，且没有未被省略、会产生上下文的条目时，准备过程才会将保留边界推进到该后缀内部。恢复产生的 `context_edit` 省略满足此规则；本身就对上下文不可见的元数据可以与它们共存。只有元数据，或新追加的自定义消息，都不会移动切分点。影响候选输入或被总结前缀的替换编辑，也会阻止边界推进，因为被省略的助手回答的是编辑前输入；对于最终会被省略的后缀条目，其替换仍然安全。这样，超出预算的恢复后输入可以被总结，同时保留用于持续省略废弃尝试的编辑，而不会让记账信息改变是否原样保留新的模型输入。

### CompactionEntry 结构

定义位于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface CompactionEntry<T = unknown> {
  type: "compaction";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  usage?: Usage;       // LLM usage that generated the summary
  fromHook?: boolean;  // true if provided by extension (legacy field name)
  details?: T;         // implementation-specific data
}

// Default compaction uses this for details (from compaction.ts):
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

扩展可以在 `details` 中保存任何可 JSON 序列化的数据。默认压缩会跟踪文件操作，自定义扩展则可以使用自己的结构。生成的摘要和扩展提供的摘要，在可获得 LLM `usage` 时都会保存，以便会话总量包含摘要工作。

实现见 [`prepareCompaction()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) 和 [`compact()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts)。直接通过程序生成摘要时，`generateSummary()` 返回摘要文本，`generateSummaryWithUsage()` 返回 `{ text, usage }`。

## 分支摘要

### 何时触发

通过 `/tree` 导航到另一条分支时，Pi 会询问是否总结即将离开的工作，将离开分支的上下文注入新分支。

### 工作原理

1. **寻找公共祖先**：新旧位置共享的最深节点
2. **收集条目**：从旧叶节点回溯到公共祖先
3. **按预算准备**：在 Token 预算内包含消息，较新的消息优先
4. **生成摘要**：调用 LLM，使用结构化格式
5. **追加条目**：在导航位置保存 `BranchSummaryEntry`

```
Tree before navigation:

         ┌─ B ─ C ─ D (old leaf, being abandoned)
    A ───┤
         └─ E ─ F (target)

Common ancestor: A
Entries to summarize: B, C, D

After navigation with summary:

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [summary of B,C,D] (new leaf)
```

### 累积文件跟踪

默认压缩和分支摘要会累积跟踪文件。两者都从被总结消息的工具调用中提取文件操作。压缩还会继承先前 Pi 生成的压缩中的文件列表；分支摘要则继承其所总结条目中，Pi 生成的分支摘要所带的文件列表。

因此，文件跟踪会在多次默认压缩和嵌套的默认分支摘要之间累积。对于 `fromHook` 为 `true` 的扩展生成摘要，Pi 不会自动继承文件列表；扩展自行管理其 `details` 格式。

### BranchSummaryEntry 结构

定义位于 [`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)：

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: "branch_summary";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  fromId: string;      // Entry we navigated from
  usage?: Usage;       // LLM usage that generated the summary
  fromHook?: boolean;  // true if provided by extension (legacy field name)
  details?: T;         // implementation-specific data
}

// Default branch summarization uses this for details (from branch-summarization.ts):
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

与压缩一样，扩展可以在 `details` 中保存自定义数据。

实现见 [`collectEntriesForBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、[`prepareBranchEntries()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) 和 [`generateBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)。

## 摘要格式

两种格式都包含目标、约束与偏好、进度、关键决定和后续步骤。压缩摘要还包含关键上下文；分支摘要在后续步骤后结束。适用时，Pi 会为任一种格式追加文件列表。

压缩摘要使用以下格式：

```markdown
## Goal
[What the user is trying to accomplish]

## Constraints & Preferences
- [Requirements mentioned by user]

## Progress
### Done
- [x] [Completed tasks]

### In Progress
- [ ] [Current work]

### Blocked
- [Issues, if any]

## Key Decisions
- **[Decision]**: [Rationale]

## Next Steps
1. [What should happen next]

## Critical Context
- [Data needed to continue]

<read-files>
path/to/file1.ts
path/to/file2.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### 消息序列化

生成摘要前，消息通过 [`serializeConversation()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) 序列化为文本：

```
[User]: What they said
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

这可以避免模型将其当成需要继续的对话。

思考块会被省略。提供商返回的往往是实际推理的摘要，回放的思考也经常不属于模型当前有效上下文的一部分，因此包含它们可能让摘要请求比要总结的上下文本身还大。

序列化时，工具结果截断到 2000 个字符。超过限制的内容替换为标记，注明截断的字符数。由于工具结果，尤其是 `read` 和 `bash`，通常是上下文体积的最大来源，这样可以将摘要请求控制在合理 Token 预算内。

## 通过扩展自定义摘要

扩展可以拦截并自定义上下文压缩和分支摘要。事件类型定义见 [`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts)。

### session_before_compact

在自动压缩或 `/compact` 之前触发，可以取消操作或提供自定义摘要。见类型文件中的 `SessionBeforeCompactEvent` 和 `CompactionPreparation`。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - messages to summarize
  // preparation.turnPrefixMessages - user-message-span prefix (if isSplitTurn)
  // preparation.previousSummary - previous compaction summary
  // preparation.fileOps - extracted file operations
  // preparation.tokensBefore - context tokens before compaction
  // preparation.firstKeptEntryId - where kept messages start
  // preparation.settings - effective settings after applying model overrides

  // branchEntries - all entries on current branch (for custom state)
  // reason - "manual" (/compact), "threshold", or "overflow"
  // willRetry - whether the aborted turn is retried after compaction (overflow recovery)
  // signal - AbortSignal (pass to LLM calls)

  // Cancel:
  return { cancel: true };

  // Custom summary:
  return {
    compaction: {
      summary: "Your summary...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // Optional; included in session totals
      details: { /* custom data */ },
    }
  };
});
```

#### 将消息转换为文本

要使用自己的模型生成摘要，可以通过 `serializeConversation` 将消息转换为文本：

```typescript
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;
  
  // Convert AgentMessage[] to Message[], then serialize to text
  const conversationText = serializeConversation(
    convertToLlm(preparation.messagesToSummarize)
  );
  // Returns:
  // [User]: message text
  // [Assistant]: response text
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: output text

  // Now send to your model for summarization
  const { summary, usage } = await myModel.summarize(conversationText);
  
  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage,
    }
  };
});
```

使用其他模型的完整示例，见 [custom-compaction.ts](../examples/extensions/custom-compaction.ts)。

### session_compact_failed

手动或自动压缩失败、或被中止时触发。遥测扩展可以借此将 `session_before_compact` 尝试与最终结果对应起来。

```typescript
pi.on("session_compact_failed", async (event, ctx) => {
  const { reason, errorMessage, aborted, willRetry, fromExtension } = event;
  // reason - "manual" (/compact), "threshold", or "overflow"
  // errorMessage - present for non-abort failures
  // aborted - true for canceled/aborted compactions
  // willRetry - whether the aborted turn would have retried after compaction
  // fromExtension - whether extension-provided compaction content was being used
});
```

### session_before_tree

在 `/tree` 导航之前触发，无论用户是否选择生成摘要都会触发。可以取消导航，或提供自定义摘要。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId - where we're navigating to
  // preparation.oldLeafId - current position (being abandoned)
  // preparation.commonAncestorId - shared ancestor
  // preparation.entriesToSummarize - entries that would be summarized
  // preparation.userWantsSummary - whether user chose to summarize

  // Cancel navigation entirely:
  return { cancel: true };

  // Provide custom summary (only used if userWantsSummary is true):
  if (preparation.userWantsSummary) {
    return {
      summary: {
        summary: "Your summary...",
        // usage: summaryResponse.usage, // Optional; included in session totals
        details: { /* custom data */ },
      }
    };
  }
});
```

见类型文件中的 `SessionBeforeTreeEvent` 和 `TreePreparation`。

## 设置

在 `~/.pi/agent/settings.json` 或 `<project-dir>/.pi/settings.json` 中配置压缩：

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 设置 | 默认值 | 说明 |
|---------|---------|-------------|
| `enabled` | `true` | 启用自动压缩 |
| `reserveTokens` | `16384` | 可用上下文 Token 低于此值时开始自动压缩 |
| `keepRecentTokens` | `20000` | 直接保留而不总结的最近 Token 数 |

通过 `"enabled": false` 禁用自动压缩。仍可使用 `/compact` 手动压缩。

### 按模型覆盖

通过 `compaction.modelOverrides`，为不同模型调整 Token 预算：

```json
{
  "compaction": {
    "reserveTokens": 16384,
    "keepRecentTokens": 20000,
    "modelOverrides": {
      "some-provider/big-model": {
        "reserveTokens": 400000
      }
    }
  }
}
```

对于上下文窗口为 1M 的模型，此覆盖会在超过 600K Token 时触发压缩，并保留普通设置中的最近 20000 个 Token。其他模型仍使用普通的 16384 Token 预留值。

键是精确且区分大小写的 `provider/modelId` 值，包括模型 ID 内部的所有斜杠。`reserveTokens` 和 `keepRecentTokens` 各自独立回退：先使用模型覆盖，再使用普通设置，最后使用内置默认值。值必须是非负安全整数。匹配模型覆盖中的无效值，在读取时会报错；只有省略的字段才回退到普通设置。模型覆盖条目必须是对象。普通 Token 设置无效时，读取即报错，即使当前模型存在有效覆盖也一样。只有省略的普通值才使用内置默认值。`enabled` 仍是全局设置，不按模型区分。

这些解析后的值用于手动压缩、全部自动阈值检查、溢出恢复，以及扩展可见的 `preparation.settings`。切换模型会影响之后的检查和压缩，而不会更改普通设置。已经进行中的压缩，继续使用该操作开始时捕获的模型和设置。分支摘要设置不受影响。

全局和项目设置都支持覆盖。文件会在查找前递归合并，因此全局的模型专用值优先于项目级通用回退值；项目必须覆盖该模型条目才能修改它。细节见[设置](settings.md#per-model-compaction-overrides)。

# 虚拟模型

虚拟模型是一种可供选择的模型，会为每次请求选择实际使用的物理模型。可以用它根据任务、成本或对话状态进行路由。例如，路由器可以将简单问题发送给小模型，把困难问题发送给大模型，而用户只需选择一个模型。

通过[扩展](extensions.md)注册虚拟模型。它们与其他模型一样，出现在 `/model`、`--model`、限定模型集合和设置中。虚拟模型可以列在任意提供商下，也可以与物理模型同属一个提供商，例如 `openai-codex/auto`。

## 选择与派发

虚拟模型选择一个模型和思考级别。路由器在每次请求时，将这一组合映射为实际的物理模型组合：

```
selected (virtual model, virtual level)  ->  dispatched (physical model, physical level)
jev/auto:low                             ->  anthropic/claude-sonnet-4-5:high
```

虚拟思考级别是路由器的输入。它的具体含义由路由器决定，不一定对应推理预算。

Pi 会区分这两组值：

| | 选择 | 派发 |
|---|---|---|
| 记录位置 | `model_change` 和 `thinking_level_change` 条目 | 每条 assistant 消息：`provider`、`api`、`model`、`thinkingLevel` |
| 可见形式 | `ctx.model`、`ctx.thinkingLevel`、`PI_MODEL`、`PI_REASONING_LEVEL`、`/model` | 每次响应中的 assistant 消息 |

提供商只接收物理模型。assistant 消息记录物理模型名称，因此，跨不同物理模型重放对话，与手动切换模型后的行为相同。恢复会话时，会从最新的 `model_change` 条目恢复虚拟模型选择。如果虚拟模型已不再注册，Pi 会回退到最后一次作答的物理模型。

在交互模式中，底栏会在所选模型旁边显示路由后的模型，例如 `auto • high → gpt-5.6-luna • medium`。`/session` 会列出每个物理模型的费用。

上下文用量使用产生最新响应的物理模型的限制，即使该响应出现在切换虚拟模型之前。没有这种响应时，则使用虚拟模型声明的限制，如果有的话。压缩检查使用相同限制，也会再次检查每次请求路由到的模型限制。如果该模型的上下文窗口不足以容纳对话，Pi 会先压缩再发送请求；路由仍保持路由器作出的选择。

## 注册虚拟模型

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerVirtualModel({
    provider: "router",
    id: "auto",
    name: "Auto",
    thinkingLevels: ["low", "high"],
    route(request, ctx) {
      // Tool follow-ups and retries stay on the model that handled the turn.
      const sticky = request.failed ?? request.previous;
      if (request.reason !== "user" && sticky) {
        return { model: sticky.model, thinkingLevel: sticky.thinkingLevel ?? "medium" };
      }
      const id = request.thinkingLevel === "high" ? "claude-sonnet-4-5" : "claude-haiku-4-5";
      return { model: ctx.modelRegistry.find("anthropic", id)!, thinkingLevel: "medium" };
    },
  });
}
```

- `provider` 是模型归属的提供商，可以是任意提供商 ID。一个提供商可以在物理模型旁列出多个虚拟模型。对于物理模型提供商，具备该提供商凭据时，虚拟模型才可用；如果 ID 不属于任何提供商，则始终可用。
- `id` 不能与该提供商某个物理模型的 ID 相同。如果之后目录刷新添加了同 ID 的物理模型，虚拟模型会将其隐藏。
- `thinkingLevels` 列出可供选择的级别，默认为 `["off"]`。
- `contextWindow` 和 `maxTokens` 会在首次响应前显示。未设置的限制视为未知。
- `input` 列出可供选择的输入类型，默认为文本和图像；不支持图像的物理模型会收到占位内容。

注册遵循与 `pi.registerProvider()` 相同的排队和重载规则。再次注册相同提供商和 ID，会替换该虚拟模型。`pi.unregisterVirtualModel(provider, id)` 会移除它，`pi.unregisterProvider()` 则不会。SDK 代码无需扩展，也可以直接注册：`modelRuntime.registerVirtualModel(definition)`。

## 路由请求

每次使用虚拟模型发出请求前，都会运行 `route(request, ctx)`，返回 `{ model, thinkingLevel }`。其中的模型可以是目录中任意具有提供商凭据的物理模型，通过 `ctx.modelRegistry` 查找。虚拟模型不能路由到另一个虚拟模型。Pi 会将思考级别限制到返回模型支持的范围。

| 字段 | 含义 |
|---|---|
| `model`、`thinkingLevel` | 选择的虚拟模型和级别 |
| `reason` | 发出请求的原因，见下文 |
| `previous` | `messages` 中最近一次成功响应的物理模型和思考级别 |
| `failed` | 对于 `retry`：失败请求的物理模型、思考级别和 assistant `message`；该消息已从 `messages` 移除。消息携带 `stopReason` 和 `errorMessage`。如果是路由本身失败，则不存在此字段 |
| `state` | 当前会话分支上路由器最近返回的状态，见下文 |
| `messages` | 本次请求的对话，包含系统消息 |
| `signal` | 请求的中止信号 |

| `reason` | 请求 |
|---|---|
| `user` | 用户编写消息后的首次请求，包含引导消息和后续消息 |
| `continuation` | 智能体循环中的其他请求，例如工具结果或扩展消息之后的请求 |
| `retry` | 请求失败后的自动重试，包括上下文溢出压缩后的重试 |
| `direct` | 在智能体循环外发起的请求，例如压缩摘要，或扩展调用 `ctx.modelRegistry.streamSimple()` |

对于 `continuation` 返回 `previous`，对于 `retry` 返回 `failed`，可以保持提示缓存和思考签名有效。允许在轮次之间切换模型，但会丢失提示缓存。重试也可以切换到其他模型，例如 `failed.message.errorMessage` 报告提供商过载或上下文溢出时。

如果 `route()` 抛出异常，或者返回虚拟模型、没有凭据的模型，请求将以错误响应结束。

## 保留路由状态

`route()` 除了模型外，还可以返回 `state`。Pi 将其保存在会话分支上，并在后续请求中通过 `request.state` 传回。对于转录记录没有记载的信息，例如分类器结果或路由阶段，可以使用它作出决策：

```typescript
pi.registerVirtualModel<{ phase: "plan" | "build" }>({
  provider: "router",
  id: "phased",
  name: "Phased",
  route(request, ctx) {
    const state = request.state ?? { phase: "plan" };
    const id = state.phase === "plan" ? "claude-opus-4-5" : "claude-haiku-4-5";
    return { model: ctx.modelRegistry.find("anthropic", id)!, thinkingLevel: "medium", state };
  },
});
```

- 状态必须能够序列化为 JSON。返回 `undefined` 或 `request.state` 本身，会保留当前状态。
- Pi 会在发送请求前，将其他任何返回对象保存为新状态，即使它与当前状态相等。仅在状态变化时返回新对象。之后请求失败时，状态仍会保留。
- 状态遵循会话树，因此分叉和 `/tree` 导航会看到各自分支的状态。上下文压缩后也会保留。
- `direct` 请求没有状态，Pi 会忽略它们返回的状态。

转录记录已经记载所选模型及每次派发的模型，`ctx.sessionManager.getBranch()` 会同时公开两者。

路由器可以通过 `ctx.modelRegistry` 调用其他模型，例如使用 `ctx.modelRegistry.findOfType("classifier", provider, id)` 找到分类器模型，再调用 `ctx.modelRegistry.classify()`。这种调用会增加本轮首个 token 之前的延迟。

完整路由器示例见 [`jev-router.ts`](../examples/extensions/jev-router.ts)。它使用 Jev 分类器选出的强大 OpenAI Codex 模型进行规划，让该模型完成首次编辑，然后只切换一次，改用较便宜的模型，接受一次提示缓存未命中。它将阶段保存在路由状态中。

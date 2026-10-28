# 自定义提供商

提供商扩展将 Pi 连接到需要自定义身份验证、模型发现、请求处理或流式传输的模型服务。如果服务已经实现受支持的 API，应改为在 `models.json` 中配置。

提供商扩展在 Pi 内部运行，能够查看凭据、提示、工具定义、模型响应和用量信息。应将它们视为可信代码，并避免记录密钥或提供商载荷。

## 选择最小的集成方式

| 需求 | 使用方式 |
|---|---|
| 添加使用受支持 API 的模型 | [`models.json`](models.md#configure-a-compatible-endpoint) |
| 修改现有提供商的端点或请求头 | `models.json` 或小型提供商扩展 |
| 动态发现模型 | 带有 `refreshModels` 的提供商 |
| 添加 `/login` 流程 | 带有原生或旧式 OAuth 配置的提供商 |
| 实现尚不支持的传输协议 | 带有 `stream` 或 `streamSimple` 的提供商 |

提供商扩展也是一种[扩展](extensions.md)，因此遵循相同的加载、信任、重载和错误处理规则。

## 注册提供商

在扩展工厂中调用 `pi.registerProvider()`。Pi 会等待异步工厂完成，再继续启动，因此在此处注册的提供商可用于启动时的模型选择以及 `pi --list-models`。

有两种注册形式：

- 注册来自 `@earendil-works/pi-ai` 的完整 `Provider`，以支持原生身份验证、过滤、发现、刷新和流式传输行为。
- 将提供商名称与 `ProviderConfig` 一起注册，使用现有扩展采用的旧式配置形式。

对于不只负责静态端点和模型元数据的新集成，优先使用完整提供商。Pi 会在已注册原生提供商的基础上叠加 `models.json` 覆盖配置。

只为现有提供商注册 `baseUrl` 或 `headers`，会保留其内置模型。在旧式形式中提供 `models`，则会替换该提供商在聊天、图像和分类器操作中的全部模型。省略 `type` 时表示 `"chat"`；图像和分类器模型需要显式的区分字段，并通过 `images` 和 `classifiers` 字段，提供以相应 `api` 值为键的实现。

### 重定向现有提供商

只注册需要更改的字段，即可保留提供商的内置目录、身份验证、API 实现和兼容性设置：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("anthropic", {
    baseUrl: "https://gateway.example.com/anthropic",
    headers: {
      "X-Gateway-Key": "$GATEWAY_API_KEY",
    },
  });
}
```

对于保持上游协议不变的代理或网关，使用这种形式。不要将内置模型列表复制到扩展中，否则，简单的端点覆盖就会变成可能与上游逐渐偏离的目录替换。

### 注册兼容端点

服务实现了受支持的协议，但拥有自己的模型目录时，注册该端点，以及服务实际公开的模型即可：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerProvider("acme", {
    name: "Acme AI",
    baseUrl: "https://api.acme.example/v1",
    apiKey: "$ACME_API_KEY",
    api: "openai-completions",
    models: [
      {
        type: "chat",
        id: "acme-chat",
        name: "Acme Chat",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      },
    ],
  });
}
```

此场景若不需要可执行的扩展行为，应优先使用 `models.json`。当注册依赖运行时发现、自定义身份验证，或与其他扩展功能共享的代码时，再使用扩展。

### 注册混合操作模型

混合操作提供商可以一起注册非聊天模型及其实现：

```typescript
pi.registerProvider("media-tools", {
  apiKey: "$MEDIA_TOOLS_API_KEY",
  models: [
    {
      type: "image",
      id: "image-v1",
      name: "Image V1",
      api: "media-images",
      baseUrl: "https://media.example.com/v1",
      input: ["text"],
      output: ["image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
    {
      type: "classifier",
      id: "classifier-v1",
      name: "Classifier V1",
      api: "media-classifier",
      baseUrl: "https://media.example.com/v1",
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 64000,
    },
  ],
  images: {
    "media-images": { generateImages: async (model, context, options) => result },
  },
  classifiers: {
    "media-classifier": { classify: async (model, context, options) => result },
  },
});
```

模型级 `baseUrl` 优先于提供商端点。如果未提供 `models` 列表，各种操作的内置模型都会保留注册。不同操作中相同的模型 ID 仍然彼此独立，包括各自的模型专用请求头。

初始扩展加载完成后发起的调用会立即生效。使用 `pi.unregisterProvider()` 可以移除动态提供商，并恢复被其替换的内置行为。

完整的注册示例见经过检查的 [GitLab Duo 提供商](../examples/extensions/custom-provider-gitlab-duo/)，它将流式传输委托给内置 API 实现。

## 提供身份验证

静态提供商可以从字面值、环境变量插值或命令中解析 API Key。这些值采用与 `models.json` 相同的语法：

- `$NAME` 和 `${NAME}` 读取环境变量。
- 以 `!command` 开头时，使用命令输出。
- `$$` 输出字面的 `$`。
- `$!` 输出字面的起始 `!`。

如果集成需要已存储的凭据、自定义解析、提供商专用环境或多种登录方式，应使用原生提供商身份验证。

OAuth 提供商需要给出显示名称、登录流程、令牌刷新和访问令牌解析。注册后，它会出现在 `/login` 中，Pi 将返回的凭据保存到 `~/.pi/agent/auth.json`。

OAuth 回调不绑定具体 UI。它们可以打开授权 URL、显示设备码、报告进度、请求输入，或让用户选择登录方式。发起网络请求时，要正确处理取消操作及传入的中止信号。

按 Enter（`tui.select.confirm`）打开设备登录 URL 并复制代码，也可以手动登录。提供商可以在 `onDeviceCode` 或原生 `AuthEvent` 通知中，设置 `openBrowserOnConfirm: false` 或 `copyCodeOnConfirm: false`，分别禁用这两项操作。

绝不要将访问令牌、刷新令牌、Authorization 请求头或完整提供商响应写入普通日志。

## 提供与刷新模型

每个模型都需要 ID、显示名称、输入能力和费用元数据。聊天模型和分类器模型还需要上下文窗口；聊天模型需要输出上限和推理支持；图像模型则声明输出模态。除非某个模型需要覆盖，否则应在提供商层面选择 API 实现。

当 Pi 应保持空闲的提示缓存活跃时，将 `promptCache.short` 或 `promptCache.long` 设为提供商尽力提供的缓存有效期，单位为秒。保持未设置，即可禁用该保留档位的缓存保温。

兼容性标记描述的是：原本受支持的 API 中，已经验证的行为差异。不要仅凭端点宣称兼容，就启用这些标记。

应对照实际服务器，确认请求字段和响应行为。

可用模型目录来自实时服务时，使用 `refreshModels`。将 `context.signal` 传给阻塞 I/O，使调用方能够取消刷新。

两种注册形式的刷新约定不同：

- 完整 `Provider` 不返回值，而是调用 `context.publish({ update })` 安装由提供商管理的模型状态；之后，同步的 `getModels()` 会公开最新列表。
- 旧式 `ProviderConfig.refreshModels` 返回混合操作模型定义。Pi 将该注册的实时模型替换为返回的列表，并按请求执行持久化。

只有在目录数据需要跨运行保留时，才发布持久化数据。llama.cpp 这类实时服务可以只更新内存列表，而不持久化；远程目录则可以保存快照，供离线启动使用。

## 复用受支持的流式 API

提供商协议能够匹配 Pi AI 某个现有 API 实现时，就应复用该实现。

受支持的实现覆盖 Anthropic Messages、OpenAI Chat Completions 和 Responses、Google Generative AI 和 Vertex、Azure OpenAI Responses、Mistral Conversations，以及 Bedrock Converse。

提供商仍然可以自定义身份验证、基础 URL、请求头、模型过滤和发现，同时将请求转换与流式传输委托给现有 API 实现。

这比复制流式传输实现更安全，因为它保留了 Pi 的消息转换、工具处理、用量统计、取消和兼容性行为。

## 实现自定义流式传输

只有现有 API 实现无法表达该服务时，才实现 `streamSimple`。请先研究 [`packages/ai/src/api`](https://github.com/earendil-works/pi/tree/main/packages/ai/src/api) 下的实现。

流接收规范化的 `TranscriptContext`。系统提示与工具声明位于转录记录的系统消息中，因此应通过 `getCurrentSystemPrompt(context.messages)` 和 `getCurrentTools(context.messages)` 读取，而不是假设存在 `context.systemPrompt` 或 `context.tools`。支持对话中途系统消息的模型可以原位接收它们；否则，调用 `collapseSystemMessages(context)`，将后续系统消息合并到开头的系统消息中。

自定义流必须：

1. 创建 assistant 消息，包含提供商、模型、时间戳、待定的停止原因、内容，以及清零的用量。
2. 请求配置成功后，先发出一次 `start` 事件，再发送内容事件。
3. 发出成对的文本、思考和工具调用事件时，同步更新消息。
4. 最终确定用量、费用、内容和停止原因。
5. 恰好发出一个终止 `done` 或 `error` 事件，然后关闭流。
6. 将取消操作转换为已中止的结果。

请求配置可能在 `start` 之前失败；此时流可以直接以 `error` 终止。缺少请求身份验证信息时，也可能在返回流之前同步抛出异常。

内容索引指向 assistant 消息中的内容块。在发出通过 `partial` 字段公开状态的事件前，应先更新对应内容块。到 `toolcall_end` 时，工具调用参数必须包含有效的已解析输入。

流还必须正确处理通过 `SimpleStreamOptions` 提供的请求观测机制：

- 向提供商发送请求前，调用 `options.onPayload`，并使用它返回的替换载荷。
- 收到响应后、读取响应体前，调用 `options.onResponse`。
- 对每个已解析的提供商事件，在规范化之前等待 `options.onProviderStreamEvent?.(providerEvent, model)`。
- 透传中止信号和提供商专用环境。

这些钩子支持扩展请求检查、响应头事件及提供商流观测。省略它们，会让提供商的行为不同于 Pi 内置提供商。

## 报告失败与用量

设置明确的终止停止原因。错误和已中止消息需要 `errorMessage`；成功消息需要准确的输入、输出、缓存、总 token 数和费用值。

遇到能够识别的上下文溢出错误时，Pi 可以压缩上下文并重试。如果服务使用未知的错误消息，应在带有条件保护的 `message_end` 处理器中，只将该提供商的溢出响应规范化为 `context_length_exceeded`。

不要将速率限制或临时提供商故障改写为上下文溢出。这些失败应走 Pi 的常规重试机制。

## 测试集成

至少测试以下情况：

- 普通和空文本响应
- 工具调用及工具结果
- 受支持时的图像输入和图像工具结果
- 用量与费用统计
- 中止行为
- 上下文溢出
- 格式错误或不完整的流
- Unicode 边界
- 跨提供商会话交接
- 身份验证刷新与取消

[`packages/ai/test`](https://github.com/earendil-works/pi/tree/main/packages/ai/test) 下的提供商测试定义了内置提供商的预期行为。应适配相关测试套件，而不只是依赖手动提示测试。

开发时直接运行扩展，之后再将其移到会被自动发现的扩展位置，或通过 [Pi 包](packages.md)分发。在活动会话中修改自动发现的提供商扩展后，使用 `/reload`。

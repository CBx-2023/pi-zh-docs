# 模型配置

<!-- This file is generated from TypeScript source. Do not edit it manually; run npm run generate:references. -->

本参考列出 `models.json` 的字段。示例见[配置兼容端点](models.md#configure-a-compatible-endpoint)，文件位置见[配置](configuration.md#agent-directory)。

在 `models.json` 中添加 `"$schema": "https://pi.dev/schemas/models.schema.json"`，即可获得编辑器校验与补全。

## 提供商

`providers` 下的每个键都是提供商 ID。内置提供商 ID 会修改该提供商；其他 ID 则添加一个提供商，需要在提供商或模型级别设置 `baseUrl` 和 `api`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `name` | string |  | 显示名称。 |
| `baseUrl` | string |  | API 基础 URL，也适用于该提供商的内置模型。 |
| `apiKey` | string |  | 字面值密钥、"$NAME" 环境变量插值，或 "!command" 的输出。 |
| `api` | string |  | 提供商模型使用的 API，例如 "openai-completions"、"openai-responses"、"anthropic-messages" 或 "google-generative-ai"。 |
| `oauth` | `"radius"` |  | OAuth 登录流程。要求设置 baseUrl。 |
| `headers` | object |  | 请求头，其值按 apiKey 的方式解析。 |
| `compat` | [object](#compatibility) |  | 提供商与模型的兼容性覆盖配置。 |
| `authHeader` | boolean | `false` | 是否将解析得到的 API Key 作为 Authorization: Bearer 发送。 |
| `models` | [`object[]`](#models) |  |  |
| `modelOverrides` | [object](#model-overrides) |  |  |

## 模型

每个 `models` 条目为提供商添加一个模型。如果条目的 `id` 匹配已有模型，则替换该模型。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `id` | string |  | 必填。发送给 API 的模型 ID。 |
| `name` | string |  | 显示名称，也用于 --model 模式匹配。 |
| `api` | string |  | 覆盖提供商的 api。 |
| `baseUrl` | string |  | 覆盖提供商的 baseUrl。 |
| `reasoning` | boolean | `false` | 模型是否支持思考。 |
| `thinkingLevelMap` | object |  | 各思考级别发送给提供商的值。null 表示不支持该级别。模型未映射的级别，在 high 及以下使用提供商默认值；xhigh 和 max 不受支持。 |
| `input` | `("text" \| "image")[]` | `["text"]` |  |
| `inputLimits` | [object](#input-limits) |  |  |
| `cost` | object |  |  |
| `cost.input` | number |  | 必填。每百万输入 Token 的美元费用。 |
| `cost.output` | number |  | 必填。每百万输出 Token 的美元费用。 |
| `cost.cacheRead` | number |  | 必填。每百万缓存读取 Token 的美元费用。 |
| `cost.cacheWrite` | number |  | 必填。每百万缓存写入 Token 的美元费用。 |
| `cost.tiers` | `object[]` |  | 适用于整个请求的分层价格。匹配的最高输入阈值所对应的价格应用于整个请求。 |
| `cost.tiers[].inputTokensAbove` | number |  | 必填。请求总输入超过此 Token 数时，使用该价格层级。 |
| `cost.tiers[].input` | number |  | 必填。每百万输入 Token 的美元费用。 |
| `cost.tiers[].output` | number |  | 必填。每百万输出 Token 的美元费用。 |
| `cost.tiers[].cacheRead` | number |  | 必填。每百万缓存读取 Token 的美元费用。 |
| `cost.tiers[].cacheWrite` | number |  | 必填。每百万缓存写入 Token 的美元费用。 |
| `promptCache` | object |  | 短期与长期保留层级的尽力而为提示缓存寿命，单位为秒。Pi 只为寿命已知的层级保温。 |
| `contextWindow` | number | `128000` | 上下文窗口大小，以 Token 为单位。 |
| `maxTokens` | number | `16384` | 最大输出 Token 数。 |
| `samplingParams` | object |  | 合并到每个请求体的字段。仅适用于兼容 OpenAI 的 API。 |
| `samplingParamsByThinkingLevel` | object |  | 按思考级别设置的 samplingParams，在 samplingParams 之上合并。 |
| `headers` | object |  | 请求头，其值按 apiKey 的方式解析。 |
| `compat` | [object](#compatibility) |  | 提供商与模型的兼容性覆盖配置。 |

## 模型覆盖配置

每个 `modelOverrides` 键都是一个内置或扩展模型的 ID。未知 ID 会被忽略。对象字段，例如 `cost`，逐字段与模型值合并；其他字段直接替换。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `name` | string |  | 显示名称，也用于 --model 模式匹配。 |
| `reasoning` | boolean |  | 模型是否支持思考。 |
| `thinkingLevelMap` | object |  | 各思考级别发送给提供商的值。null 表示不支持该级别。模型未映射的级别，在 high 及以下使用提供商默认值；xhigh 和 max 不受支持。 |
| `input` | `("text" \| "image")[]` |  |  |
| `inputLimits` | [object](#input-limits) |  |  |
| `cost` | object |  |  |
| `cost.input` | number |  | 每百万输入 Token 的美元费用。 |
| `cost.output` | number |  | 每百万输出 Token 的美元费用。 |
| `cost.cacheRead` | number |  | 每百万缓存读取 Token 的美元费用。 |
| `cost.cacheWrite` | number |  | 每百万缓存写入 Token 的美元费用。 |
| `cost.tiers` | `object[]` |  | 适用于整个请求的分层价格。匹配的最高输入阈值所对应的价格应用于整个请求。 |
| `cost.tiers[].inputTokensAbove` | number |  | 必填。请求总输入超过此 Token 数时，使用该价格层级。 |
| `cost.tiers[].input` | number |  | 必填。每百万输入 Token 的美元费用。 |
| `cost.tiers[].output` | number |  | 必填。每百万输出 Token 的美元费用。 |
| `cost.tiers[].cacheRead` | number |  | 必填。每百万缓存读取 Token 的美元费用。 |
| `cost.tiers[].cacheWrite` | number |  | 必填。每百万缓存写入 Token 的美元费用。 |
| `promptCache` | object |  | 短期与长期保留层级的尽力而为提示缓存寿命，单位为秒。Pi 只为寿命已知的层级保温。 |
| `contextWindow` | number |  | 上下文窗口大小，以 Token 为单位。 |
| `maxTokens` | number |  | 最大输出 Token 数。 |
| `samplingParams` | object |  | 合并到每个请求体的字段。仅适用于兼容 OpenAI 的 API。 |
| `samplingParamsByThinkingLevel` | object |  | 按思考级别设置的 samplingParams，在 samplingParams 之上合并。 |
| `headers` | object |  | 请求头，其值按 apiKey 的方式解析。 |
| `compat` | [object](#compatibility) |  | 提供商与模型的兼容性覆盖配置。 |

## 输入限制

见[描述模型输入与缓存](models.md#describe-model-input-and-caching)。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `maxRequestBytes` | integer |  | 序列化后提供商请求的最大大小，单位为字节。 |
| `images` | object |  |  |
| `images.resize` | object |  | 新图像进入对话历史前应用的、保持缓存安全的缩放配置。 |
| `images.resize.maxWidth` | integer |  |  |
| `images.resize.maxHeight` | integer |  |  |
| `images.resize.maxBytes` | integer |  | base64 编码后载荷的最大大小，单位为字节。 |
| `images.resize.jpegQuality` | integer |  |  |
| `images.maxPerMessage` | integer |  | 单条提供商消息最多接受的图像数量。 |
| `images.maxPerRequest` | integer |  | 单次提供商请求合计最多接受的图像数量。 |

## 兼容性

`compat` 描述已验证的、与某个 API 标准请求和响应行为的差异。模型值按字段覆盖提供商值。适用字段取决于模型的 `api`。

### `openai-completions`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsStore` | boolean |  | 提供商是否支持 store 字段。默认根据 URL 自动检测。 |
| `supportsDeveloperRole` | boolean |  | 提供商是否支持使用 developer 角色代替 system。默认根据 URL 自动检测。 |
| `supportsReasoningEffort` | boolean |  | 提供商是否支持 reasoning_effort。默认根据 URL 自动检测。 |
| `supportsUsageInStreaming` | boolean | `true` | 提供商是否支持通过 stream_options.include_usage 返回流式响应的 Token 用量。 |
| `supportsFinishReason` | boolean | `true` | 流式响应是否包含 finish_reason。为 false 时，Pi 在流结束时推断 stop 或 toolUse。 |
| `maxTokensField` | `"max_completion_tokens" \| "max_tokens"` |  | 用于指定最大 Token 数的字段。默认根据 URL 自动检测。 |
| `requiresToolResultName` | boolean |  | 工具结果是否要求 name 字段。默认根据 URL 自动检测。 |
| `requiresAssistantAfterToolResult` | boolean |  | 工具结果之后的用户消息，是否要求在两者之间插入助手消息。默认根据 URL 自动检测。 |
| `requiresThinkingAsText` | boolean |  | 是否必须将思考块转换为带有 &lt;thinking> 分隔符的文本块。默认根据 URL 自动检测。 |
| `requiresReasoningContentOnAssistantMessages` | boolean |  | 启用推理时，是否必须为所有回放的助手消息包含空 reasoning_content 字段。默认根据 URL 自动检测。 |
| `thinkingFormat` | `"openai" \| "openrouter" \| "deepseek" \| "together" \| "baseten" \| "zai" \| "qwen" \| "chat-template" \| "qwen-chat-template" \| "string-thinking" \| "ant-ling"` |  | 推理或思考参数的格式。省略时，Pi 根据提供商 URL 自动检测。"openai" 使用 reasoning_effort；"openrouter" 使用 reasoning.effort；"deepseek" 使用 thinking.type，并在支持时附加 reasoning_effort；"together" 使用 reasoning.enabled，并在支持时附加 reasoning_effort；"baseten" 使用可配置的 chat_template_args，并在支持时附加 reasoning_effort；"zai" 使用 thinking.type；"qwen" 使用顶层 enable_thinking；"qwen-chat-template" 使用 chat_template_kwargs.enable_thinking 和 preserve_thinking；"chat-template" 使用可配置的 chat_template_kwargs；"string-thinking" 使用顶层 thinking；"ant-ling" 则只在映射后的 effort 非 null 时使用 reasoning.effort。 |
| `chatTemplateKwargs` | object |  | thinkingFormat 为 "chat-template" 时，作为 chat_template_kwargs 发送的关键字参数。使用 $var 配合 "thinking.enabled"、"thinking.effort" 或 "thinking.budget" 表示由 Pi 控制的值。 |
| `chatTemplateArgs` | object |  | thinkingFormat 为 "baseten" 时，作为 chat_template_args 发送的参数。使用 $var 配合 "thinking.enabled"、"thinking.effort" 或 "thinking.budget" 表示由 Pi 控制的值。 |
| `openRouterRouting` | object |  | OpenRouter 提供商路由偏好，控制 OpenRouter 将请求路由到哪些上游提供商。作为 OpenRouter API 请求体中的 provider 字段发送。见 https://openrouter.ai/docs/guides/routing/provider-selection 。 |
| `vercelGatewayRouting` | object |  | Vercel AI Gateway 路由偏好，控制网关将请求路由到哪些上游提供商。见 https://vercel.com/docs/ai-gateway/models-and-providers/provider-options 。 |
| `zaiToolStream` | boolean | `false` | z.ai 是否支持通过顶层 tool_stream 流式返回工具调用增量。 |
| `thinkingTokenBudgetField` | `"thinking_token_budget" \| "thinking_budget" \| "thinking_budget_tokens"` |  | 用于根据 thinkingBudgets 限制推理 Token 的顶层请求字段。在这些端点上，推理与答案共享 max_tokens。"thinking_token_budget" 对应 vLLM，"thinking_budget" 对应 Qwen、DashScope 或 SGLang，"thinking_budget_tokens" 对应 llama.cpp。默认关闭，生成的目录中不设置此字段。 |
| `supportsThinkingTokenBudget` | boolean | `false` | thinkingTokenBudgetField 的别名："thinking_token_budget"（vLLM）。优先使用 thinkingTokenBudgetField。 |
| `supportsOpenAIGrammarTools` | boolean | `false` | 提供商是否支持采用 Lark 或正则表达式语法格式的 OpenAI 自定义工具。为 false 时，受语法约束的工具回退为普通函数工具。生成的目录会为具备此能力的模型启用。 |
| `supportsMidConvoSystemMessages` | boolean | `false` | 该具体模型是否接受对话开始后的 system 或 developer 消息。为 false 时，后续系统消息会合并进开头的系统消息。生成的目录会为已验证模型启用。 |
| `supportsMidConvoToolAdditions` | boolean | `false` | 系统消息能否在对话中途引入额外工具。要求 supportsMidConvoSystemMessages。生成的目录会为具备此能力的模型启用。 |
| `supportsStrictMode` | boolean | `false` | 提供商是否支持工具定义中的 strict 字段。生成的、具备相应能力的模型会显式启用。 |
| `cacheControlFormat` | `"anthropic"` |  | 提示缓存的缓存控制约定。Anthropic 会在系统提示、最后一个工具定义，以及最后一条用户、助手或工具结果的文本内容上应用 cache_control 标记。 |
| `sendSessionAffinityHeaders` | boolean |  | 是否发送来自 options.sessionId 的会话亲和性数据。OpenRouter 端点默认为 true，其他情况为 false。 |
| `sessionAffinityFormat` | `"openai" \| "openai-nosession" \| "openrouter"` |  | 会话亲和性请求头格式。openai 发送 session_id、x-client-request-id 和 x-session-affinity；openai-nosession 发送 x-client-request-id 和 x-session-affinity；openrouter 发送 x-session-id。不影响 prompt_cache_key。默认自动检测。 |
| `supportsLongCacheRetention` | boolean |  | 提供商是否支持长期提示缓存保留；依格式使用 prompt_cache_retention: "24h" 或 Anthropic 风格的 cache_control.ttl: "1h"。默认根据提供商和 URL 自动检测。 |
| `vllmPriority` | number |  | 作为顶层 priority 请求字段发送的 vLLM 调度优先级。值越小越早处理，服务器默认值为 0。仅在 --scheduling-policy priority 下有意义。默认关闭，生成的目录中不设置。 |

### `openai-responses`

也适用于 `azure-openai-responses` 和 `openai-codex-responses`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsDeveloperRole` | boolean | `true` | 提供商是否支持使用 developer 角色代替 system。 |
| `supportsMidConvoSystemMessages` | boolean | `false` | 该具体模型是否接受对话开始后的 developer 或 system 消息。为 false 时，后续系统消息会合并进开头的系统消息。生成的目录会为已验证模型启用。 |
| `sessionAffinityFormat` | `"openai" \| "openai-nosession" \| "openrouter"` |  | 会话亲和性请求头格式。openai 发送 session_id 和 x-client-request-id；openai-nosession 发送 x-client-request-id；openrouter 发送 x-session-id。不影响 prompt_cache_key。默认自动检测。 |
| `supportsLongCacheRetention` | boolean | `true` | 提供商是否支持长期提示缓存保留。在 GPT-5.6+ 上使用 prompt_cache_options.ttl: "30m"，在更早模型上使用 prompt_cache_retention: "24h"。 |
| `supportsStrictMode` | boolean |  | 提供商是否支持严格的 JSON Schema 函数工具。默认值因 API 而异；生成的 OpenAI 模型会显式启用。 |
| `supportsOpenAIGrammarTools` | boolean | `false` | 是否发出采用 Lark 或正则表达式语法格式的 OpenAI 自定义工具。为 false 时，受语法约束的工具回退为普通函数工具。生成的目录会为具备此能力的模型启用。 |
| `supportsAdditionalTools` | boolean | `false` | 模型是否支持锚定消息的 additional_tools 输入条目。 |
| `supportsToolSearch` | boolean | `false` | 模型是否支持客户端执行的工具搜索，用于锚定对话记录的工具添加。 |
| `supportsExplicitPromptCacheMode` | boolean | `false` | 模型是否接受 prompt_cache_options。较早的 OpenAI 模型会拒绝该参数。 |
| `supportsMidConvoEffort` | boolean | `false` | 是否将思考级别变化作为 configuration_update 输入条目发送，而不是修改 reasoning.effort，以便变化后仍保留提示缓存。仅供 openai-responses API 使用；在 openai 提供商上通过 Sign in with ChatGPT 登录时忽略。 |
| `supportsMaxOutputTokens` | boolean | `true` | 提供商是否接受 max_output_tokens。一些采用 Codex 协议的网关会拒绝它。 |

### `anthropic-messages`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsEagerToolInputStreaming` | boolean | `true` | 提供商是否接受按工具设置的 eager_input_streaming。为 false 时，Anthropic 提供商省略 tools[].eager_input_streaming，并为启用工具的请求发送旧版 fine-grained-tool-streaming-2025-05-14 beta 请求头。 |
| `supportsLongCacheRetention` | boolean | `true` | 提供商是否支持通过 cache_control.ttl 使用 Anthropic 长期缓存保留。 |
| `sendSessionAffinityHeaders` | boolean |  | 启用缓存时，是否根据 options.sessionId 发送 x-session-affinity。Fireworks 等使用会话亲和性路由提示缓存的提供商要求此项；将请求发往同一副本可以最大化缓存命中。OpenRouter 端点默认为 true，其他情况为 false。 |
| `sessionAffinityFormat` | `"openrouter"` |  | 会话亲和性格式。openrouter 发送 x-session-id；未设置时发送 x-session-affinity。 |
| `supportsCacheControlOnTools` | boolean | `true` | 提供商是否支持工具定义上的 Anthropic 风格 cache_control 标记。为 false 时，工具参数中省略 cache_control。Fireworks 等部分兼容 Anthropic 的提供商不支持工具上的此字段，可能拒绝或忽略它。 |
| `supportsTemperature` | boolean | `true` | 模型是否接受 Anthropic temperature 请求字段。Claude Opus 4.7+ 会拒绝非默认值。 |
| `forceAdaptiveThinking` | boolean | `false` | 是否不考虑模型 ID，强制使用自适应思考，即 thinking.type: adaptive 加 output_config.effort。要求自适应思考的内置模型，会在生成的元数据中设置此项。自定义的兼容 Anthropic 提供商，可以为任何上游要求自适应格式的模型设为 true。在覆盖的内置模型上设为 false 可关闭。 |
| `allowEmptySignature` | boolean | `false` | 是否回放空思考签名，而不是将思考转换为文本。 |
| `supportsStrictTools` | boolean | `false` | 提供商是否支持 Anthropic 严格工具 Schema。生成的 Anthropic 模型会显式启用。 |
| `supportsMidConvoEffort` | boolean | `false` | 该具体模型传输是否支持仅调整 effort 的系统消息，以及思考绑定控制。 |
| `supportsMidConvoSystemMessages` | boolean | `false` | 该具体模型是否接受对话内部的 system 角色消息。为 false 时，后续系统消息会合并进顶层系统提示。 |
| `supportsMidConvoToolChanges` | boolean | `false` | 该具体模型是否接受对话中途的 tool_addition 与 tool_removal 块。要求 supportsMidConvoSystemMessages。 |
| `allowedFallbackModels` | `object[]` |  | Anthropic 接受的、服务器端拒答时可用的回退模型，包含返回的回退响应所需的本地价格元数据。不存在或为空时，调用方必须省略 fallbacks；对于没有允许回退目标的模型，Anthropic 会拒绝该字段。 |

### `bedrock-converse-stream`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsStrictMode` | boolean | `false` | 模型是否支持 Bedrock 严格工具 Schema。 |

### `mistral-conversations`

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `supportsMidConvoSystemMessages` | boolean | `false` | 该具体模型是否接受对话开始后的系统消息。为 false 时，后续系统消息会合并进开头的系统消息。 |

### `typesafe-system-one`

也适用于 `cloudflare-workers-ai-system-one`。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `imageInput` | `"assets" \| "images" \| "state-image-urls"` |  | 服务接收分类图像的方式。"assets" 发送 TypeSafe 的 assets 映射，支持 PNG 和 JPEG，并从状态中引用图像，符合 TypeSafe 和 Workers AI 上 Jev 的要求。"images" 发送 Clef 的图像数据 URL 列表，支持 PNG、JPEG 和 WebP，最多四张，符合 Workers AI 上 Clef 的要求。"state-image-urls" 在状态之前放置 image_url 部分，符合 OpenRouter 的要求；OpenRouter 会丢弃 assets，且不报错。根据提供商、baseUrl 和模型 ID 自动检测。分类模型从提供商级 compat 读取；models 和 modelOverrides 条目只适用于聊天模型。 |
| `sendImageOptInHeader` | boolean |  | 带图像的请求是否发送 TypeSafe-Danger-Zone-Images: true 请求头，TypeSafe 自己的 API 要求此请求头才能使用其实验性图像输入。对于 typesafe-system-one API，默认 true，除非模型被检测为 OpenRouter。 |

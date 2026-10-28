# 选择模型

对于内置提供商，先通过 `/login` 登录，再使用 `/model` 选择模型。只有 Pi 尚未包含你需要的提供商或端点时，才应使用自定义模型配置。

## 选择连接方式

| 你已有的资源 | 推荐配置 |
|---|---|
| 受支持的订阅账号 | 通过 `/login` 登录 |
| 提供商 API Key | 通过 `/login` 保存，或设置相应环境变量 |
| 本地 GGUF 模型 | 将 Pi 连接到 llama.cpp 路由器 |
| OpenAI、Anthropic 或 Google 兼容端点 | 将其加入 `models.json` |
| 使用自定义协议或身份验证流程的提供商 | 构建或安装提供商扩展 |

浏览[模型目录](https://pi.dev/models)，了解当前提供商、模型 ID、能力、上下文限制和价格。Pi 启动时使用内置目录，并可叠加来自 pi.dev 的较新目录数据。缓存目录数据在离线时仍可用；运行 `pi update --models` 可强制刷新。

## 身份验证

运行 `/login` 并选择提供商。Pi 将凭据保存在 [`auth.json`](configuration.md#agent-directory) 中。运行 `/logout`，可移除某个提供商已保存的凭据。

你也可以通过提供商对应的环境变量提供 API Key。这适合 CI 等不希望 Pi 写入凭据的环境。[提供商](providers.md)列出了环境变量及各提供商的专用配置。

配置了多个凭据来源时，Pi 优先使用运行时 `--api-key`，然后依次使用已保存在 `auth.json` 中的凭据、`models.json` 中的 `apiKey`，最后使用提供商的环境变量或环境中的云凭据。提供商扩展可以定义自己的身份验证行为。

请妥善保护 `auth.json` 和所有凭据命令。信任项目后，项目设置与扩展可能在 Pi 进程内部执行。从不可信目录加载配置之前，请阅读[安全](security.md)。

## 选择模型

运行 `/model` 搜索可用模型。选择器显示提供商具有可用身份验证的模型。在某个模型上按 `Ctrl+S`，可将其保存为新会话的默认模型。

运行 `/thinking`，选择当前模型的思考级别。在该界面按 `Ctrl+S`，可保存启动时的级别。Pi 仅提供所选模型支持的级别。

`Ctrl+P` 循环切换可用模型。使用 `/scoped-models` 控制循环范围并保存选择，或通过[设置](settings.md#model-cycling)配置模型模式。

会话会记录模型和思考级别的变化。恢复会话时会还原它们，但不会修改新会话的默认值。

## 连接本地模型

Pi 直接集成 llama.cpp 路由器。路由器发现 GGUF 文件，并按需加载模型。Pi 的 `/llama` 命令用于管理路由器，`/model` 则从已加载模型中选择一个。

服务器启动、模型目录布局、下载和连接故障排查，请参阅[通过 llama.cpp 使用本地模型](llama-cpp.md)。

对于 Ollama、LM Studio、vLLM、SGLang 及其他兼容服务器，请在 `models.json` 中[配置兼容端点](#configure-a-compatible-endpoint)。

## 配置兼容端点

端点使用 Pi 已支持的 API 时，使用 [`models.json`](configuration.md#agent-directory)。这适用于大多数 Ollama、LM Studio、vLLM、SGLang 和代理部署。

```json
{
  "$schema": "https://pi.dev/schemas/models.schema.json",
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

占位密钥会使模型对 Pi 可用；Ollama 会忽略它。对于需要身份验证的端点，`apiKey` 和请求头的值可以使用 `$NAME` 或 `${NAME}` 环境变量插值、字面值，或以 `!command` 开头的命令。`$$` 和 `$!` 分别产生字面的 `$` 和 `!`。`models.json` 中的命令在请求时运行，Pi 不会缓存它们。

打开 `/model` 时，会重新加载文件。`models` 条目会在该提供商下添加模型，或替换相同 ID 的模型。使用 `modelOverrides` 可以修改已有内置或扩展提供模型的元数据，而不替换提供商的模型列表。未知的覆盖 ID 会被忽略。

要通过代理路由内置提供商，只需设置其 `baseUrl`。其模型和身份验证保持不变：

```json
{
  "providers": {
    "anthropic": { "baseUrl": "https://proxy.example.com/v1" }
  }
}
```

[模型配置](models-configuration.md)列出了全部字段。

### 描述模型输入和缓存

使用 `inputLimits.images.resize`，控制 Pi 在将新图像附件、`read` 结果和工具结果图像存入对话历史之前，如何对其编码：

```json
{
  "id": "vision-model",
  "input": ["text", "image"],
  "inputLimits": {
    "images": {
      "resize": {
        "maxWidth": 1568,
        "maxHeight": 1568,
        "maxBytes": 524288,
        "jpegQuality": 75
      }
    }
  }
}
```

`maxBytes` 限制 base64 编码后载荷的大小。省略的缩放字段使用保守默认值：2000×2000 像素、编码后 4.5 MiB、JPEG 质量 80。图像只编码一次，切换模型不会改写历史图像。目录也可以通过 `inputLimits.maxRequestBytes`、`images.maxPerMessage` 和 `images.maxPerRequest` 描述严格请求限制，但 Pi 目前还不会根据这些限制改写或拒绝历史内容。

<a id="prompt-cache-lifetimes"></a>

使用 `promptCache`，以秒为单位声明提供商针对 `short` 或 `long` 保留级别提供的尽力而为缓存时长：

```json
{ "id": "claude-sonnet-5", "promptCache": { "short": 300, "long": 3600 } }
```

对于公布的时长范围，应选择较保守的一端。模型如果未为当前级别声明时长，就不能进行缓存预热。`modelOverrides` 条目可以为内置或扩展模型设置 `inputLimits` 或 `promptCache`，包括通过已验证代理访问的模型。参阅 [`cacheWarming`](settings.md#model-and-thinking)。

### 按思考级别配置采样

OpenAI 兼容 API 支持自由格式的 `samplingParams` 模型默认值，以及 `samplingParamsByThinkingLevel` 覆盖。后者使用 Pi 的思考级别键（`off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和 `max`），而不是 `thinkingLevelMap` 中的提供商值：

```json
{
  "id": "qwen-thinking-model",
  "reasoning": true,
  "samplingParams": {
    "temperature": 1.0,
    "top_p": 0.95
  },
  "samplingParamsByThinkingLevel": {
    "off": {
      "temperature": 0.7,
      "top_p": 0.8
    },
    "high": {
      "top_k": 20
    }
  }
}
```

Pi 首先将不受支持的思考级别限制到有效范围，再依次合并模型的 `samplingParams`、实际级别的覆盖值，以及请求级 `samplingParams`。相同键以后面的值为准。缺失的级别继承模型默认值。`modelOverrides` 会将各级别条目按键与基础模型合并。这些字段仅适用于 `openai-completions`、`openai-responses` 和 `azure-openai-responses`，其他 API 会忽略它们。

兼容性设置应描述已经验证的端点请求或响应行为差异。不要仅凭端点宣称兼容 OpenAI 或 Anthropic，就启用相应设置。

## 使用分类器模型

分类器模型不进行聊天。它们回答关于 JSON 状态的带类型问题：从多个选项中选择一个、回答是或否，或给出评分，每种答案都附带概率。Pi 包含下列提供商提供的 TypeSafe Jev 模型、Workers AI 和 OpenRouter 提供的 Cloudflare Clef、Clef Flash 与 Clef Omni 模型，以及通过 [Decisions API](https://developers.openai.com/api/docs/guides/decisions)提供的 OpenAI GPT-6 Luna：

| 提供商 | 模型 ID | 身份验证 |
|---|---|---|
| `typesafe` | `jev-latest` | `TYPESAFE_API_KEY` |
| `openrouter` | `typesafe/jev-1.13`、`typesafe/jev-1.14`、`~typesafe/jev-latest`、`cloudflare/clef`、`cloudflare/clef-flash`、`cloudflare/clef-omni` | `OPENROUTER_API_KEY` 或 `/login` |
| `cloudflare-workers-ai` | `typesafe/jev`、`typesafe/jev-1.14.0`、`@cf/cloudflare/clef`、`@cf/cloudflare/clef-flash`、`@cf/cloudflare/clef-omni` | `CLOUDFLARE_API_KEY` 和 `CLOUDFLARE_ACCOUNT_ID` |
| `vercel-ai-gateway` | `typesafe-ai/jev` | `AI_GATEWAY_API_KEY` |
| `opencode` | `jev-1.13`、`jev-1.13-free` | `OPENCODE_API_KEY` |
| `openai` | `gpt-6-luna` | `OPENAI_API_KEY` |

[llama.cpp 路由器](llama-cpp.md#classification)上的聊天模型，也会列为分类器模型。

OpenAI 的 Decisions API 需要 API Key，无法使用 ChatGPT 登录凭据。因此，当 `openai` 通过 `/login` 登录时，即使设置了 `OPENAI_API_KEY`，`gpt-6-luna` 也不会显示为可用；要使用该密钥，请先退出 `openai` 登录。该 API 会拒绝超过 922K token 的输入；运行时间超过约五秒的请求，目前大致对应超过 600K 输入 token，会因网关超时而失败。

分类器模型不会出现在 `/model` 中。模型通过 [`codemode`](cli.md#enable-codemode) 工具访问它们；除非 MCP Server 将其打开，否则该工具默认关闭。要启用，可在[设置](settings.md#tools)中添加 `"defaultTools": ["+codemode"]`。随后，脚本通过 `models.getAvailableOfType("classifier")` 列出分类器模型，并调用 `models.classify(model, { state, questions })`：

```js
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const result = await models.classify(jev, {
  state: { message: "The change works, thanks." },
  questions: {
    approved: {
      type: "bool",
      instructions: "Does the user approve of the result?",
      criteria: { true: "Approval", false: "No approval" },
    },
  },
});
return result.answers;
```

[Codemode](codemode.md#classify) 描述了问题和答案类型。

`input` 包含 `"image"` 的分类器模型，也会判断通过 `images` 传入的图像；其他分类器模型收到图像会返回错误。支持图像输入的包括：GPT-6 Luna、来自 `typesafe` 和 `cloudflare-workers-ai` 的 Jev、来自 `cloudflare-workers-ai` 的 Clef，以及目录中声明支持图像输入的 OpenRouter 模型。Jev 接受 PNG 和 JPEG 图像，且 TypeSafe 自有 API 上的图像输入属于实验功能。Clef 接受 PNG、JPEG 和 WebP，每次请求最多四张图像。来自 `vercel-ai-gateway` 和 `opencode` 的 Jev 仅接受文本。

各 System One 服务使用不同的图像请求格式，由模型的 `compat.imageInput` 设置。内置模型已设置该值，因此覆盖提供商的 `baseUrl` 时会保留它。代理其他服务分类器的自定义提供商，需要在 `models.json` 的提供商级 `compat` 中设置该值，参阅 [System One 兼容性](models-configuration.md#typesafe-system-one)。尤其需要注意，OpenRouter 会接受 TypeSafe 格式的请求且不报错，但会丢弃图像。

服务报告 token 数量时，所有 System One 服务都会如此，`result.usage` 会携带用量及费用。Pi 将脚本中分类器调用的用量加入 `codemode` 工具结果，使其计入底栏和 `/session` 中的会话费用。费用使用模型目录价格；没有目录价格的模型，例如 TypeSafe 直连的 `jev-latest`，会报告 token 用量，但费用为零。

扩展通过 `ctx.modelRegistry.classify()` 调用分类器，无需 codemode。[虚拟模型](virtual-models.md#route-requests)可以使用分类器路由请求，参阅 `jev-router.ts` 示例。

## 使用图像模型

图像模型根据提示和可选的输入图像生成图像。Pi 在 `openrouter` 提供商下列出 OpenRouter 的图像模型，例如 `google/gemini-2.5-flash-image` 和 `black-forest-labs/flux.2-pro`；它们与聊天模型使用相同的 `OPENROUTER_API_KEY` 或 `/login` 凭据。

与分类器模型类似，图像模型不会出现在 `/model` 中，模型通过 [`codemode`](cli.md#enable-codemode) 工具访问它们。脚本使用 `models.getAvailableOfType("image")` 列出图像模型，并调用 `models.generateImages(model, { input })`。结果中的 `output` 保存 base64 图像块，`image()` 将其附加到 `codemode` 结果中，使模型能够看到图像：

```js
const painter = await models.getModelOfType("image", "openrouter", "google/gemini-2.5-flash-image");
const result = await models.generateImages(painter, {
  input: [{ type: "text", text: "A red fox in the snow, watercolor" }],
});
if (result.stopReason !== "stop") return result.errorMessage;
for (const block of result.output) if (block.type === "image") image(block);
```

`input` 也可以包含 `{ type: "image", data, mimeType }` 块，用于编辑或作为参考。与分类器调用相同，Pi 将脚本中图像调用的用量加入 `codemode` 工具结果。生成的图像不会保存到磁盘。完整 API 请参阅 [Codemode](codemode.md#generate-images)。

扩展通过 `ctx.modelRegistry.generateImages()` 生成图像，无需 codemode。

## 添加自定义提供商

提供商需要自定义流式处理、模型发现或身份验证行为时，应使用扩展。相关工作流请参阅[自定义提供商](custom-provider.md)。

## 故障排查

### 模型没有显示

确认其提供商具有可用的身份验证。自定义模型可以从 `models.json` 加载，但在 Pi 能够解析到凭据之前，不会在 `/model` 中可用。对于 llama.cpp，只有路由器当前加载的模型才会显示。

### 身份验证只在某个 shell 中有效

检查密钥是否来自环境变量，而非 `auth.json`。环境变量必须存在于启动 Pi 的进程中。

### 登录在远程机器上打开浏览器

提供商支持无界面身份验证流程时，请完成相应流程。有些提供商允许将最终重定向 URL 或授权码粘贴回 Pi，参阅[交互式身份验证](providers.md#authenticate-interactively)。

### 兼容端点拒绝请求

检查 `models.json` 中的 API 类型和兼容性设置。上游服务器必须支持相应请求字段与行为。

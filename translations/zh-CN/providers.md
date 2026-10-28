# 提供商

大多数托管提供商支持以下一种或两种身份验证方式：

- 通过浏览器或基于 OAuth 的设备流程登录。
- 提供 API Key。

使用 `/login [provider]` 查看某个提供商支持的方式。Amazon Bedrock 和 Google Vertex AI 还可以使用环境中的云凭据。

## 交互式身份验证

运行 `/login` 并选择提供商。Pi 会引导你完成 OAuth 或 API Key 流程，并将得到的凭据保存到 [`auth.json`](configuration.md#agent-directory)。

在远程或无头机器上，OAuth 回调可能无法到达本地进程。出现提示时，请将最终重定向 URL 或授权码粘贴回 Pi。

运行 `/logout` 并选择提供商，可以移除其存储的凭据。这不会取消环境变量、移除 `models.json` 中的身份验证配置，也不会在提供商处撤销凭据。

`auth.json` 可能包含 API Key 和 OAuth Token。请保持其私密，不要提交到仓库。

## 使用环境中的 API Key

环境变量适用于 CI，以及不希望 Pi 存储密钥的任何场景。请在启动 Pi 之前设置变量：

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

下表涵盖使用单个主要 API Key 变量的提供商。需要额外配置或支持环境凭据的提供商，见[提供商专用配置](#provider-specific-config)。

| 提供商 | 环境变量 |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| Ant Ling | `ANT_LING_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |
| ZAI Coding Plan（全球） | `ZAI_API_KEY` |
| ZAI Coding Plan（中国） | `ZAI_CODING_CN_API_KEY` |
| OpenCode Zen 和 Go | `OPENCODE_API_KEY` |
| Radius | `RADIUS_API_KEY` |
| TypeSafe（[分类模型](models.md#use-classifier-models)） | `TYPESAFE_API_KEY` |
| Hugging Face | `HF_TOKEN` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Baseten | `BASETEN_API_KEY` |
| Kimi For Coding | `KIMI_API_KEY` |
| Meta | `META_API_KEY` |
| MiniMax | `MINIMAX_API_KEY` |
| MiniMax（中国） | `MINIMAX_CN_API_KEY` |
| Moonshot AI（全球与中国） | `MOONSHOT_API_KEY` |
| Qwen Token Plan 和 Individual | `QWEN_TOKEN_PLAN_API_KEY` |
| Qwen Token Plan（中国） | `QWEN_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo | `XIAOMI_API_KEY` |
| Xiaomi MiMo Token Plan（中国） | `XIAOMI_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo Token Plan（阿姆斯特丹） | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` |
| Xiaomi MiMo Token Plan（新加坡） | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` |

Anthropic 还将 `ANTHROPIC_OAUTH_TOKEN` 识别为 API 凭据，将 `ANTHROPIC_AUTH_TOKEN` 用于 Bearer 身份验证。

未设置密钥或 Token，但设置了 `ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID` 和 `ANTHROPIC_IDENTITY_TOKEN_FILE` 时，Anthropic 使用工作负载身份联合：Anthropic SDK 将身份 Token 换成短期访问 Token，并自行刷新；刷新时会重读身份 Token 文件，因此长会话中请持续更新该文件。设置了 `ANTHROPIC_SERVICE_ACCOUNT_ID` 和 `ANTHROPIC_WORKSPACE_ID` 时，也会将它们传递下去。

## 从命令加载 API Key

要使用密钥管理器，同时避免将解析后的密钥写入磁盘，可以将 `auth.json` 中提供商的 `key` 设置为带 `!` 前缀的命令：

```json
{
  "anthropic": {
    "type": "api_key",
    "key": "!security find-generic-password -ws 'anthropic'"
  }
}
```

Pi 在首次需要密钥时运行命令，并在整个进程生命周期内缓存其标准输出。输出为空、超时或退出码非零时，密钥会保持未解析状态，直到 Pi 重启。

## 提供商专用配置

以下提供商需要额外步骤、其他设置，或可以使用其平台提供的凭据。

已存储的 API Key 凭据可以包含 `env` 对象。对于该提供商，这些值优先于进程环境：

```json
{
  "cloudflare-workers-ai": {
    "type": "api_key",
    "key": "...",
    "env": {
      "CLOUDFLARE_ACCOUNT_ID": "account-id"
    }
  }
}
```

### Radius

Radius 是 Pi 的开发团队 Earendil Works 专为 Pi 打造的服务。它提供可定制的 AI 网关，内置组织级控制和分析，以及用于分享 Pi 创作成果的产物功能。

要开始使用，在 Pi 中运行 `/login radius`。这会将 Radius 添加为提供商，其模型也会像其他提供商一样出现在 `/model` 中。

Radius 还提供 MCP Server，因此 Pi 可以代你管理 Radius。

Radius 目前处于早期 Alpha 阶段，迭代很快。更多信息见 [radius.earendil.com](https://radius.earendil.com)。

Radius 身份验证使用其网关目录，并缓存刷新后的模型元数据，供后续离线启动使用。在 `models.json` 中配置的自定义 Radius 网关，会使用自己的目录，而不是继承公共 `radius.pi.dev` 目录。

### OpenRouter

使用 `/login openrouter` 或 `OPENROUTER_API_KEY` 进行身份验证。

提供密钥后，Pi 只列出该密钥可使用的 OpenRouter 聊天模型，以及对应的上下文大小、最大输出和价格。这些数据来自 OpenRouter 的 `/models/user` 端点，反映 OpenRouter 中设置的防护规则和提供商限制。图像模型和分类模型不会被过滤。

Pi 会在交互模式启动时、打开 `/model` 时、`/login` 之后，以及执行 `pi update --models` 时，在后台刷新列表。最近一次列表会被保存，用于离线场景、`pi -p` 和 RPC 模式。如果在 `/login` 之外更换密钥，旧密钥的列表会一直保留到下次刷新。

区域端点会将模型过滤到对应区域。要使用区域端点，请在 [`models.json`](models.md#configure-a-compatible-endpoint) 中设置基础 URL：

```json
{
  "providers": {
    "openrouter": { "baseUrl": "https://us.openrouter.ai/api/v1" }
  }
}
```

如果基础 URL 在 `/models/user` 拒绝该密钥，或根本没有此端点，例如将代理配置为 OpenRouter 基础 URL，Pi 就会列出所有 OpenRouter 模型。

### Azure OpenAI

提供商 ID 为 `azure`，旧名称为 `azure-openai-responses`。在 `auth.json`、`models.json` 和 `settings.json` 中将它用作键，并用于 `--model azure/gpt-5.4` 这样的模型引用。

`azure` 提供商通过 Responses API 提供 OpenAI 模型，通过 Chat Completions 提供 Microsoft Foundry 模型，例如 `azure/deepseek-v4-pro`。

设置 API Key，并提供基础 URL 或资源名称之一：

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# Or:
export AZURE_OPENAI_RESOURCE_NAME=your-resource
```

位于 `ai.azure.com`、`cognitiveservices.azure.com` 和 `openai.azure.com` 下的资源根 URL，会被规范化为 OpenAI API 路径。

Pi 将模型 ID 作为部署名称发送。如果部署使用其他名称，通过 `AZURE_OPENAI_DEPLOYMENT_NAME_MAP` 映射：

```bash
export AZURE_OPENAI_DEPLOYMENT_NAME_MAP=gpt-5.4=my-gpt-deployment,deepseek-v4-pro=my-deepseek
```

`AZURE_OPENAI_API_VERSION` 覆盖 OpenAI 模型的 API 版本，默认为 `v1`。

要使用 Pi 尚未包含的 Foundry 模型，请在 [`models.json`](models.md#configure-a-compatible-endpoint) 的 `azure` 下添加，并设置 `api: "openai-completions"`。自定义模型要求 `baseUrl`；设置了 `AZURE_OPENAI_BASE_URL` 或 `AZURE_OPENAI_RESOURCE_NAME` 时，它们优先于该值：

```json
{
  "providers": {
    "azure": {
      "baseUrl": "https://your-resource.services.ai.azure.com",
      "models": [
        { "id": "your-deployment", "api": "openai-completions" }
      ]
    }
  }
}
```

### Amazon Bedrock

Bedrock 可以使用 Bearer Token，或环境中的 AWS 凭据来源：

```bash
# Named profile
export AWS_PROFILE=your-profile

# IAM keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
# Required for temporary credentials
export AWS_SESSION_TOKEN=...

# Bedrock bearer token
export AWS_BEARER_TOKEN_BEDROCK=...

# Region, when not supplied by the profile or AWS SDK configuration
export AWS_REGION=us-west-2
# AWS_DEFAULT_REGION is also supported
```

Pi 还通过标准的 `AWS_CONTAINER_CREDENTIALS_*` 和 `AWS_WEB_IDENTITY_TOKEN_FILE` 变量，支持 ECS 任务凭据和 IRSA。

### Cloudflare AI Gateway

网关要求提供 Token、账号 ID 和网关 ID：

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...
```

账号和网关 ID 可以来自进程环境，也可以来自 `auth.json` 中凭据的 `env` 对象。

`CLOUDFLARE_API_KEY` 用于 Pi 向网关进行身份验证。上游访问可以采用 Cloudflare 统一计费、网关中保存的凭据，或提供商在 `models.json` 中配置的 `Authorization` 请求头。

### Cloudflare Workers AI

Workers AI 要求提供 Token 和账号 ID：

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
```

账号 ID 也可以保存在凭据的 `env` 对象中。

### Google Vertex AI

使用 Google Cloud API Key：

```bash
export GOOGLE_CLOUD_API_KEY=...
```

要使用应用默认凭据，请配置项目与位置：

```bash
export GOOGLE_CLOUD_PROJECT=your-project
# GCLOUD_PROJECT is also supported
export GOOGLE_CLOUD_LOCATION=us-central1
```

然后进行身份验证：

```bash
gcloud auth application-default login
```

如需改用服务账号密钥文件，请同时设置 `GOOGLE_APPLICATION_CREDENTIALS`、项目和位置。

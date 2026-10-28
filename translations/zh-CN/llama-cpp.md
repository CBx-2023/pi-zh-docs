# 通过 llama.cpp 使用本地模型

Pi 支持 [llama.cpp](https://llama.app) 路由器服务器。路由器能够发现多个 GGUF 模型，并按需加载或卸载。

## 安装 llama.cpp

使用[官方安装器](https://llama.app/docs/installation)安装 llama.cpp：

```bash
curl -LsSf https://llama.app/install.sh | sh
```

验证安装：

```bash
llama cli --version
```

其他安装方式，包括包管理器和从源码构建，请参阅 [llama.app](https://llama.app)。

## 启动路由器

启动 `llama serve` 时，不要传入 `--model`、`-m` 或 `-hf`。传入模型会启用单模型模式，而非路由器模式。路由器配置请参阅 [llama.cpp 服务器指南](https://llama.app/docs/serve#serving-multiple-models-router-mode)。

```bash
llama serve \
  --no-models-autoload \
  --host 127.0.0.1 \
  --port 8080 \
  -ngl all \
  -c 32768
```

重要选项：

- `--no-models-autoload` 让模型仅通过 `/llama` 显式加载。
- `--jinja` 启用兼容的聊天模板与工具调用。
- `-ngl all` 将全部层卸载到 GPU。省略它则使用自动 GPU 卸载。
- `-c 32768` 将上下文大小设置为相应数量的 token。使用 `-c 0` 则采用模型的完整上下文窗口，这可能需要多得多的内存。上下文在并行服务器槽位之间共享。

单文件模型可以直接放在模型目录中。多模态模型和多分片模型应放在独立子目录：

```text
~/models/
├── llama-3.2-1b-Q4_K_M.gguf
├── gemma-3-4b-it-Q4_K_M/
│   ├── gemma-3-4b-it-Q4_K_M.gguf
│   └── mmproj-F16.gguf
└── large-model-Q4_K_M/
    ├── large-model-Q4_K_M-00001-of-00003.gguf
    ├── large-model-Q4_K_M-00002-of-00003.gguf
    └── large-model-Q4_K_M-00003-of-00003.gguf
```

手动添加文件后，请重启路由器。路由器也支持通过 `--models-preset` 使用缓存模型和预设文件，详见[服务器指南](https://llama.app/docs/serve#serving-multiple-models-router-mode)。

## 配置 Pi

启动 Pi 并配置提供商：

```text
/login llama.cpp
```

输入路由器 URL 和可选的 API Key。默认 URL 为 `http://127.0.0.1:8080`。

如果使用 `--no-models-autoload` 启动路由器，`/login llama.cpp` 只会保存连接信息。先运行 `/llama` 加载模型，再通过 `/model` 为当前会话选择已加载模型。

也可以通过环境变量配置相同的值，无需使用 `/login`：

```bash
export LLAMA_BASE_URL=http://127.0.0.1:8080
export LLAMA_API_KEY=optional-secret
pi
```

如果服务器使用 API Key，启动 `llama serve` 时，应传入匹配的 `--api-key` 值。仅供本地访问时，请保持 `--host 127.0.0.1`。

## 管理模型

运行：

```text
/llama
```

- 选择未加载模型，即可加载。
- 选择已加载模型，即可卸载。
- 选择 **Download model…**，搜索 Hugging Face，再选择仓库和量化版本。也可以使用准确的 `owner/repository[:quant]` 值。
- 加载或下载期间按 Escape，可确认取消操作。

Hugging Face 搜索优先使用已设置的 `HF_TOKEN`，然后依次检查 `$HF_TOKEN_PATH`、`$HF_HOME/token`、`$XDG_CACHE_HOME/huggingface/token` 和 `~/.cache/huggingface/token`。未进行身份验证也能搜索，但速率限制更严格。下载受限仓库之前，Pi 会发出提示，并提供其访问申请页面的链接。下载由 llama.cpp 服务器执行，因此选定仓库要求访问权限时，服务器进程也必须设置 `HF_TOKEN`。

如果还有其他已加载模型，Pi 会询问先卸载它们，还是保持加载。Pi 不会悄悄卸载模型，也绝不会删除模型文件。路由器可能与其他客户端共享，因此 `/llama` 始终显示路由器的当前状态。

已加载和休眠中的模型都会出现在 `/model` 中。选择休眠模型时，它会自动唤醒。启用路由器自动加载后，未加载的预设模型也会显示，并在被选中时加载。使用 `--no-models-autoload` 时，应先通过 `/llama` 加载模型，再进行选择。

如果路由器连接断开，`/llama` 会显示 **Retry** 和 **Close**。Retry 会重新连接并刷新模型状态，不会重新执行被中断的操作。

## 分类

分类器模型回答关于 JSON 状态的带类型问题，包括 `choice`、`bool` 和 `score`，例如 TypeSafe 的 Jev 模型。模型通过 [`codemode`](cli.md#enable-codemode) 脚本访问它们，扩展则通过 `ctx.modelRegistry.classify()` 访问；参阅[分类器模型](models.md#use-classifier-models)。Pi 以两种方式将 llama.cpp 模型列为分类器：

- **决策模型**，例如 [Julia-1、Laya、Kev、lev 和 OpenJev](https://huggingface.co/collections/ggml-org/decision-models-6abf80cca3c83f127060a769)，原生通过 llama.cpp 的 `/v1/systemone` 端点回答。它们只以分类器形式出现，使用 `typesafe-system-one` API，不出现在 `/model` 中。
- **聊天模型**也会以相同 ID 列为分类器，使用 `llama-cpp-classify` API，按照下文方式从下一个 token 的概率中读取答案。

llama.cpp 0.6.0 及更新版本会在路由器模型列表中报告决策模型，其 `architecture.output_modalities` 包含 `decisions`。路由器无需加载模型，就能从 GGUF 元数据读取这一信息，因此 Pi 也能识别未加载或休眠的决策模型。较旧的 llama.cpp 构建不会报告该信息，Pi 会将其中的决策模型列为聊天模型。

### 将聊天模型用作分类器

模型并不生成答案。每个问题都会形成一个聊天提示，依次包含状态、请求中的全部问题、再次出现的状态，最后是当前问题及使用单 token 标签标记的答案。选择题使用字母标签，最多支持 62 个选项；布尔题使用 `Yes`/`No`，评分题使用数字，最多支持 10 个级别。读取第二份状态时，模型已经看到问题；在 JevBench 上，这种方式提高了小模型的准确率。Pi 读取标签作为下一个 token 的概率，并进行归一化。选择题返回各选项的概率，以及 `(n * peak - 1) / (n - 1)` 形式的置信度；评分题返回期望级别。

- 原始标签概率通常过于自信。每次请求的 `temperature` 选项，会在归一化前用该值除以标签 logits；大于 1 的值会使分布更平缓，但不会改变任何答案。
- 问题逐个运行。同一次请求中，最终问题之前的全部内容都相同，因此服务器的提示缓存只需计算一次。状态出现两次，所以需要其自身大小两倍的上下文。
- 小模型可能遵循状态内部写入的指令。提示会要求模型将状态当作数据判断，但无法作出保证。
- Qwen3.5 等混合模型，如果没有上下文检查点，就无法回退部分缓存的提示。如果每个问题都会重新处理整个状态，请使用 `--ctx-checkpoints 32 --checkpoint-min-step 0` 启动路由器。

## 故障排查

检查能否访问路由器：

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/models
```

- **`/llama` 中没有模型：** 检查 `--models-dir`、目录布局，并重启路由器。
- **`/model` 中缺少模型，且使用了 `--no-models-autoload`：** 先通过 `/llama` 加载。
- **加载失败或占用过多内存：** 降低 `-c`，或卸载其他模型。
- **服务器未处于路由器模式：** 启动时不要传入 `--model`、`-m` 或 `-hf`。

要移除 `llama.cpp` 提供商及 `/llama`，可以在 `pi config` 的 Built-in 中禁用 `llama.cpp`，或在[设置](settings.md#resources)中配置 `"extensions": ["-builtin:llama.cpp"]`。

# 使用 NVIDIA RTX 和 llama.cpp 运行 Pi

[NVIDIA 本地 AI 推理配方](https://nvidia.github.io/local-ai-inference-recipes/index.html)提供了针对特定 NVIDIA 硬件和模型优化的 llama.cpp 设置。每个配方都会给出一条运行单个模型的 `llama-server` 命令。Pi 支持可以服务和管理多个模型的 llama.cpp 路由器，因此本指南将配方中的命令转换为路由器预设。

以下示例使用 Windows PowerShell。Pi 完整的路由器与模型管理参考，请参阅[通过 llama.cpp 使用本地模型](llama-cpp.md)。

## 开始之前

1. 打开[配方目录](https://nvidia.github.io/local-ai-inference-recipes/index.html)，选择硬件、操作系统和模型，然后选择 **llama.cpp**。检查前置条件及显存要求，并保留配方中的启动命令，供后续转换使用。
2. 按照配方中的配置说明安装 llama.cpp。配方设置依赖相应的构建，例如 CUDA 支持或推测解码选项。
3. 运行 `llama-server --help`，确认其中列出了 `--models-preset`。如果没有该选项，此构建就无法将配方加载为路由器预设。请使用仍能满足配方要求的更新构建。
4. 按照[快速入门](quickstart.md)安装 Pi。原生 Windows 用户还应参阅[在 Windows 上运行 Pi](windows.md)。

## 将配方转换为预设

预设列出一个或多个模型的设置。每个小节名称都会成为 Pi 中显示的模型 ID。将预设保存在 `llama-server` 旁边，或在启动路由器时传入预设的完整路径。

将配方命令中的每个选项转换为一行预设：

- 移除开头的连字符：`--ctx-size 65536` 变为 `ctx-size = 65536`。
- 没有值的选项写为 `true`：`--jinja` 变为 `jinja = true`。
- 移除值周围的引号和 PowerShell 续行反引号。
- 不要写入 `--host` 和 `--port`，它们属于路由器命令行选项。
- 添加 `load-on-startup = true`，让路由器启动时就加载模型。
- 将模型文件选项的短名称替换为预设中的长键名：

| 配方选项 | 预设键名 |
|---|---|
| `-hf` | `hf-repo` |
| `-hff` | `hf-file` |
| `-hfrd` | `hf-repo-draft` |
| `--spec-draft-model` | `spec-draft-model` |

例如，以下配方命令：

```powershell
llama-server.exe -hf "unsloth/Qwen3.8-27B-GGUF" `
  -hff "Qwen3.8-27B-UD-Q4_K_M.gguf" `
  -hfrd "z-lab/Qwen3.8-27B-DFlash2-GGUF" `
  --spec-draft-model "Qwen3.8-27B-DFlash2-Q4_K_M.gguf" `
  --no-mmproj `
  --host 127.0.0.1 `
  --port 9931 `
  --batch-size 4096 `
  --ubatch-size 1024 `
  --ctx-size 65536 `
  --parallel 1 `
  -ngl 999 `
  --jinja `
  --chat-template-kwargs '{"preserve_thinking":true}' `
  --spec-type draft-dflash `
  --spec-draft-n-max 7 `
  --spec-draft-backend-sampling
```

会转换为 `qwen3.8-27b.ini`：

```ini
version = 1

[qwen3.8-27b]
load-on-startup = true
hf-repo = unsloth/Qwen3.8-27B-GGUF
hf-file = Qwen3.8-27B-UD-Q4_K_M.gguf
hf-repo-draft = z-lab/Qwen3.8-27B-DFlash2-GGUF
spec-draft-model = Qwen3.8-27B-DFlash2-Q4_K_M.gguf
no-mmproj = true
batch-size = 4096
ubatch-size = 1024
ctx-size = 65536
parallel = 1
ngl = 999
jinja = true
chat-template-kwargs = {"preserve_thinking":true}
spec-type = draft-dflash
spec-draft-n-max = 7
spec-draft-backend-sampling = true
```

## 启动路由器

在 llama.cpp 目录中打开 PowerShell，运行：

```powershell
.\llama-server.exe --models-preset qwen3.8-27b.ini --host 127.0.0.1 --port 8080
```

如果配方要求 Hugging Face Token，请在启动路由器之前，在同一 PowerShell 窗口中设置 `$env:HF_TOKEN`。首次启动时，路由器会下载模型文件。

使用[路由器健康检查](llama-cpp.md#troubleshooting)确认服务器已就绪。Windows PowerShell 中应使用 `curl.exe`，而不是被 PowerShell 映射到其他命令的 `curl`。当 `/models` 列出 `qwen3.8-27b`，且状态为 `loaded` 时，模型就已就绪。

## 在 Pi 中使用模型

按照[配置 Pi](llama-cpp.md#configure-pi)连接到 `http://127.0.0.1:8080`。预设的小节名称就是模型 ID，因此本例应在 `/model` 中选择 `qwen3.8-27b`。

NVIDIA 配方中的内存设置，假设 GPU 仅供选定模型使用。如果 `/llama` 显示还加载了其他模型，请先卸载它们，再使用配方模型。

# 配置 shell 命令

Pi 会为每条 Bash 命令启动独立的非交互式 shell 进程。非交互式 Bash 默认不展开别名，通常也不会加载与交互式终端相同的启动文件。

使用 `shellPath` 选择 Bash 可执行文件，使用 `shellCommandPrefix` 在每条命令之前运行准备操作。

## 理解 Pi 使用哪种 shell

| 命令来源 | Shell |
|---|---|
| 模型调用内置 `bash` 工具 | Pi 解析得到的 Bash 可执行文件 |
| 你输入 `!command` 或 `!!command` | 同一个解析得到的 Bash 可执行文件 |
| 模型调用可选的 `powershell` 工具 | PowerShell 7（`pwsh.exe`）或 Windows PowerShell |
| 扩展提供或替代 shell 工具 | 该扩展实现的操作 |

Pi 通常通过 `bash -c` 调用 Bash。在 Unix 系统中，依次使用 `/bin/bash`、`PATH` 中的 `bash`，最后在 Bash 不可用时使用 `sh`。原生 Windows 环境先检查配置的路径，再检查 Git Bash，最后检查 `PATH` 中的 `bash.exe`。

## 选择 Bash 可执行文件

需要 Pi 使用特定可执行文件时，在 `~/.pi/agent/settings.json` 中设置 `shellPath`：

```json
{
  "shellPath": "~/.local/bin/bash"
}
```

Windows 上应使用正斜杠，或对反斜杠进行转义：

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

修改设置后运行 `/reload`。原生 Windows 的默认行为请参阅[在 Windows 上运行 Pi](windows.md)。

## 在每条 Bash 命令之前进行准备

设置 `shellCommandPrefix`，即可为内置 `bash` 工具及用户输入的 `!` 或 `!!` 命令添加 shell 准备操作：

```json
{
  "shellCommandPrefix": "export CI=1"
}
```

Pi 通过换行符连接前缀与实际命令。前缀会在每条命令前重新执行，因此应保持快速，并避免交互式提示。

## 启用 Bash 别名

将 Pi 需要的别名保存在兼容 Bash 的文件中，而不是解析完整的交互式 shell 配置。

创建 `~/.bash_aliases`：

```bash
alias ll='ls -la'
alias gs='git status --short'
```

然后配置 Pi，启用别名展开并加载该文件：

```json
{
  "shellCommandPrefix": "shopt -s expand_aliases\nsource ~/.bash_aliases"
}
```

运行 `/reload`，再通过 Pi 验证别名：

```text
!ll
```

该命令应当产生与 `ls -la` 相同的目录列表。

别名必须使用兼容 Bash 的语法。不要在 Bash 中加载任意 `.zshrc`，因为 zsh 的选项、函数和插件可能无法在 Bash 中正确解析或运行。

## 故障排查

### 前缀对 `!` 有效，但对扩展工具无效

`shellCommandPrefix` 配置的是 Pi 内置的 Bash 执行方式。替换 `bash` 工具或提供自有 shell 操作的扩展，会自行控制准备流程。请查阅该扩展的文档。

### 找不到 `shopt`

Pi 已回退到 `sh`，或 `shellPath` 指向的不是 Bash。在使用 `shopt` 等 Bash 专属准备操作之前，请安装 Bash，或将 `shellPath` 设置为 Bash 可执行文件。

### 准备命令一直等待输入

从 `shellCommandPrefix` 中移除交互式命令。前缀会在每条 Bash 命令之前，于非交互式进程中运行。

完整的设置定义请参阅 [Shell 设置](settings.md#shell)。

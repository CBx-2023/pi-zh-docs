# 在 Windows 上运行 Pi

Pi 可以作为原生 Windows 进程运行，也可以运行在 Windows Subsystem for Linux（WSL）中。原生 Windows 默认通过 Git Bash 执行 Bash 命令，也可以向模型提供可选的 PowerShell 工具。在 WSL 中运行的 Pi，则使用 Linux 环境及其中安装的 Bash。

按照主[快速入门](quickstart.md)安装 Pi 并完成身份验证，再参考本页选择和配置命令环境。

## 选择原生 Windows 或 WSL

| 环境 | 命令环境 | 适用场景 |
|---|---|---|
| 原生 Windows 与 Git Bash | 内置 `bash` 工具和 `!` 命令使用 Git Bash | 文件和开发工具主要位于 Windows 中 |
| 原生 Windows 与 `powershell` 工具 | 模型工具调用使用 PowerShell；`!` 命令仍可使用 Bash | 任务依赖 PowerShell 模块或 Windows 原生命令 |
| WSL | 使用所选 WSL 发行版中的 Linux Bash 和工具 | 文件和工具链已经位于 Linux 或 WSL 中 |

## 在原生 Windows 上使用 Git Bash

对于大多数原生 Windows 用户，安装 [Git for Windows](https://git-scm.com/download/win) 就已足够。

Pi 按以下顺序查找 Bash：

1. `~/.pi/agent/settings.json` 中的 `shellPath`
2. 位于 `%ProgramFiles%\Git\bin\bash.exe` 的 Git Bash
3. 位于 `%ProgramFiles(x86)%\Git\bin\bash.exe` 的 Git Bash
4. `PATH` 中的 `bash.exe`，包括 Cygwin、MSYS2 或旧式 WSL Bash

启动 Pi，输入以下命令验证 shell：

```text
!printf 'Bash is working\n'
```

如果 Pi 找不到 Bash，会报告已经检查过的位置。请安装 Git for Windows，将其他 Bash 可执行文件加入 `PATH`，或配置 `shellPath`。

## 让模型使用 PowerShell

可选的 `powershell` 工具优先通过 `pwsh.exe` 运行命令，不可用时回退到 Windows PowerShell。它使用 `-NoProfile -NonInteractive -ExecutionPolicy Bypass` 启动 PowerShell，管理员强制执行的执行策略仍可能拥有更高优先级。

PowerShell 按以下顺序查找：

1. `PATH` 中的 `pwsh.exe`
2. `%ProgramFiles%\PowerShell\7\pwsh.exe`
3. `PATH` 中的 `powershell.exe`
4. `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`

要将模型使用的 `bash` 工具替换为 `powershell`，在 `~/.pi/agent/settings.json` 中添加：

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

`["-bash", "+powershell"]` 也能实现相同效果，同时保留你配置的其他默认工具。

重启 Pi，然后让它运行一条无害的 PowerShell 命令。编辑器中的 `!` 和 `!!` 命令仍然使用 Bash。`powershell` 工具仅在 Pi 作为原生 Windows 进程运行时可用。

其他工具组合请参阅[设置](settings.md#tools)。

## WSL

Windows 上的 WSL 路径转换，以及 WSL 中额外的 Git 分支轮询，只识别 `/mnt/<drive>`，不识别自定义挂载根目录。

在 Windows 上使用旧式 WSL `bash.exe` 启动器时，Pi 通过 stdin 发送命令，避免命令行引号处理问题。

## 使用自定义 Bash 可执行文件

Bash 安装在 Pi 无法自动发现的位置时，设置 `shellPath`：

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

JSON 使用反斜杠表示转义序列。使用反斜杠编写 Windows 路径时，应像上面的示例一样，将每个反斜杠写两次。

命令前缀、别名和完整的 shell 解析行为，请参阅[配置 shell 命令](shell-aliases.md)。

## 配置 Windows Terminal

Windows Terminal 会保留或改写部分带修饰键的按键。有关 `Shift+Enter` 和 `Alt+Enter` 的配置，请参阅 [Windows Terminal](terminal-setup.md#windows-terminal)；Pi 在 Windows 和 WSL 上的默认快捷键请参阅[按键绑定](keybindings.md)。

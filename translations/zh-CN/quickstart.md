# 快速入门

Pi 在终端中运行，处理你机器上的文件。要使用它，你需要通过受支持的提供商访问模型，可以使用订阅账号、API Key 或本地模型。

原生 Windows 环境请阅读 [Windows 配置](windows.md)。Android 环境请阅读 [Termux 配置](termux.md)。

## 1. 安装 Pi

在 macOS 或 Linux 上，可以使用安装器：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

安装器会固定所有依赖的版本，并通过 `pi update` 更新 Pi。你也可以通过 npm 安装，但这种方式不会固定传递依赖，需要 Node.js 22.19 或更新版本：

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

正常通过 npm 安装 Pi，不需要执行依赖的生命周期脚本。

在 macOS 或 Linux 上使用 Nix 时，可以从 Pi 的 flake 安装最新发布版本。Nix 会从源码构建 Pi：

```bash
nix profile add github:earendil-works/pi/stable
```

较旧的 Nix 版本需要改用 `nix profile install`。更新时使用 `nix profile upgrade pi`；`pi update` 无法更新 Nix 安装。要固定某个发布版本，可使用 `github:earendil-works/pi/v1.0.0` 这样的标签。

验证安装：

```bash
pi --version
```

## 2. 启动 Pi

切换到希望 Pi 处理的目录，然后启动它：

```bash
cd /path/to/folder
pi
```

工作目录帮助 Pi 发现相关文件、指令与配置。Pi 也会按工作目录对保存的会话进行分组。

<p align="center"><img src="images/interactive-mode.png" alt="Pi 在终端中运行，显示对话、输入编辑器和底部状态栏" width="750"></p>

界面包含对话内容、用于输入提示和命令的编辑器，以及显示当前目录、模型和会话状态的底栏。参阅[在终端中使用 Pi](usage.md)，了解如何添加文件、运行命令、引导正在进行的工作和管理结果。

## 3. 选择模型

**模型**负责生成 Pi 的响应。**提供商**是 Pi 用于访问该模型的服务或账号。

在 Pi 中运行：

```text
/login
```

选择提供商，然后按照提示使用订阅账号或保存 API Key。如果希望选择另一个可用模型，之后运行 `/model`。

有关受支持的提供商、环境变量身份验证、本地模型和自定义端点，请参阅[选择模型与提供商](models.md)。

## 4. 给 Pi 一个任务

Pi 会展示它执行的每次文件读取、搜索、命令和编辑。它不会在每次工具调用前都征求许可。

输入符合你工作需要的任务，例如：

```text
Summarize @meeting-notes.md and save the action items to action-items.md.
```

```text
Explain how this repository is structured and how to run its checks.
```

```text
Compare @previous.csv with @current.csv and summarize the important changes.
```

在编辑器中输入 `@` 即可搜索文件，无需输入完整路径。Pi 完成任务后，请检查其响应及所有修改过的文件。重要工作应使用版本控制或备份。对于不可信内容或无人值守工作，请使用容器或其他沙箱，参阅[安全](security.md)。

## 稍后继续

Pi 会自动保存会话。退出 Pi 后，可以用以下命令恢复同一工作目录下最近的会话：

```bash
pi --continue
```

使用 `/resume` 选择其他已保存会话。有关会话命名、分支、压缩、导出和分享，请参阅[继续会话或创建分支](sessions.md)。

## 后续步骤

- [交互式使用 Pi](usage.md)，了解输入、命令、快捷键和排队消息。
- [添加指令](configuration.md#context-files)，让 Pi 每次在某个目录中工作时都遵循这些指令。
- [选择模型与提供商](models.md)。

### 选择自定义 Pi 的方式

优先使用能够满足需求的、能力最小的机制：

| 需求 | 从这里开始 |
|---|---|
| 为目录设置 Pi 持续遵循的指令 | [`AGENTS.md`](configuration.md#context-files) |
| 从 `/` 菜单中复用提示 | [提示模板](prompt-templates.md) |
| 添加特定任务的指令和辅助文件 | [技能](skills.md) |
| 添加可执行工具、命令或事件处理器 | [扩展](extensions.md) |
| 构建自定义终端组件 | [终端 UI](tui.md) |
| 连接尚未支持的模型服务 | [自定义提供商](custom-provider.md) |
| 安装或分发多种资源 | [Pi 包](packages.md) |

## 卸载 Pi

如果通过 npm 安装 Pi，运行：

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

如果使用安装器，请再次运行安装器并选择 **Uninstall Pi**：

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

如果通过 Nix 安装 Pi，运行：

```bash
nix profile remove pi
```

以上方式都不会删除 `~/.pi/agent/` 中的配置、凭据、会话或已安装的 Pi 包。

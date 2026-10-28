# Pi

Pi 是一个可扩展的 AI 智能体，在终端中工作。给它一个目标和工作目录，它就能检查文件、运行命令、编辑内容，并逐步完成多步骤任务。

你可以用 Pi 开发软件、整理研究笔记、撰写文章、处理数据文件，或完成个人兴趣项目。你可以直接使用 Pi，也可以提示它调整自身以适应你的工作流，还可以通过 SDK 构建由 Pi 驱动的其他应用。

## 开始使用 Pi

第一次使用 Pi？请按照[快速入门](quickstart.md)安装 Pi、连接模型，并完成第一个任务。

如果已经安装 Pi，可以选择接下来要做的事情：

- [交互式使用 Pi](usage.md)，添加文件、运行命令、引导正在进行的工作并导出结果。
- [选择模型](models.md)，或连接订阅账号、API Key、本地模型及兼容端点。
- [继续会话或创建分支](sessions.md)，恢复工作，或在保留历史的同时探索另一种方案。
- [配置 Pi](configuration.md)，设置偏好、工作目录、指令及可复用资源。
- [理解 Pi 的工作原理](how-pi-works.md)，包括工具、上下文、会话和智能体循环。

## 自定义 Pi

Pi 可以复用提示、加载专门指令、添加可执行集成、更换终端界面、连接模型服务，并将这些资源打包分发。
使用[快速入门中的自定义方式选择表](quickstart.md#choose-how-to-customize-pi)，选择能够满足需求的最小机制。

## 自动化或嵌入 Pi

- 使用 [print 模式](cli.md#invocation-and-output)，完成一次性任务或脚本任务。
- 使用 [JSON 事件流模式](json.md)，读取单次运行产生的结构化事件。
- 使用 [RPC 模式](rpc.md)，控制独立的 Pi 进程。
- 使用 [TypeScript SDK](sdk.md)，在应用内部运行 Pi。

## 查找参考资料与配置说明

通过参考页面查询 [CLI 选项](cli.md)、[设置](settings.md)、[提供商](providers.md)、[按键绑定](keybindings.md)和[环境变量](environment-variables.md)。

平台相关帮助请参阅[终端配置](terminal-setup.md)、[Windows](windows.md)、[tmux](tmux.md)、[Android 上的 Termux](termux.md)或[容器化](containerization.md)。

## 安全地工作

Pi 的工具和扩展以 Pi 进程的权限运行。项目信任机制控制 Pi 加载哪些项目资源，但不会将工具调用放入沙箱。在使用不可信文件、仓库、扩展或无人值守自动化之前，请阅读[安全](security.md)文档。

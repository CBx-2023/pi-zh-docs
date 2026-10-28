# CLI 集成

默认情况下，运行 `pi` 会打开交互式终端界面。输入或输出经过管道或重定向时，Pi 则使用打印模式。脚本与应用也可以显式选择打印、JSON 或 RPC 模式。

四种模式使用相同的智能体、会话、资源和工具。模式决定输入如何进入 Pi、输出如何公开，以及进程是否保持运行以接收更多命令。

SDK 不是 CLI 模式，它将智能体直接嵌入 Node.js 或 Bun 进程。如果直接使用 TypeScript 比通过进程边界交互更合适，请参阅 [SDK](sdk.md)。

## 选择模式

| 模式 | 接口 | 生命周期 | 适用场景 |
|---|---|---|---|
| 交互式 | 终端 UI | 直到用户退出 | 用户直接操作 Pi |
| 打印 | stdout 上的最终文本 | 一次调用 | 脚本需要最终 assistant 响应 |
| JSON | stdout 上的 JSONL 事件 | 一次调用 | 进程需要获取一次运行的结构化进度 |
| RPC | JSONL 命令、响应和事件 | 长期运行 | 进程需要双向控制 |

CLI 选项仍然可以独立于模式，选择工作目录、模型、工具、资源和会话持久化方式。完整启动选项见[命令行](cli.md)。

## 打印到 stdout

打印模式运行所提供的提示，将最终 assistant 文本写入 stdout，然后退出：

```bash
pi --print "Summarize the changes in this repository"
```

只需要最终文本时，使用打印模式，例如命令替换、管道和一次性任务。该模式不公开中间事件。

打印模式将错误写入 stderr。如果最终 assistant 响应的停止原因为 `error` 或 `aborted`，则产生非零退出状态。响应因达到模型输出 token 上限而被截断时，即停止原因为 `length`，仍会将已有部分文本打印到 stdout，同时向 stderr 写入警告，并产生非零退出状态。

未显式选择模式时，非 TTY 的 stdin 或 stdout 也会触发打印模式，因此通过管道输入输出时无需添加 `--print`。

## 流式输出 JSON 事件

JSON 模式先写出会话头，再以换行分隔的 JSON 输出智能体及会话事件：

```bash
pi --mode json "Review this repository" > events.jsonl
```

这是结构化的事件输出，并非单个 JSON 结果，也不是对模型响应格式的约束。

所有提示都在进程启动时提供。进程流式输出该次运行的事件后退出，不接受后续命令。

失败或被中止的 assistant 响应会出现在事件流中，但本身不会产生非零退出状态。需要判断成功或失败时，应检查事件。如果此次调用抛出错误，Pi 仍会以非零状态退出。

流式 `message_update` 记录包含增量，而不是不断增长的消息快照。应根据增量事件组装实时输出，再用 `message_end` 中的权威消息替换它。

`agent_end` 后面可能还有自动恢复或排队工作。`agent_settled` 才表示当前运行的自动工作结束。

Stdout 专用于 JSONL。诊断信息与应用日志写入 stderr。消息分帧、事件形状和重建规则见 [JSON 事件流](json.md)。

## 通过 RPC 控制 Pi

RPC 模式让 Pi 保持运行，由另一个进程发送命令，并接收响应和事件：

```bash
pi --mode rpc --no-session
```

命令是写入 stdin 的 JSON 对象。响应和事件是写入 stdout 的 JSON 对象。每条记录占一行。

需要关联的命令应添加 `id`，匹配的响应会重复该 ID。事件通常没有命令 ID，因为它们描述的是会话活动，而不是某一次请求。

成功的 `prompt` 响应表示提示已被接受、排队或处理，不表示运行已经完成。需要确认完成时，应继续读取事件，直到 `agent_settled`。

RPC 命令可以切换模型、检查状态、管理会话、运行 Shell 命令，以及回答扩展 UI 请求。

扩展对话框形成请求—响应子协议。其他扩展 UI 更新属于通知，客户端可以显示，也可以忽略。仅限 TUI 的扩展能力在交互模式之外不可用，或会降级。

对于 Node.js 或 TypeScript 集成，优先使用 `@earendil-works/pi-coding-agent` 中的 `RpcClient`。它会启动 Pi RPC 子进程、关联请求、公开类型化命令方法，并向监听器传递会话事件。

[RPC 客户端示例](../examples/rpc-client.ts)发送一条提示，流式输出文本和工具活动，等待 `agent_settled`，然后关闭子进程。该示例纳入了仓库的 TypeScript 检查。

`RpcClient.promptAndWait()` 在发送提示前先安装事件监听器，避免快速完成引起的竞态。分开操作时，应先订阅，再调用 `prompt()`；只在运行仍处于活动状态时调用 `waitForIdle()`。

客户端需要能够运行的 Pi CLI 路径。仓库示例指向 `dist/cli.js`，因此从源码检出目录运行该示例前，必须先构建包。

如果不使用 `RpcClient`，而是自行构建客户端，请先阅读 [RPC 协议](rpc.md)，再将 [RPC 命令](rpc-commands.md)和 [JSON 事件流](json.md)作为传输参考。

## 分叉并重新命名 Pi

源码分叉可以通过 `package.json` 更改 CLI 名称和配置目录：

```json
{
  "piConfig": {
    "name": "my-agent",
    "configDir": ".my-agent"
  }
}
```

修改顶层 `bin` 字段，可以设置可执行文件名。这些设置会影响 CLI 横幅、配置路径，以及派生的环境变量名。

## 示例与参考

- [RPC 客户端](../examples/rpc-client.ts)：类型化的 Node.js 集成
- [RPC 扩展 UI](../examples/rpc-extension-ui.ts)：支持扩展对话框的自定义终端客户端
- [命令行](cli.md)：启动选项与模式选择
- [JSON 事件流](json.md)：JSON 事件参考
- [RPC 协议](rpc.md)：RPC 生命周期、分帧、错误和关闭
- [RPC 命令](rpc-commands.md)：命令与响应参考
- [RPC 扩展 UI](rpc-extension-ui.md)：扩展交互子协议
- [SDK 示例](../examples/sdk/)：进程内 TypeScript 集成

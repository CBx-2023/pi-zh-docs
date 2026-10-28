# SDK

`@earendil-works/pi-coding-agent` 将 Pi 嵌入 Node.js 或 Bun 进程，提供直接的 TypeScript 接口，访问命令行应用使用的智能体、会话、工具、模型和资源。

使用 SDK 进行进程内 TypeScript 集成。如果需要语言无关或隔离的子进程，请参阅 [CLI 集成](cli-integration.md)。

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.prompt("What files are in the current directory?");
  console.log(session.getLastAssistantText());
} finally {
  session.dispose();
}
```

这会使用工作目录、自动发现的资源、已存储设置和已配置凭据。`prompt()` 在运行完成时兑现。

[完整的最小示例](../examples/sdk/01-minimal.ts)还会流式输出文本事件。所有 [SDK 示例](../examples/sdk/)都会随仓库进行类型检查。

<a id="session-management"></a>

## 会话生命周期

`createAgentSession()` 创建 `AgentSession`。该会话管理一段对话、其模型和工具、排队消息、压缩状态，以及扩展运行时。

通过 `session.messages`、`session.model`、`session.thinkingLevel`、`session.systemPrompt` 和 `session.getActiveToolNames()` 读取当前状态。

`session.systemPrompt` 是只读属性，返回当前有效的系统提示，包括尚未发送给模型的更改。工具更改会在下次请求前向模型声明。

<a id="sessionmanager-api"></a>

### 会话存储

会话默认会持久化。`SessionManager` 管理持久化或内存中的条目树，并跟踪其活动叶节点。分支操作会改变这个叶节点，但不会删除放弃的分支。Pi 重建模型上下文时，由管理器选择活动分支并应用压缩。

`SessionManager` 是最终模型上下文的权威来源。恢复外部历史时，应使用包含这些条目的管理器来构造会话。给 `session.agent.state.messages` 赋值，不会替换持久化上下文。

宿主不希望生成会话文件时，使用内存管理器：

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
```

经过检查的[会话示例](../examples/sdk/11-sessions.ts)展示了如何创建、打开、继续、列出和分叉会话。[会话文件格式](session-format.md)定义持久化 JSONL 约定，[消息类型](message-types.md)定义转录记录的值。准确的方法和签名，请参阅导出的 TypeScript 声明或 [`session-manager.ts`](../src/core/session-manager.ts)。

`cwd` 选择用于项目资源发现、上下文文件、会话分组和内置工具路径的工作区。如果目标与 `process.cwd()` 不同，应显式传入。

`session.dispose()` 会中止活动工作、使扩展上下文失效、断开与智能体的连接，并移除事件监听器。会话不再需要时，应调用它。

`AgentSessionRuntime` 提供 `newSession()`、`switchSession()`、`fork()` 和 `importFromJsonl()`。每项操作都会替换活动的 `AgentSession`，并为目标工作目录重新创建服务。

运行时替换之后，订阅仍属于旧 `AgentSession`，必须重新绑定。见[会话运行时示例](../examples/sdk/13-session-runtime.ts)。

## 发送提示

`prompt()` 在普通用户消息进入智能体之前，先处理扩展命令并展开基于文件的提示模板。对于已接受的智能体运行，它在运行结束后兑现，包括自动重试。

会话已经处于流式输出状态时，再发送提示，必须说明是引导当前运行，还是在其后执行。未作选择就调用 `prompt()` 会被拒绝，不会自行猜测。

引导消息在当前 assistant 轮次及其工具调用之后进入。后续消息则在当前运行完成待处理工作之后进入。`steer()` 和 `followUp()` 直接公开这两种行为：输入被排队时返回 `"queued"`，包括被扩展转换后排队的情况；输入被扩展消费时返回 `"handled"`。

`abort()` 停止活动操作，并等待会话进入空闲状态。`waitForIdle()` 只等待，不中止操作。

## 订阅事件

宿主需要流式输出时，应先订阅，再发送提示：

```typescript
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await session.prompt("Explain this repository");
} finally {
  unsubscribe();
}
```

会话事件报告消息更新、工具执行、队列、压缩、重试，以及运行生命周期变化。

`message_end` 包含权威的完整消息。`agent_end` 表示一次底层智能体运行结束，但之后仍可能有自动恢复或排队工作。

宿主需要确认 Pi 不会自动继续时，使用 `agent_settled`。

## 配置会话

未覆盖配置时，工厂会创建 `ModelRuntime`、基于文件的 `SettingsManager`、持久化 `SessionManager`、`DefaultResourceLoader` 和配置好的默认工具。

每个边界都可以显式提供：

- `modelRuntime`、`model`、`thinkingLevel` 和 `scopedModels` 控制模型访问与选择。
- `settingsManager` 提供合并后的设置或内存配置。
- `sessionManager` 提供持久化或内存中的对话历史。
- `resourceLoader` 提供扩展、Skill、提示模板、主题及上下文文件。
- `tools`、`noTools`、`excludeTools` 和 `customTools` 控制活动工具集合。

希望使用标准发现机制并进行部分覆盖时，使用 `DefaultResourceLoader`。宿主完全管理资源存储和发现时，则提供自定义 `ResourceLoader`。

<a id="inlineextension"></a>

可以通过 `DefaultResourceLoader` 提供内联扩展工厂。只有当扩展需要在诊断信息和启动输出中拥有稳定名称时，才给它设置 `InlineExtension` 名称。命名内联扩展设置 `replaceable: true` 后，如果另一个扩展注册了它在加载期间注册的某个工具、命令或标记名称，它就会被排除，而不是两者同时加载并产生冲突。CLI 内置的 codemode、工具搜索和 MCP 扩展都是可替换的。带有 `builtin: true` 的命名条目不是内联扩展：它提供 `builtin:<name>` 扩展的代码，并像已配置的扩展文件一样加载。它默认加载，列在 `pi config` 中，并可通过 `extensions` 设置中的 `-builtin:<name>` 或 `noExtensions` 禁用；`additionalExtensionPaths: ["builtin:<name>"]` 则会显式加载它。它在项目信任完成解析后加载，因此无法处理 `project_trust`。CLI 的内置扩展使用这种形式。

<a id="codemode-mcp"></a>

CLI 将 `codemode`、`tool_search` 和 MCP 作为内置扩展加载，SDK 会话则不会。应将 `createCodemodeExtension()`、`createToolSearchExtension()` 和 `createMcpExtension()` 加到 `DefaultResourceLoader` 的 `extensionFactories` 中。`codemode` 和 `tool_search` 注册时处于未激活状态：可以通过 `defaultTools` 设置启用它们，`["+codemode", "+tool_search"]` 会保留其他默认工具；也可以让 MCP 扩展激活它们：暴露方式为 `codemode` 的服务器激活 `codemode`，暴露方式为 `deferred` 的服务器激活 `tool_search`。MCP 扩展在 `session_start` 时连接服务器，因此需要调用 `session.bindExtensions()`。见 [Codemode 与 MCP](../examples/sdk/14-codemode-mcp.ts)。

针对性的示例包括[模型](../examples/sdk/02-custom-model.ts)、[工具](../examples/sdk/05-tools.ts)、[扩展](../examples/sdk/06-extensions.ts)和[完全控制](../examples/sdk/12-full-control.ts)。

## 示例

| 示例 | 目的 |
|---|---|
| [最小示例](../examples/sdk/01-minimal.ts) | 创建会话、发送提示、观测并销毁会话 |
| [自定义模型](../examples/sdk/02-custom-model.ts) | 选择模型和思考级别 |
| [系统提示](../examples/sdk/03-custom-prompt.ts) | 替换或追加系统提示 |
| [Skill](../examples/sdk/04-skills.ts) | 发现、过滤并添加 Skill |
| [工具](../examples/sdk/05-tools.ts) | 选择内置工具及其工作目录 |
| [扩展](../examples/sdk/06-extensions.ts) | 加载基于文件的扩展和内联扩展 |
| [上下文文件](../examples/sdk/07-context-files.ts) | 添加或替换项目指令 |
| [提示模板](../examples/sdk/08-prompt-templates.ts) | 添加文件形式的提示模板 |
| [凭据](../examples/sdk/09-api-keys-and-oauth.ts) | 配置凭据和模型存储 |
| [设置](../examples/sdk/10-settings.ts) | 提供基于文件或内存的设置 |
| [会话](../examples/sdk/11-sessions.ts) | 控制会话持久化和恢复 |
| [完全控制](../examples/sdk/12-full-control.ts) | 替换默认发现机制和状态服务 |
| [会话运行时](../examples/sdk/13-session-runtime.ts) | 安全替换活动会话 |
| [Codemode 与 MCP](../examples/sdk/14-codemode-mcp.ts) | 添加 `codemode`、`tool_search` 和 MCP 扩展 |

<a id="exports"></a>

## 资源

- [选择模型](models.md)介绍模型选择和兼容端点；[提供商](providers.md)介绍凭据与提供商专用设置。
- [配置](configuration.md)解释常规发现与设置；[设置](settings.md)列出所有设置项。
- [会话与上下文](sessions.md)解释会话行为；[会话格式](session-format.md)定义持久化条目；[消息类型](message-types.md)定义共享的转录记录值。
- [扩展](extensions.md)、[Skill](skills.md)和[提示模板](prompt-templates.md)介绍通过 `ResourceLoader` 提供的资源。
- [CLI 集成](cli-integration.md)介绍打印、JSON 和 RPC 模式，它们是进程内 SDK 集成的替代方式。

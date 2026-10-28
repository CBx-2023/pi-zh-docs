# MCP Server

Pi 通过 stdio 或 Streamable HTTP 连接 [Model Context Protocol](https://modelcontextprotocol.io) 服务器，将其中的工具和资源提供给模型。

## 快速配置

添加本地 stdio 服务器，检查连接，然后启动 Pi：

```bash
pi mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .
pi mcp list
pi
```

远程服务器的配置方式：

```bash
pi mcp add docs --url https://example.com/mcp --bearer-token-env-var DOCS_TOKEN
pi mcp list
```

这些命令默认添加用户级服务器。加入 `--local` 或 `-l`，即可改为写入项目配置：

```bash
pi mcp add -l tools --env API_KEY='${TOOLS_KEY}' -- uvx tools-mcp
```

在交互式会话中使用 `/mcp`，可以检查连接、登录、重新连接、更改工具暴露方式，以及启用或禁用服务器。在会话之外添加、移除或修改服务器后，请运行 `/reload`。

## 配置服务器

Pi 从 `~/.pi/agent/mcp.json` 读取用户级服务器，从 `.pi/mcp.json` 读取项目服务器。只有授予[项目信任](security.md#understand-project-trust)后，才会读取项目配置。项目条目替代相同名称的用户级条目。

如果项目条目没有 `command`、`url` 或 `type`，它只会覆盖同名用户级服务器的 `enabled`、`exposure` 和 `toolExposure`，其余内容保持不变，包括 `env`、`headers` 和 `auth`。例如，以下配置会在一个项目中关闭用户级服务器：

```json
{
  "mcpServers": {
    "internal-tools": { "enabled": false }
  }
}
```

配置格式与其他 MCP Client 一致：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "docs": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${DOCS_TOKEN}" },
      "description": "Search and read the product documentation"
    }
  }
}
```

Stdio 服务器使用 `command`、`args`、`env` 和 `cwd`。相对 `cwd` 值根据会话目录解析。`command`、参数或 `cwd` 中以 `~/` 开头的路径，指向主目录。

HTTP 服务器使用 `url`、`headers` 和 `oauth`，参阅[通过 OAuth 验证身份](#authenticate-with-oauth)。不支持旧式 SSE 传输。

两类服务器都支持：

- `timeout`：以秒为单位的单次请求超时，默认 60 秒。进度通知会重置计时。
- `enabled: false`：保留条目，但不连接。
- `exposure` 和 `toolExposure`：控制模型如何访问工具，参阅[控制工具暴露方式](#control-tool-exposure)。
- `description`：用一句话说明服务器提供什么。它用于在系统提示中列出服务器，参阅[控制工具暴露方式](#control-tool-exposure)；工具搜索也据此对该服务器的工具排序，codemode 的 `describeNamespace()` 同样会返回它。如果没有设置，服务器连接后会使用其指令的第一行。

个人服务器和包含凭据的服务器应保存在用户级文件中。项目文件仅用于项目必需的服务器，并且仅应在受信任的项目中使用。

### 配置规则

- 服务器名称只能包含字母、数字、`_` 和 `-`。工具名称为 `mcp__<server>__<tool>`，其中除字母、数字和 `_` 之外的字符都会替换为 `_`；如果某个服务器的工具名称因此发生冲突，所有冲突工具都会添加哈希后缀。仅在 `-` 与 `_` 上存在差异的服务器名称，视为同一个服务器：第二个会被拒绝，而 `mcp.json` 中的服务器会覆盖通过代码注册的服务器。
- `type` 是可选项。存在 `command` 时选择 stdio，存在 `url` 时选择 Streamable HTTP。显式提供 `type` 时，必须为 `stdio`、`http` 或 `streamable-http`。
- `sse` 会被拒绝。文档中提供 SSE 端点的服务器，通常也提供 Streamable HTTP，常见路径为 `/mcp`，而不是 `/sse`。
- `command` 只表示一个可执行文件，参数放在 `args` 中。它不是 shell 命令字符串。
- `env` 和 `headers` 的值可以使用 `${GITHUB_TOKEN}` 这样的环境变量，也可以通过 `!command` 运行命令，但命令必须占据整个值，例如 `"Authorization": "!echo Bearer $(gh auth token)"`。
- 无效条目会被报告并跳过，不会阻止其他服务器连接。

`pi mcp add` 和 `pi mcp remove` 可以在 shell 中完成常见修改，选项请参阅 [MCP 命令](cli.md#mcp-commands)。

### 检查或修改服务器

`/mcp` 列出已配置服务器及其状态、工具数量、暴露方式和配置来源，需要注意的服务器排在前面。选择服务器，可以检查工具和连接详情、重新连接、登录或退出、更改暴露方式，以及启用或禁用它。

暴露方式与启用状态的更改，会保存到定义该服务器的文件中，不会替换无关内容。在受信任项目中，"Enable in this project" 和 "Disable in this project" 会为用户级服务器添加项目覆盖；之后对该服务器的更改会保存到覆盖条目。禁用的服务器仍会显示在列表中。在交互式 TUI 之外，`/mcp` 会打印服务器状态；`/mcp login <server>`、`/mcp logout <server>` 和 `/mcp reconnect <server>` 则直接执行相应操作。

无需会话也能使用 shell 命令：`pi mcp add`、`pi mcp remove`、`pi mcp list`、`pi mcp login` 和 `pi mcp logout`。Shell 命令不会加载扩展。

### 诊断连接问题

运行 `pi mcp list`，连接每个已启用服务器，并打印状态、工具和错误。条目无效，或某个已启用服务器未连接时，命令以状态码 1 退出。`/mcp` 显示完整连接错误，以及失败的 stdio 服务器 stderr 的末尾内容。

Pi 在启动后会集中报告一次配置错误、连接失败和所需登录。服务器日志通知按 `<time> [<server>] <level> <logger>: <message>` 格式，追加到 `~/.pi/agent/mcp.log`。文件超过 5 MB 后，会移动到 `mcp.log.1`。

会话启动时，Pi 在后台连接每个已启用服务器。服务器连接后，其工具才会出现；`codemode` 描述不列出这些工具，因此服务器连接时不会改变描述。第一个提示最多等待 10 秒，而且只等待提供 `direct` 工具的服务器，因为这些工具必须声明在请求中。其他服务器仅在需要时才会被等待：codemode 脚本会等待它点名的服务器（`mcp__<server>`），调用 `searchTools()` 或读取 `ALL_TOOLS` 时，则等待全部服务器；`tool_search` 和资源工具也会等待全部服务器。HTTP 网络错误及临时状态码（408、429 和 5xx）会重试两次。连接断开时显示为未连接，并在下一次调用时重新连接。服务器宣布工具列表发生变化时，会加入新工具，撤回的工具则变得不可访问。

停止 stdio 服务器时，Pi 先关闭其 stdin，然后向进程组发送 SIGTERM，最后发送 SIGKILL。这也会停止通过 `npx` 或 `uvx` 等包装器启动的服务器。

## 从其他客户端迁移配置

将转换后的条目放入 `mcp.json` 的 `mcpServers` 下，然后运行 `pi mcp list` 验证。

| 客户端 | 转换方式 |
|---|---|
| Claude Desktop、Claude Code 或 Cursor | 复制已有的 `mcpServers` 条目。 |
| VS Code | 从顶层 `servers` 对象移动条目，并将 `${input:...}` 提示替换为 `${NAME}` 环境变量。 |
| Codex | 将 `[mcp_servers.<name>]` 下的 `command`、`args`、`env`、`url` 等 TOML 字段转换为 JSON。 |
| OpenCode | 将 `"type": "local"` 转换为 stdio 条目，把 `command` 数组拆分为 `command` 与 `args`，将 `environment` 重命名为 `env`，将 `{env:NAME}` 替换为 `${NAME}`。将 `"type": "remote"` 转换为 URL 条目。 |

## 通过 OAuth 验证身份

Sentry 等使用 OAuth 的远程服务器，不需要在 `mcp.json` 中提供凭据：

```json
{
  "mcpServers": {
    "sentry": { "url": "https://mcp.sentry.dev/mcp" }
  }
}
```

服务器拒绝未经身份验证的连接时，`/mcp` 会显示需要登录。选择 "Sign in"，或运行 `/mcp login sentry`、`pi mcp login sentry`。Pi 打开授权页面并等待批准。如果浏览器运行在另一台机器上，例如通过 SSH 使用 Pi，可以将重定向后的 URL 粘贴到登录界面。正在运行的会话会在下一轮使用新凭据。

Pi 向授权服务器注册自身，将令牌保存在 `~/.pi/agent/mcp-auth.json` 中，并在访问令牌过期或被服务器拒绝时刷新。如果服务器之后请求更多权限范围，Pi 会要求再次登录。退出登录会删除已保存凭据。

凭据归属于服务器名称与 URL 的组合。同一 URL 使用不同名称，例如每个账号使用一个名称时，需要分别登录；不同 `mcp.json` 文件中，名称和 URL 都相同的服务器，则共享一次登录。

OAuth 适用于未设置 `Authorization` 请求头的 HTTP 服务器。服务器不支持动态客户端注册时，需要配置已注册的客户端：

```json
{
  "mcpServers": {
    "example": {
      "url": "https://mcp.example.com/mcp",
      "oauth": { "clientId": "my-client", "clientSecret": "${EXAMPLE_SECRET}", "callbackPort": 8765 }
    }
  }
}
```

重定向 URI 必须与已注册的 URI 一致。`callbackPort` 使用 `http://127.0.0.1:<port>/callback`。需要其他 URI 时，设置 `callbackUrl`；它必须在 `localhost`、`127.0.0.1` 或 `[::1]` 上使用 HTTP。Pi 会严格按填写内容发送。如果 `callbackUrl` 省略端口，Pi 会使用 `callbackPort` 或空闲端口，并按照 RFC 8252 对回环重定向的许可，将端口添加到 URI。`clientSecret` 是可选项，可以使用环境变量或命令。

服务器未公布所需权限范围时，将 `scope` 设为以空格分隔的列表。否则，Pi 会请求公布的权限范围。后续请求的权限范围会追加到已配置的值中。

Pi 默认以 `pi` 的名称注册。有些服务器仅接受已知客户端注册，可设置 `clientName` 发送其他名称：

```json
{
  "mcpServers": {
    "figma": { "url": "https://mcp.figma.com/mcp", "oauth": { "clientName": "Claude Code" } }
  }
}
```

只有注册客户端时才会发送名称。要以新名称重新注册，请先退出登录。

有些授权服务器可以通过 Client ID Metadata Document URL 识别客户端，而无需注册。将 `clientRegistration` 设为 `cimd`，即可通过 pi.dev 上的 Pi 文档标识身份，不再进行注册：

```json
{
  "mcpServers": {
    "example": { "url": "https://mcp.example.com/mcp", "oauth": { "clientRegistration": "cimd" } }
  }
}
```

客户端 ID 为 `https://pi.dev/oauth/client.json`，重定向 URI 为 `http://127.0.0.1:<port>/callback`。如果授权服务器未在授权响应中发送 `iss` 参数（RFC 9207），Pi 会改用针对该 MCP Server 的专用文档与重定向路径：`https://pi.dev/oauth/<id>/client.json` 与 `http://127.0.0.1:<port>/callback/<id>`。授权服务器必须声明支持 Client ID Metadata Document 及公共客户端，否则登录失败。`cimd` 不能与 `clientId` 或 `clientName` 同时使用；`callbackUrl` 必须使用 `localhost` 或 `127.0.0.1`，且路径为 `/callback`。

Pi 通过服务器的受保护资源元数据（RFC 9728）发现授权服务器，并检查授权服务器元数据中声明的签发者是否符合预期（RFC 8414）。有些服务器公布了错误的授权服务器，或根本没有公布，导致登录时打开不存在的页面。可以将 `authServerMetadataUrl` 设置为正确授权服务器的元数据文档：

```json
{
  "mcpServers": {
    "example": {
      "url": "https://mcp.example.com/mcp",
      "oauth": { "authServerMetadataUrl": "https://example.okta.com/.well-known/openid-configuration" }
    }
  }
}
```

Pi 会用该文档替代发现流程，并按配置直接信任它，因此只能指向你信任的文档。URL 必须使用 HTTPS，`localhost`、`127.0.0.1` 或 `[::1]` 除外。

## 控制工具暴露方式

每个服务器工具都注册为 `mcp__<server>__<tool>`。服务器的 `exposure` 决定模型通过什么方式访问工具：

| 暴露方式 | 行为 | 典型用途 |
|---|---|---|
| `codemode`（默认） | 可由 [`codemode`](cli.md#tools) 脚本调用，但既不向模型声明，也不列入 codemode 描述。脚本通过 `searchTools()`、`describeTool()` 或 `ALL_TOOLS` 查找工具。 | 通用 MCP Server，尤其适用于脚本需要组合或筛选调用的场景。 |
| `deferred` | 只有 [`tool_search`](cli.md#tools) 为下一次模型调用加载匹配项后，才会声明。 | 工具众多，且发现后应直接调用工具的服务器。 |
| `direct` | 像内置工具一样向模型声明，同时也可以从 codemode 调用。 | 小型、经常使用的工具集。 |
| `hidden` | 已注册，但不可访问。 | 应保持不可用的服务器或工具。 |

`codemode-deferred` 可作为 `codemode` 的别名。

具有 `codemode` 或 `deferred` 工具的服务器，会列在系统提示的 `mcp_servers` 部分，其中说明工具访问方式，并包含已配置 `description` 的一行内容；连接后，如果没有描述，则使用服务器指令中的一行内容。提示开始时，Pi 会先等待提供 `direct` 工具的服务器，再更新这一部分。如果内容变化，例如服务器已连接且摘要变得可用，Pi 会将新部分追加到对话，而不是修改工具声明，从而保留早期消息的缓存。`describeNamespace()` 和 `searchTools()` 的 `namespace` 选项，接受 `mcp__dev-radius`、`mcp__dev_radius`、`dev-radius` 或 `dev_radius`。

具有 `codemode` 暴露方式的服务器连接后，Pi 会启用 `codemode`。具有 `deferred` 暴露方式的服务器则会启用 `tool_search`。要让模型无需搜索就能看到工具，可以通过 `toolExposure` 将它设置为 `direct`。

`toolExposure` 针对单个工具覆盖服务器的暴露方式。键可以是准确的服务器工具名称，也可以是使用 `*` 匹配任意字符的模式。准确名称优先于模式；多个模式中，首个匹配项生效。`hidden` 暴露方式的服务器，也可以只开放选定工具：

```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "exposure": "deferred",
      "toolExposure": {
        "search_code": "direct",
        "get_*": "codemode",
        "delete_*": "hidden"
      }
    }
  }
}
```

`pi mcp list` 会标记暴露方式与服务器默认值不同的工具。`/mcp` 的 Tools 视图也会显示实际生效的暴露方式。

`codemode` 或 `deferred` 暴露方式的工具，可以通过任一种间接机制访问：codemode 脚本可以调用它们，`tool_search` 也可以加载它们。Codemode 调用不依赖当前活动工具集，因此在 `/tree`、恢复会话和派生会话之后仍然可用。由 `tool_search` 加载的工具会记录到对话中，并在该分支上持续保持声明。

除非某个条目以 `mcp__` 开头，否则 `--tools` 不会移除 MCP 工具；`pi --tools read,codemode,'mcp__radius__*'` 仅保留 `radius` 的工具。`--exclude-tools` 接受相同模式，`--no-mcp` 则在单次运行中禁用 MCP，参阅[工具](cli.md#mcp-tools)。

要在没有 MCP Server 时仍保持 `codemode` 启用，可在[设置](settings.md#tools)中添加 `"defaultTools": ["+codemode"]`。要阻止自动启用 codemode，在 `mcpServers` 旁设置 `"autoEnableCodemode": false`。项目值覆盖用户级值。`codemode` 和 `tool_search` 均未启用、导致非直接工具无法调用时，Pi 会警告一次。

超过 20 KB 的文本结果，会在传给模型前移除中间内容，并插入 `…N chars truncated…` 标记。完整文本保存到结果中指定的临时文件。Codemode 脚本接收完整结果，可以在将输出返回模型之前先进行精简。

Codemode 脚本接收完整的 MCP `CallToolResult`，包括 `content`、`structuredContent` 和 `isError`。`isError` 结果在脚本中仍正常完成 Promise，但在直接调用时会作为错误报告。`image(result.content[0])` 转发图像块。服务器指令不属于任何工具描述；脚本通过 `describeNamespace("mcp__<server>")` 读取指令，该方法同时返回服务器的工具名称。

## 使用资源

已连接服务器提供[资源](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)时，Pi 会添加 Codex 与 OpenCode 使用的资源工具：

- `list_mcp_resources` 以 JSON 列出资源：`{ server?, resources: [{ server, uri, name, ... }], nextCursor? }`。提供 `server` 时列出一页，使用 `cursor` 继续下一页。未提供 `server` 时，列出所有服务器的全部资源。
- `list_mcp_resource_templates` 列出服务器未直接枚举的资源所对应的 URI 模板。
- `read_mcp_resource` 根据 `server` 和 `uri` 读取资源。文本以文本形式、图像以图像形式传给模型。其他二进制资源保存到临时文件，并向模型提供路径。脚本接收 `{ server, uri, contents }`。

这些工具可以访问所有已启用、非隐藏且提供资源的服务器。它们的暴露方式取这些服务器中最宽的一种：先是 `direct`，然后是 `codemode` 或 `deferred`。工具结果中的资源链接会标明 `read_mcp_resource` 及服务器。

Pi 不渲染 MCP Apps，因此会省略通过 `ui://` URI 或 `text/html;profile=mcp-app` 标识的 MCP Apps 资源。资源图标也会省略。

读取和列出资源遇到临时 HTTP 错误（408、429 或 5xx）后，会重试一次。工具调用不会重试，因为服务器可能已经执行了操作。

## 权限

每个 MCP 调用都经过 Pi 的工具流水线。因此，扩展的 `tool_call` 和 `tool_result` 处理器，包括权限控制，也会应用于 MCP 工具。Codemode 脚本中的调用，携带 codemode 调用 ID 作为 `parentToolCallId`。

`pi.getAllTools()` 报告各服务器声明的注解：`readOnlyHint`、`destructiveHint`、`idempotentHint` 和 `openWorldHint`。权限扩展可以使用这些提示，决定哪些调用需要确认，参阅[工具暴露方式](extensions.md#tool-exposure)。资源工具被标记为只读。

## 扩展与 SDK

### 从扩展添加服务器

扩展可以使用 `pi.registerMcpServer(name, config)` 为当前会话添加服务器，配置结构与 `mcpServers` 条目相同，参阅[扩展中的 MCP Server](extensions.md#mcp-servers)。注册的服务器与配置文件中的服务器一样连接，并在 `/mcp` 中显示扩展为其来源。

启用状态或暴露方式的修改，只对当前会话生效。配置文件中的同名服务器具有优先级，`/mcp` 会列出被覆盖的注册。`pi mcp` shell 命令不加载扩展，因此只能看到配置文件中的服务器。

### 替换内置 MCP 支持

安装了注册 `/mcp` 的扩展，例如 `pi-mcp-adapter` 时，该扩展会替换会话中的内置 MCP 支持。Pi 随后不会在会话中读取 `mcp.json` 或连接其中的服务器，`/mcp` 也归该扩展所有。移除扩展即可恢复内置行为。若要禁用内置 MCP 支持而不替换它，可以在 `pi config` 的 Built-in 中禁用 `mcp`，或在[设置](settings.md#resources)中设置 `"extensions": ["-builtin:mcp"]`。`--no-mcp` 则仅对一次运行禁用。

注册 `codemode` 或 `tool_search` 的扩展，同样会替换同名内置工具。Pi 为 MCP Server 启用替代工具，并仅在其声明 [`reachesTools`](extensions.md#tool-exposure) 时，等待其调用所需的服务器。Shell 级 `pi mcp` 命令始终使用内置实现。

### 从 SDK 使用 MCP

SDK 会话不会加载内置扩展。请向资源加载器加入 MCP 扩展；对于 `codemode` 服务器，还应加入 codemode 扩展；对于 `deferred` 服务器，还应加入工具搜索扩展。参阅 [Codemode 与 MCP](sdk.md#codemode-mcp)。

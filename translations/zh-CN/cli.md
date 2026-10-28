<a id="cli-and-modes-reference"></a>

# 命令行

本页介绍 Pi 内置的命令行命令与选项。运行 `pi --help`，或在命令后追加 `--help`，即可查看已安装版本的准确接口。顶层帮助还包含已加载扩展注册的选项。

```sh
pi [options] [--] [@files...] [messages...]
pi install <source> [options]
pi remove <source> [options]
pi uninstall <source> [options]
pi update [target] [options]
pi list
pi config [options]
pi auth <check|print-api-key|print-bearer-token> [options]
pi mcp <add|remove|list|login|logout> [options]
```

<a id="modes"></a>

## 调用与输出

```sh
pi
pi --print "Summarize this repository"
git diff | pi --print "Review this change"
pi --mode json "Inspect this repository" > events.jsonl
```

当 stdin 和 stdout 都连接终端时，Pi 会打开终端 UI，除非通过 `--print`、`--mode json` 或 `--mode rpc` 选择了其他界面。任意一条流被重定向，且未选择 JSON 或 RPC 模式时，Pi 使用打印模式。如何在交互式、打印、JSON、RPC 与 SDK 集成之间选择，见 [CLI 集成](cli-integration.md)。

| 输入 | 行为 |
|---|---|
| `message` | 提供初始提示 |
| `@path` | 将文本文件或图像加入首个提示 |
| 管道 stdin | 将其内容放到首个提示之前 |
| `--` | 停止解析选项，使提示可以以 `-` 开头 |

Pi 相对于当前工作目录解析 `@path`。工作目录还决定项目配置、资源发现与会话分组。

`--print` 控制 Pi 是否运行一次后退出，`--mode` 选择输出接口。当 stdin 和 stdout 都连接终端时，`--mode text` 不会强制单次执行；需要这种行为时，请使用 `--print`。

| 选项 | 行为 |
|---|---|
| `-p`, `--print` | 执行提供的提示，将助手的最终文本写入 stdout，然后退出 |
| `--mode text` | 选择文本输出；stdin 和 stdout 都连接终端时，仍然打开终端 UI |
| `--mode json` | 执行提供的提示，将 JSONL 事件写入 stdout，然后退出 |
| `--mode rpc` | 从 stdin 读取 JSONL 命令，向 stdout 写入响应和事件，直到关闭 |
| `--export <input> [output]` | 将会话文件导出为 HTML 后退出；省略 `output` 时自动推导目标位置 |

RPC 模式拒绝 `@file` 参数。JSON 和 RPC 模式将 stdout 保留给协议记录。见 [JSON 事件流](json.md)与 [RPC 协议](rpc.md)。

<a id="model-options"></a>

## 模型

```sh
pi --model sonnet:high
```

模型选择见[选择模型](models.md)，凭据设置见[提供商](providers.md)。

- `--provider <name>`<br>
  将 `--model` 查找限制为一个提供商。必须同时提供 `--model`。
- `--model <pattern>`<br>
  按精确 ID，或 ID／名称的模糊匹配选择模型。接受 `provider/id` 和可选的 `:<thinking>` 后缀。多个提供商匹配时，Pi 优先选择已有凭据的提供商，否则要求提供 `--provider`。
- `--api-key <key>`<br>
  使用不持久化的 API Key 覆盖值。必须通过 `--model` 或 `--models` 选定模型。它不会替你区分提供同一个模型的不同提供商。
- `--thinking <level>`<br>
  设置为 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 或 `max`。它会覆盖 `--model` 的后缀，并限制在模型支持的能力范围内。
- `--models <patterns>`<br>
  用逗号分隔的模式设置启动和循环切换的模型范围。接受精确 ID、模糊匹配、不区分大小写的 glob，以及可选的 `:<thinking>` 后缀。同一模型由多个提供商提供时，会为每个提供商都加入一项，并给出警告。
- `--list-models [search]`<br>
  列出可用模型，可选用模糊搜索过滤，然后退出。

<a id="session-options"></a>

## 会话

```sh
pi --continue
```

恢复、分叉、命名及存储会话，见[会话与上下文](sessions.md)。

- `-c`, `--continue`<br>
  继续当前项目最近的会话。
- `-r`, `--resume`<br>
  打开会话选择器。
- `--session <path|id>`<br>
  按文件路径、完整 ID 或部分 ID 打开会话。Pi 先搜索当前项目；若匹配其他项目，则提供将其分叉的选项。
- `--session-id <id>`<br>
  打开该项目中精确匹配的会话 ID；不存在时创建。ID 接受字母、数字、`.`、`_` 和 `-`。
- `--fork <path|id>`<br>
  将现有会话分叉为当前项目中的新会话。
- `--session-dir <dir>`<br>
  覆盖存储和查找目录。优先于 `PI_CODING_AGENT_SESSION_DIR` 和 `sessionDir` 设置。
- `--no-session`<br>
  使用不持久化的内存会话。
- `-n`, `--name <name>`<br>
  设置会话显示名称。

约束：

- 会话 ID 必须以字母或数字开头和结尾。
- `--fork` 不能与 `--session`、`--continue`、`--resume` 或 `--no-session` 同时使用。
- `--session-id` 不能与 `--session`、`--continue` 或 `--resume` 同时使用。可以与 `--fork` 配合，为新会话指定 ID。

<a id="tool-options"></a>

## 工具

```sh
pi --tools read,grep,find,ls --print "Review this project"
```

默认工具选择的配置方法，见[设置](settings.md#tools)。

- `-t`, `--tools <list>`<br>
  使用逗号分隔的允许列表，替换默认的内置、扩展或自定义工具选择。条目可以是工具名称或模式，其中 `*` 匹配任意字符。除非某个条目以 `mcp__` 开头，否则保留 MCP 工具，见 [MCP 工具](#mcp-tools)。仅包含 `+name` 和 `-name` 的列表不是允许列表，而是修改默认选择。
- `-xt`, `--exclude-tools <list>`<br>
  在其他所有选择选项生效之后，禁用逗号分隔的工具名称或模式，包括 MCP 工具。
- `-nbt`, `--no-builtin-tools`<br>
  禁用默认内置工具，保留扩展和自定义工具。
- `-nt`, `--no-tools`<br>
  启动时禁用全部内置、扩展、自定义和 MCP 工具。

默认启用 `read`、`bash`、`edit` 和 `write`，除非 `defaultTools` 修改了它们。`--tools` 使用普通名称时，会替换整个选择，因此必须列出每个需要的工具。与 `defaultTools` 一样，它也接受只由 `+name` 和 `-name` 组成的列表，用于在默认选择中添加或移除工具：`pi --tools +codemode,-write` 保留其他默认工具、启用 `codemode` 并禁用 `write`。这些条目接受精确工具名称，不支持 `*` 模式；按模式禁用工具请使用 `--exclude-tools`。普通名称与 `+name`/`-name` 条目不能混用。`/reload` 会启用新加入 `defaultTools` 的工具，但用 `-name` 移除的工具仍保持移除状态。

<a id="mcp-tools"></a>

`--tools` 选择向模型声明的工具。它不会移除 MCP 工具，MCP 工具的可达范围由其[暴露方式](mcp.md#control-tool-exposure)决定：`pi --tools read,codemode` 仍让 codemode 脚本能够调用每个 MCP 工具。没有被任何条目直接命名或匹配的 MCP 工具，无论其暴露方式如何，都不会直接声明；只有列入列表的 `tool_search` 才能加载它。一旦有条目以 `mcp__` 开头，`--tools` 也会过滤 MCP 工具，因此以下命令仅保留 `radius` 服务器的工具：

```sh
pi --tools read,bash,codemode,'mcp__radius__*'
```

MCP 资源工具，即 `list_mcp_resources`、`list_mcp_resource_templates`、`read_mcp_resource`，也算作 MCP 工具。要移除 MCP 工具，请使用 `--exclude-tools 'mcp__*'` 或 [`--no-mcp`](#resource-options)。

| 内置工具 | 用途 |
|---|---|
| `read` | 读取文本文件和支持的图像 |
| `bash` | 运行 Shell 命令 |
| `powershell` | 在 Windows 上运行 PowerShell 命令 |
| `edit` | 对现有文件执行精确文本替换 |
| `write` | 创建或覆盖文件 |
| `grep` | 搜索文件内容 |
| `find` | 使用 glob 模式查找路径 |
| `ls` | 列出目录内容 |

内置扩展还添加了两个工具。它们默认关闭；MCP 服务器需要它们时，MCP 扩展会将其开启，见 [MCP](mcp.md#control-tool-exposure)。要自行启用，请在 `--tools` 或 `defaultTools` 中列出其名称。

| 内置扩展 | 用途 |
|---|---|
| `codemode` | 运行调用其他工具的 JavaScript，例如通过 `Promise.allSettled` 并行调用；只有脚本输出会传给模型 |
| `tool_search` | 搜索尚未向模型声明的工具，例如以 `codemode` 或 `deferred` 方式暴露的 MCP 工具，并在下一次调用前声明匹配项 |

### 启用 codemode

要为每次会话开启 `codemode`，请在 `~/.pi/agent/settings.json` 或项目的 `.pi/settings.json` 中，将其加入默认工具：

```json
{
  "defaultTools": ["+codemode"]
}
```

这会保留 `read`、`bash`、`edit` 和 `write`，并添加 `codemode`。仅针对一次调用时，可以通过 `--tools` 添加：

```sh
pi --tools +codemode
```

即使不使用 MCP，Codemode 也很有用：脚本可以并行运行多个工具调用，在大体积输出抵达模型前进行过滤，通过 `models.classify()` 调用 TypeSafe 的 Jev 等分类模型，见[分类模型](models.md#use-classifier-models)，还可以通过 `models.generateImages()` 生成图像，见[图像模型](models.md#use-image-models)。

### codemode 如何工作

脚本运行在 QuickJS 沙箱中，通过 `tools.<name>(args)` 访问其他工具。[Codemode](codemode.md) 介绍脚本 API、工具的列出与发现方式、`store()` 和 `models` 全局对象，以及相关限制。

### 工具搜索

`tool_search` 默认关闭；通过 `"defaultTools": ["+tool_search"]` 或 `--tools` 启用。它对尚未声明的工具采用与 `searchTools()` 相同的排名方式，并为下一次模型调用声明匹配项。加载的工具会像其他工具变化一样记录在会话中，因此会在该分支上继续保持声明。

<a id="resource-options"></a>

## 资源

```sh
pi --extension ./review.ts
```

约定目录和项目信任见[配置](configuration.md)，已配置路径见[设置](settings.md#resources)，软件包来源见 [Pi 软件包](packages.md)。

- `-e`, `--extension <path>`<br>
  加载扩展文件或目录，或 `builtin:mcp` 这样的内置扩展；可以重复指定。
- `-ne`, `--no-extensions`<br>
  禁用发现到的扩展、已配置扩展和内置扩展。显式 `-e` 路径仍会加载，因此 `pi -ne -e builtin:mcp` 只保留内置 MCP 支持。
- `--no-mcp`<br>
  本次运行禁用内置 MCP 支持：不连接任何服务器，也没有 MCP 工具或 `/mcp`。它不会影响替代内置 MCP 支持的扩展。
- `--skill <path>`<br>
  加载技能文件或目录，可以重复指定。
- `-ns`, `--no-skills`<br>
  禁用发现到和已配置的技能。显式 `--skill` 路径仍会加载。
- `--prompt-template <path>`<br>
  加载提示模板文件或目录，可以重复指定。
- `-np`, `--no-prompt-templates`<br>
  禁用发现到和已配置的模板。显式 `--prompt-template` 路径仍会加载。
- `--theme <path>`<br>
  加载主题文件或目录，可以重复指定。
- `--use-theme <name[/name]>`<br>
  选择本次运行初始使用的交互主题。
- `--no-themes`<br>
  禁用发现到和已配置的主题。显式 `--theme` 路径仍会加载。
- `-nc`, `--no-context-files`<br>
  禁用 `AGENTS.md` 和 `CLAUDE.md` 发现。

资源路径仅对当前进程生效。相对路径基于当前工作目录解析。

<a id="prompt-and-display-options"></a>

## 提示与进程

```sh
pi --append-system-prompt ./instructions.md
```

保存的配置见[配置](configuration.md)，项目信任见[安全](security.md#understand-project-trust)，进程控制见[环境变量](environment-variables.md)。

- `--system-prompt <text|path>`<br>
  使用文本或现有文件的内容替换默认系统提示。
- `--append-system-prompt <text|path>`<br>
  将文本或现有文件的内容追加到系统提示，可以重复指定。
- `--tui-mode <mode>`<br>
  使用 `fullscreen`（默认）或 `regular` 终端模式。
- `--verbose`<br>
  显示详细的交互式启动信息，覆盖 `quietStartup`。
- `-a`, `--approve`<br>
  在当前进程中信任项目本地配置和资源。
- `-na`, `--no-approve`<br>
  在当前进程中忽略受信任机制控制的项目本地配置和资源。
- `--offline`<br>
  禁用包括模型目录刷新在内的自动网络活动。等同于 `PI_OFFLINE=1`。
- `-h`, `--help`<br>
  显示帮助，包括已加载扩展注册的参数，然后退出。
- `-v`, `--version`<br>
  显示 Pi 版本，然后退出。

扩展可以注册额外的长选项。未知短选项会被拒绝。

## 软件包命令

```sh
pi install npm:@scope/package
```

来源格式、过滤、安装和项目范围见 [Pi 软件包](packages.md)。

### 常见任务

| 任务 | 命令 |
|---|---|
| 安装软件包 | `pi install <source>` |
| 列出已配置的软件包 | `pi list` |
| 移除软件包及其设置条目 | `pi remove <source>` |
| 配置加载哪些软件包资源 | `pi config` |

为 `install`、`remove`、`uninstall` 或 `config` 添加 `--local` 或 `-l`，即可使用项目设置，而非全局设置。

### 更新 Pi 或软件包

不指定目标运行 `pi update` 时，会更新 Pi 本身。

| 任务 | 命令 |
|---|---|
| 更新 Pi | `pi update` |
| 更新所有已安装软件包 | `pi update --extensions` |
| 更新一个已安装软件包 | `pi update <source>` |
| 刷新模型目录 | `pi update --models` |
| 更新 Pi 及所有已安装软件包 | `pi update --all` |

选择的更新包含 Pi 时，添加 `--force` 可重新安装 Pi。

如果 Pi 由 Nix 等其他包管理器提供，`pi update` 就无法更新 Pi。请通过对应包管理器更新，例如 `nix profile upgrade pi`。软件包和模型目录更新仍然可用。

### 别名与命令选项

- `pi uninstall <source>` 是 `pi remove <source>` 的别名。
- `pi update --self`、`pi update self` 和 `pi update pi` 都是 `pi update` 的别名。
- `pi update --extension <source>` 是 `pi update <source>` 的别名。
- `-a`, `--approve` 只为当前命令信任项目本地文件。`-na`, `--no-approve` 则忽略受信任机制控制的项目本地文件。
- 在命令后追加 `-h` 或 `--help`，查看其准确用法和选项约束。

## 凭据命令

```sh
pi auth check --provider openai --json
```

身份验证命令要求提供 `--provider <provider>` 或 `--model <model>`。支持的方式见[提供商](providers.md)。

| 命令 | 说明 |
|---|---|
| `pi auth check` | 输出 `ready`、`not_ready` 或 `invalid`，分别以状态 `0`、`1` 或 `2` 退出 |
| `pi auth print-api-key` | 输出解析得到的 API Key |
| `pi auth print-bearer-token` | 输出解析得到的 OAuth Bearer Token |

| 选项 | 适用命令 | 说明 |
|---|---|---|
| `--provider <provider>` | 全部 | 解析某个提供商的凭据 |
| `--model <model>` | 全部 | 根据模型解析凭据；可以与 `--provider` 配合 |
| `--json` | `auth check` | 将结构化结果写成 JSON |
| `--credentials` | `auth check` | 就绪时输出解析得到的凭据 |
| `--no-refresh` | `auth check` | 不刷新过期的 OAuth 凭据；默认会刷新 |
| `--min-expiry <duration>` | `print-bearer-token` | 要求 Token 剩余有效时间达到指定值，单位可为 `ms`、`s`、`m` 或 `h`，例如 `30m` |

输出凭据的命令会将密钥写入 stdout。

## MCP 命令

这些命令在会话外也可使用，因此智能体可以通过 `bash` 运行它们。见 [MCP 服务器](mcp.md)。

| 命令 | 说明 |
|---|---|
| `pi mcp add <server> [options] -- <command> [args...]` | 在 `mcp.json` 中添加或替换 stdio 服务器；通过可重复指定的 `--env KEY=VALUE` 和 `--cwd <dir>` 设置其环境和工作目录。命令之后的参数会传给该命令 |
| `pi mcp add <server> [options] --url <url>` | 添加或替换 Streamable HTTP 服务器；通过可重复指定的 `--header KEY=VALUE`、`--bearer-token-env-var <NAME>`（发送 `Authorization: Bearer ${NAME}`），以及 `--oauth-client-id`、`--oauth-client-secret`、`--oauth-callback-port`、`--oauth-client-name` 配置身份验证 |
| `pi mcp remove <server>` | 从 `mcp.json` 移除服务器；保留已存储的 OAuth 凭据 |
| `pi mcp list [--json]` | 连接每个启用的服务器，输出状态、工具及错误；配置条目无效或启用的服务器未连接时，以 `1` 退出 |
| `pi mcp login <server> [--timeout <seconds>]` | 登录 OAuth 服务器：打开授权页面并等待浏览器；终端也接受粘贴的重定向 URL。`--timeout` 限制包括授权服务器请求在内的整个登录过程，默认为 300 秒 |
| `pi mcp logout <server>` | 删除服务器已存储的 OAuth 凭据 |

`add` 和 `remove` 修改 `~/.pi/agent/mcp.json`；使用 `--local`（`-l`）时，则修改当前目录的 `.pi/mcp.json`。`add` 还接受 `--exposure <mode>`，见[暴露方式](mcp.md#control-tool-exposure)，以及 `--description <text>`，且不会建立连接；运行 `pi mcp list` 检查服务器。

项目 `.pi/mcp.json` 仅会在项目已经受信任时读取。

# 提示模板

提示模板将 Markdown 文件变成可复用的 `/` 命令。当你希望复用同一个提示，而不需要添加可执行行为或一整套辅助指令时，就适合使用模板。

模板可以接收参数，并出现在命令补全中。Pi 可以从个人配置、项目配置、显式路径或 Pi 包中加载模板。项目配置只有在授予项目信任后才会加载。

## 创建模板

创建 `~/.pi/agent/prompts/review.md`：

```markdown
---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes. Focus on ${1:-correctness, security, and error handling}.
```

文件名会成为命令名，因此该模板可以通过 `/review` 使用。`description` 会显示在命令补全中；如果省略，Pi 使用第一行非空内容。

`argument-hint` 是可选字段。使用 `<angle brackets>` 表示必填参数，使用 `[square brackets]` 表示可选参数。

在活动会话中添加或修改模板后，请运行 `/reload`。

<a id="invoke-a-template"></a>

## 使用模板

在编辑器中输入模板命令：

```text
/review
/review concurrency
```

Pi 会在展开后的文本进入智能体之前展开模板。除非由同名扩展命令处理，否则扩展会先通过 `input` 事件收到原始输入。

模板支持以下替换语法：

| 语法 | 结果 |
|---|---|
| `$1`, `$2`, … | 一个位置参数 |
| `$@` 或 `$ARGUMENTS` | 将全部参数以空格连接 |
| `${1:-default}` | 第一个参数，未提供时使用默认值 |
| `${@:-default}` | 全部参数，未提供时使用默认值 |
| `${@:N}` | 从位置 `N` 开始的参数 |
| `${@:N:L}` | `L` 个参数，从位置 `N` 开始 |

参数采用类似 shell 的引号规则，因此 `/review "API compatibility"` 会传入一个包含空格的参数。

<a id="choose-where-it-loads"></a>

## 添加到 Pi

将模板放入用户或项目的提示目录。常规提示目录只加载直接位于该目录下的 `.md` 文件。

设置和包可以选择嵌套的 Markdown 文件；包清单可以通过显式路径和 glob 缩小发现范围。相关选项请参阅[设置](settings.md#resources)和 [Pi 包](packages.md)。

授予信任后，项目模板会成为编辑器中的命令。在信任陌生项目之前，请先检查其内容，参阅[安全](security.md#understand-project-trust)。

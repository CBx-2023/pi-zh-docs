# 技能

技能为 Pi 提供适用于特定工作的专门指令与辅助文件。Pi 会列出每个可用技能的名称和描述，只在任务需要时加载完整指令。

如果工作流所需上下文比提示模板更丰富，但又不需要新增可执行集成点，就可以使用技能。技能可以将脚本、参考资料和其他资源与指令一起打包。

Pi 实现了 [Agent Skills 规范](https://agentskills.io/specification)。多数无效字段只会产生警告，不会阻止启动。

## 创建技能

技能是一个包含 `SKILL.md` 的目录：

```text
pdf-tools/
├── SKILL.md
├── scripts/
│   └── extract.sh
├── references/
│   └── formats.md
└── assets/
    └── template.json
```

在 `SKILL.md` 开头编写 Frontmatter，随后写入直接明确的指令：

```markdown
---
name: pdf-tools
description: Extract text and tables from PDF files. Use when reading, converting, or inspecting PDFs.
---

# PDF tools

Read `references/formats.md` before converting a document. Run scripts relative to this skill directory.
```

描述决定模型何时考虑加载该技能，应同时说明技能做什么、适用于什么场景。避免“帮助处理 PDF”这类无法提供充分路由信息的描述。

引用包内文件时，使用相对于技能目录的路径。Pi 会告诉模型技能的位置，以便解析这些路径。

## 理解技能如何加载

启动时，Pi 扫描已配置的技能位置，将各技能的名称、描述和路径加入系统提示，但不会加入完整指令。

任务匹配时，模型读取 `SKILL.md` 并遵循其中的指令。这使详细指导仅在需要时才进入上下文。模型可能未能加载相关技能，因此需要强制使用某个技能时，请输入 `/skill:name`。

`/skill:name` 后的参数会作为用户请求追加到已加载指令之后：

```text
/skill:pdf-tools extract report.pdf
```

如果技能只应通过显式命令调用，请在 Frontmatter 中设置 `disable-model-invocation: true`。`enableSkillCommands` [设置](settings.md)控制技能命令是否显示在交互式命令发现中；手动输入的 `/skill:name` 命令仍然有效。

<a id="choose-where-it-loads"></a>

## 添加到 Pi

将技能放入用户或项目的技能目录。包含 `SKILL.md` 的目录会被递归发现。

Pi 也支持 Agent Skills 的目录位置：`~/.agents/skills/` 和 `.agents/skills/`。项目 `.agents/skills/` 目录会从工作目录向上逐层查找；如果存在仓库根目录，就在该处停止。

Pi 接受部分独立 Markdown 文件形式的技能，但包含 `SKILL.md` 的目录才是可移植形式，应当优先使用。其他加载位置请参阅[设置](settings.md#resources)和 [Pi 包](packages.md)。

项目技能可以指示模型运行脚本或修改文件。授予项目信任前，请先检查不熟悉的技能及其辅助文件。

## 编写可移植的 Frontmatter

Agent Skills 规范定义了以下字段：

| 字段 | 用途 |
|---|---|
| `name` | 命令名和显示名称 |
| `description` | 展示给模型的路由描述 |
| `license` | 许可证名称或包内许可证文件 |
| `compatibility` | 环境要求 |
| `metadata` | 额外的键值元数据 |
| `allowed-tools` | 实验性的预先批准工具列表 |
| `disable-model-invocation` | 不让模型自动选择该技能 |

名称使用小写字母、数字和连字符，不允许开头、末尾或连续的连字符。名称最多 64 个字符，描述最多 1024 个字符。

当声明的名称与父目录不一致时，Pi 既不强制要求修改，也不会警告。其他 Agent Skills 实现可能要求两者一致，因此名称匹配仍是更可移植的选择。

格式不正确的 `SKILL.md` 文件，以及声明了技能却未提供描述的文件，都不会加载。名称冲突时保留最先发现的技能，并发出警告。

## 验证和分享技能

从能够发现该技能的位置运行 Pi，然后检查启动诊断信息和 `/skill:name` 命令。在活动会话中编辑技能后，请运行 `/reload`。

使用 [Pi 包](packages.md)，通过 npm 或 git 分发一个或多个技能。将环境配置逻辑放在技能内部，并在包中声明所需的运行时依赖。

示例可参考 [Anthropic 技能集合](https://github.com/anthropics/skills)与 [Pi 技能集合](https://github.com/badlogic/pi-skills)。

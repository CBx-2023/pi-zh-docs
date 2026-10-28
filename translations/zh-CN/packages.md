# Pi 包

Pi 包将扩展、技能、提示模板和主题作为一个整体安装和分发。当某项自定义需要通过 npm 或 git 分享，或多种资源应放在一起时，可以使用包。

包就是普通目录或 npm 包，可以提供常规资源目录，在 `package.json` 的 `pi` 键下声明显式路径，并携带自己的运行时依赖。

## 安装和管理包

可以从 npm、git 或本地路径安装：

```bash
pi install npm:@example/pi-tools@1.0.0
pi install git:github.com/example/pi-tools@v1
pi install ./local-package
```

`pi list` 显示已配置的包。使用 `pi remove <source>` 移除包，使用 `pi update --extensions` 同步包安装状态。全部包命令及选项请参阅[命令行](cli.md#package-commands)。

如果某个已配置的包在启动时安装失败，例如 npm 无法访问注册表，Pi 会发出警告，跳过该包的资源，并继续运行。下次启动或运行 `/reload` 时，Pi 会再次尝试安装。`pi install` 和 `pi update --extensions` 仍会报告失败，并以非零状态码退出。

个人安装会写入 `~/.pi/agent/settings.json`。添加 `--local` 或 `-l`，则将包声明写入 `.pi/settings.json`。只有授予项目信任后，Pi 才会读取该文件中的声明。

只有确定项目信任状态后，才会安装和加载项目包。包可以执行扩展代码，也可能包含指示模型运行程序的技能。安装第三方包前，请审查源码；授予项目信任前，请审查项目包声明。

使用 `--extension` 或 `-e`，可以只在一次运行中试用包，而不将其加入设置：

```bash
pi -e npm:@example/pi-tools
```

## 选择来源

| 来源 | 示例 | 行为 |
|---|---|---|
| npm | `npm:@example/pi-tools@1.0.0` | 安装到 Pi 的 npm 目录下 |
| git | `git:github.com/example/pi-tools@v1` | 克隆并同步到选定的引用 |
| URL | `https://github.com/example/pi-tools` | 按 git 来源处理 |
| 本地 | `./pi-tools` | 从解析后的路径加载，不进行复制 |

带版本的 npm 包标识会固定版本。Git 标签和 commit 也会固定；更新包时，会同步检出内容，但不会移动已配置的引用。

相对本地路径根据包含它的设置文件解析。文件路径加载单个扩展，目录则遵循正常的包发现规则。

## 创建包

最简单的包使用常规目录：

```text
my-pi-package/
├── package.json
├── extensions/
├── skills/
├── prompts/
└── themes/
```

没有 `pi` 清单时，Pi 从这些目录中发现 TypeScript 与 JavaScript 扩展、技能目录、Markdown 提示和 JSON 主题。

资源位于其他位置，或需要筛选时，请使用显式清单：

```json
{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./src/extension.ts"],
    "skills": ["./resources/skills"],
    "prompts": ["./resources/prompts/*.md"],
    "themes": ["./resources/themes/*.json"]
  }
}
```

路径相对于包根目录解析。数组支持 glob 模式和排除规则。如果 glob 遍历无法发现以点开头或符号链接形式的资源根目录，应直接列出它们。

`pi-package` 关键词使 npm 包能够被 [Pi 包目录](https://pi.dev/packages)发现。可选的 `pi.image` 和 `pi.video` 字段用于添加目录预览。

## 声明依赖

将扩展导入的运行时包放入 `dependencies`。Pi 从 npm 或 git 来源安装包时，也会安装包依赖。

Pi 为扩展和技能提供以下包：

- `@earendil-works/pi-ai`
- `@earendil-works/pi-agent-core`
- `@earendil-works/pi-coding-agent`
- `@earendil-works/pi-tui`
- `typebox`

请将上面由宿主提供的包，以 `"*"` 版本范围声明在 `peerDependencies` 中，不要将它们打包。对于受管理的 npm 包，以及使用 npm、pnpm 或 Bun 安装的 git 包，Pi 会抑制自动安装 peer 依赖。本地包不会被安装或修改，因此其依赖树仍由包作者负责。

不要将宿主提供的包列入 `dependencies`。实体副本可能在编译后的 ESM 中绕过 Pi 的扩展模块映射，造成重复的类、注册表和初始化工作。Pi 检测到这种清单配置时，会报告扩展警告。作为依赖使用的其他 Pi 包，必须包含在发布的 tarball 中，并通过其 `node_modules` 资源路径引用。

已安装的包使用独立模块根目录加载。不要假定两个包共享同一个依赖实例，也不要依赖一个包解析另一个包未声明的依赖。

## 选择包资源

设置中的对象形式，可以缩小从包中加载的资源范围：

```json
{
  "packages": [
    {
      "source": "npm:@example/pi-tools",
      "extensions": ["extensions/*.ts", "!extensions/legacy.ts"],
      "skills": [],
      "prompts": ["prompts/review.md"]
    }
  ]
}
```

对于每种资源类型：

- 省略该属性，加载包允许的全部资源。
- 使用 `[]`，不加载该类型的任何资源。
- 使用 `!pattern`，排除匹配 glob 的资源。
- 使用 `+path`，包含一个准确指定的允许路径。
- 使用 `-path`，排除一个准确指定的路径。

筛选器只会缩小包清单定义的范围，不会让包本身未声明的资源变得可用。

运行 `pi config`，启用或禁用发现的资源以及 Pi 的内置扩展。它默认打开个人配置；按 Tab 切换范围，或运行 `pi config --local`，直接从项目覆盖配置开始。

## 理解范围和身份

同一个包可以同时出现在个人和项目设置中。通常，项目条目替代个人条目。设置 `autoload: false` 时，项目条目改为对个人包追加筛选差异。

Pi 通过包名识别 npm 包，通过不含引用的仓库 URL 识别 git 包，通过解析后的绝对路径识别本地包，从而避免等价声明导致同一个包加载两次。

打包之前，请分别参考[扩展](extensions.md)、[技能](skills.md)、[提示模板](prompt-templates.md)和[主题](themes.md)，设计各类资源。

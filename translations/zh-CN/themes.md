# 使用主题自定义 Pi

主题控制 Pi 在交互模式和 HTML 导出中使用的颜色。Pi 内置 `system`、`dark` 和 `light` 主题。你可以固定使用一个主题、跟随终端的明暗外观，也可以创建自己的配色方案。

## 使用终端配色

默认主题为 `system`。它根据终端主题构建 Pi 的颜色，让 Pi 与终端保持一致，而不是使用独立的配色方案：

- Pi 查询终端默认的前景色、背景色，以及 16 种 ANSI 颜色。
- 每种 Pi 颜色都从某种 ANSI 颜色取得色相，例如错误使用红色，链接使用蓝色。
- Pi 调整各颜色的明度，确保其与背景之间至少具有一定对比度。正文与背景及所有面板之间，始终保持至少 4.5:1 的 WCAG 对比度。
- 终端在明暗模式之间切换时，Pi 会重新查询颜色并重建主题。

主题根据终端报告的信息进行调整：

| 终端报告 | 结果 |
|---|---|
| 背景色与 ANSI 颜色 | 使用终端配色，并针对实际背景调整。 |
| 仅背景色 | 使用 Pi 自己的色相，并针对实际背景调整。 |
| 没有报告 | 使用 ANSI 颜色索引和终端默认颜色，由终端自行渲染。次要文本较淡，面板没有背景色。 |

Pi 启动时会询问终端配色。终端通常在几毫秒内回应，Pi 最多等待 100 毫秒，就会显示启动标题。如果终端未及时回应，Pi 使用 ANSI 颜色回退；如果颜色稍后才到达，例如通过较慢的 SSH 连接，Pi 仍会应用它们。`system` 是保留名称，使用该名称的自定义主题会被忽略。

<a id="selecting-a-theme"></a>

## 选择主题

打开 `/settings`，选择 **Theme**。你可以让所有终端外观使用同一主题，也可以分别为浅色和深色终端选择主题。

选择结果保存为 `theme` [设置](settings.md#terminal-and-display)：

```json
{
  "theme": "dark"
}
```

未设置 `theme` 时，Pi 使用 `system`。

自动模式先保存浅色主题，再保存深色主题：

```json
{
  "theme": "light/dark"
}
```

Pi 根据终端报告的背景色和前景色，判断终端是浅色还是深色。如果终端未报告背景，Pi 依次参考终端的明暗通知、`COLORFGBG` 环境变量，最后默认为深色。同一判断同时用于选择明暗主题对中的主题，以及决定 `system` 的外观。启用自动模式后，终端报告外观变化时，Pi 会随之切换主题。主题名称不能包含 `/`，因为 Pi 将它保留用于这一设置格式。

使用 `--use-theme`，可以只为一次运行选择初始主题，而不修改已保存的设置：

```bash
pi --use-theme light
pi --use-theme light/dark
```

命令行选项请参阅 [CLI 资源](cli.md#resources)。

## 创建自定义主题

复制一个[内置主题](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/src/modes/interactive/theme)，或创建符合 [Schema](https://pi.dev/schemas/theme.schema.json) 的 JSON 文件。内置主题使用 OKHSL 颜色，并为多个界面角色共享的颜色定义变量，因此可以直接调整色相、饱和度或明度。

1. 将文件保存为 `<agent-dir>/themes/my-theme.json`。智能体目录默认是 `~/.pi/agent`。
2. 将其 `name` 设为 `my-theme`。
3. 修改 `vars` 和 `colors` 中的值。
4. 通过 `/settings` 选择 `my-theme`。

文件名应与主题名称一致。Pi 仅会从 `<agent-dir>/themes/<name>.json` 热重载当前使用的用户主题。添加或修改其他来源的主题后，请运行 `/reload`。

## 理解主题文件

| 属性 | 是否必需 | 用途 |
|---|---|---|
| `$schema` | 否 | 根据 Pi 发布的 Schema 启用编辑器校验和补全。 |
| `name` | 是 | 在选择器和设置中标识主题。名称必须唯一，不能包含 `/`，也不能为 `system`。 |
| `appearance` | 否 | `"dark"` 或 `"light"`，表示该主题针对哪种背景设计。省略时，Pi 根据主题颜色推断。 |
| `vars` | 否 | 定义可复用的颜色值，变量可以引用其他变量。 |
| `colors` | 是 | 为终端 UI 角色分配颜色。Schema 指明必填和可选角色。 |
| `export` | 否 | 覆盖 HTML 导出的页面和面板背景。 |

主题对象采用严格格式：只接受文档列出的顶层字段和颜色 token。可复用的自定义颜色应定义在 `vars` 下；`colors` 或 `export` 下的自定义键，以及额外的顶层元数据，都会被拒绝。

颜色有六种表示形式：

| 形式 | 示例 | 含义 |
|---|---|---|
| RGB 十六进制 | `"#0af"` 或 `"#00aaff"` | 三位或六位的 sRGB 颜色。 |
| OKLCH | `"oklch(62% 0.1 200)"` | 感知明度、彩度和色相。 |
| OKHSL | `"okhsl(250 60% 55%)"` | 色相、饱和度和明度。饱和度相对于 sRGB 色域在该色相与明度下允许的最大值，因此所有值都在色域内，相同饱和度看起来也同样鲜艳。 |
| 256 色索引 | `39` | ANSI 配色中从 `0` 到 `255` 的索引。 |
| 变量引用 | `"primary"` | `vars` 中某个条目的值。 |
| 终端默认值 | `""` | 终端默认的前景色或背景色。 |

终端默认颜色会直接显示为终端自身的颜色。Pi 需要具体颜色值时，例如 HTML 导出或扩展中的颜色运算，会使用终端报告的默认颜色，或根据主题外观推测黑色或白色。

Pi 会解析链式变量引用。变量缺失或循环引用，都会使主题无效。可用时，Pi 使用真彩色，并将 OKLCH 映射到 sRGB 色域；对于 256 色终端，则使用近似颜色。HTML 导出会将 OKHSL 值转换为十六进制，因为 CSS 不支持 OKHSL。如果实际颜色与源值不同，请检查终端的真彩色检测与对比度设置，参阅[配置终端](terminal-setup.md#override-detected-capabilities)。

准确的属性、必需颜色和可接受值类型，请参阅[主题 JSON Schema](https://pi.dev/schemas/theme.schema.json)。

Pi 会在启动和 `/reload` 时报告无效的主题文件。

## 找到需要修改的颜色

主题颜色描述的是界面角色，而不是单个组件。可根据以下分组，找到 Schema 中相关部分：

| 区域 | 颜色名称 |
|---|---|
| 通用界面 | `accent`、`border*`、`text`、`muted`、`dim`、`success`、`error`、`warning` |
| 选择与全屏 | `selectedBg`、`searchMatch*`、`scrollbar*` |
| 消息 | `userMessage*`、`customMessage*`、`thinkingText` |
| 工具执行 | `toolPendingBg`、`toolSuccessBg`、`toolErrorBg`、`toolTitle`、`toolOutput` |
| Markdown | `md*` |
| 工具差异 | `toolDiff*` |
| 语法高亮 | `syntax*` |
| 编辑器模式 | `thinking*`、`bashMode` |
| HTML 导出 | `export.pageBg`、`export.cardBg`、`export.infoBg` |

Schema 是格式参考，内置主题则提供可以复制和调整的完整值。

五种颜色是可选的，省略时会继承其他颜色：

| 可选颜色 | 回退值 |
|---|---|
| `scrollbarTrack` | `muted` |
| `scrollbarThumb` | `text` |
| `searchMatchBg` | `selectedBg` |
| `searchMatchText` | `text` |
| `thinkingMax` | `thinkingXhigh` |

省略 `export` 颜色时，Pi 会根据 `userMessageBg` 推导 HTML 页面和面板背景。

## 从项目或包加载主题

将项目主题放入 `.pi/themes/`。只有授予[项目信任](security.md#understand-project-trust)后，项目主题才会加载。

你也可以通过 `themes` 设置加载主题文件和目录，或将其放入 Pi 包中分发。参阅[配置](configuration.md)、[设置](settings.md#resources)和 [Pi 包](packages.md)。

每个加载的主题都必须具有唯一名称。Pi 将重复名称报告为资源冲突。

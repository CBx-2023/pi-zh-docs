# 终端 UI

`@earendil-works/pi-tui` 提供 Pi 使用的终端组件系统。当内置对话框、通知、状态文本和组件不足以满足交互需求时，扩展可以使用它。

先从[扩展](extensions.md#interact-with-the-user)的 `ctx.ui` 方法入手。只有 UI 需要自行管理渲染、键盘或鼠标输入、焦点、布局或生命周期时，才构建自定义组件。

## 选择集成点

| 需求 | 使用方式 |
|---|---|
| 选择、确认、输入或多行编辑器 | `ctx.ui.select()`、`confirm()`、`input()` 或 `editor()` |
| 非阻塞反馈 | `ctx.ui.notify()` 或 `setStatus()` |
| 编辑器附近的持久内容 | `ctx.ui.setWidget()` |
| 替换页头、页脚或编辑器 | 对应的 `ctx.ui` 组件工厂 |
| 临时交互界面或覆盖层 | `ctx.ui.custom()` |
| 自定义工具或会话条目的渲染 | 扩展渲染器 |

这些 API 会在需要时接收 Pi 的当前主题和按键绑定。不要在扩展内部创建第二个终端渲染器。

## 理解组件模型

组件根据可用宽度，渲染一个由终端行组成的数组。它可以选择处理键盘和鼠标输入；当状态或依赖主题的内容发生变化时，必须使缓存输出失效。

每个渲染行都必须不超过提供的宽度。应测量可见终端列数，而不是字符串长度，因为 ANSI 转义、宽字符、emoji 和组合字符都会改变显示宽度。

使用 `visibleWidth()`、`truncateToWidth()`、`sliceByColumn()` 和 `wrapTextWithAnsi()`，而不是自行实现终端宽度处理。Pi 会在每行之后重置样式和超链接，因此需要在每个渲染行上重新应用样式。

更改组件状态后，使受影响组件的缓存失效，再调用注入的 `tui.requestRender()`。TUI 会合并渲染请求并更新终端。

## 组合内置组件

该包包含用于常见布局和控件的组件：

- `Text`、`Markdown`、`Image` 和 `TruncatedText` 渲染内容。
- `Container`、`VStack`、`HStack`、`Box` 和 `Spacer` 组合布局。
- `Input` 和 `Editor` 接收文本。
- `SelectList` 和 `SettingsList` 实现可搜索的选择和设置流程。
- `ScrollView` 提供有边界的可滚动视口。
- `Loader` 和 `CancellableLoader` 报告正在进行的工作。
- `MouseRegion` 为另一个组件添加指针行为。

优先使用这些组件，不要重新实现选择、滚动、文本编辑或宽度处理。扩展示例展示了如何将它们与 Pi 的边框和主题结合。

## 处理键盘输入和焦点

使用 `matchesKey()` 和 `Key` 处理终端键盘输入。解析器会考虑受支持的终端协议及修饰键。扩展组件应使用注入的 `KeybindingsManager`，处理可配置的应用操作。

显示文本光标的组件应实现 `Focusable`，并将 `CURSOR_MARKER` 放在视觉光标正前方。使用 `renderFakeCursor()` 包裹光标单元格，使 TUI 以反显方式绘制它，或在显示硬件光标时，将 `CURSOR_MARKER` 后面的模拟光标隐藏。TUI 通过该标记为输入法定位硬件光标。

包裹 `Input` 或 `Editor` 的容器，必须将自己的 `focused` 状态传递给对应子组件。未传递时，中文、日文、韩文等输入法的候选窗口可能出现在错误的屏幕位置。

替换主编辑器时，应继承 Pi 的 `CustomEditor`，以保留应用快捷键和智能体控制。

将编辑器不负责处理的按键转交给基础实现；清空自定义编辑器工厂，即可恢复默认编辑器。

## 处理鼠标输入

全屏模式会将规范化的鼠标事件路由到组件。处理器可以将事件标记为已处理、捕获拖动序列、请求焦点或请求渲染。

未处理的滚轮事件会滚动最近的 `ScrollView`。未处理的主按钮拖动仍可用于选择转录文本。OSC 8 链接优先于包围它的点击区域。

普通模式将鼠标输入交给终端，因为回滚缓冲区由终端管理。即使全屏模式支持鼠标，每项交互也都应设计键盘操作路径。

## 使用自定义界面与覆盖层

`ctx.ui.custom()` 暂时将交互区域的控制权交给一个组件，并在组件调用所提供的完成回调时兑现。

### 构建最小自定义界面

这个完整扩展展示了自定义组件的生命周期：在提供的宽度内渲染、使用注入的按键绑定、状态变化后使缓存输出失效、请求渲染，并通过 `done()` 完成：

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("pick-target", {
    description: "Pick a deployment target",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("pick-target requires interactive mode", "error");
        return;
      }

      const choices = ["development", "staging", "production"];
      const selected = await ctx.ui.custom<string | undefined>((tui, theme, keybindings, done) => {
        let selectedIndex = 0;
        let cachedWidth: number | undefined;
        let cachedLines: string[] | undefined;

        const invalidate = () => {
          cachedWidth = undefined;
          cachedLines = undefined;
        };

        return {
          render(width: number): string[] {
            if (cachedLines && cachedWidth === width) return cachedLines;

            cachedWidth = width;
            cachedLines = [
              theme.fg("accent", "Choose a deployment target"),
              ...choices.map((choice, index) => `${index === selectedIndex ? "> " : "  "}${choice}`),
              theme.fg("dim", "up/down move, enter selects, escape cancels"),
            ].map((line) => truncateToWidth(line, width));
            return cachedLines;
          },
          handleInput(data: string): void {
            if (keybindings.matches(data, "tui.select.up")) {
              selectedIndex = (selectedIndex - 1 + choices.length) % choices.length;
            } else if (keybindings.matches(data, "tui.select.down")) {
              selectedIndex = (selectedIndex + 1) % choices.length;
            } else if (keybindings.matches(data, "tui.select.confirm")) {
              done(choices[selectedIndex]);
              return;
            } else if (keybindings.matches(data, "tui.select.cancel")) {
              done(undefined);
              return;
            } else {
              return;
            }

            invalidate();
            tui.requestRender();
          },
          invalidate,
        };
      });

      if (selected) ctx.ui.notify(`Selected ${selected}`, "info");
    },
  });
}
```

这个组件不显示文本光标，因此不需要 `Focusable`。包含 `Input` 或 `Editor` 的组件必须实现 `Focusable`，并将其 `focused` 值传递给子组件。

自定义组件不会将 pi 报告为正在等待用户，因为 `ctx.ui.custom()` 也承载加载器等非阻塞 UI。内联组件等待回答时，应传入 `blocked: { kind: "question", message: "Pick a color" }`，让支持[程序状态](terminal-setup.md#program-status)的终端，在组件可见期间将 pi 显示为阻塞状态。`kind` 可以是 `"question"`、`"permission"` 或 `"auth"`。覆盖层会忽略该选项。

传入 `overlay: true`，可在现有内容上方绘制。覆盖层选项控制大小、锚点、偏移、边距和响应式可见性。在交互保持活动期间，可以通过覆盖层句柄切换焦点，或使用 `setHidden()` 暂时隐藏和显示覆盖层。

获得焦点的覆盖层会在常规渲染间持续拥有输入。如果覆盖层保持可见时，需要让其他组件接收输入，应通过句柄显式释放或转移焦点。

应将每个自定义组件实例视为只属于一次交互。再次启动该交互时，创建新实例。

通过组件工厂提供的完成回调结束交互。它会兑现 `ctx.ui.custom()` 的 Promise，并销毁组件。不要对 `ctx.ui.custom()` 创建的覆盖层调用 `OverlayHandle.hide()`。

有关定位、堆叠、焦点、响应式可见性和动画行为，见 [`overlay-qa-tests.ts`](../examples/extensions/overlay-qa-tests.ts)。

## 正确应用主题

使用传给扩展或组件回调的主题。主题辅助函数为强调、弱化文本、成功、警告、错误、工具输出和 Markdown 等语义颜色生成 ANSI 样式字符串。

使用 `theme.style()` 将前景色、背景色和文本属性组合：

```typescript
return new Text(
  theme.style("Done!", {
    fg: "success",
    bg: "toolSuccessBg",
    bold: true,
  }),
  0,
  0,
);
```

样式颜色可以是语义主题 token，也可以是具体 `Color`。`fg` 接受前景 token，`bg` 接受背景 token；若要在另一个位置使用该 token 的颜色，应传入其具体颜色，例如 `{ fg: theme.colors.userMessageBg }`。通过 `theme.colors` 访问具体颜色，需要颜色计算时，使用 `@earendil-works/pi-tui` 中的 `mixColors()` 等工具。主题设为终端默认色的 token，会使用终端自身颜色渲染；`theme.colors` 会报告终端为它们声明的颜色，终端没有声明时则使用估计值。例如，可以通过 `theme.appearance`（`"dark"` 或 `"light"`）决定应调亮还是调暗颜色。Pi 根据终端能力，将结果转换为真彩色或 256 色输出。主题 token 每个主题只转换一次；尽可能在渲染路径之外计算具体颜色。

现有的 `theme.fg()` 和 `theme.bg()` 辅助函数仍然可用，用于应用单个语义颜色。

除非 `invalidate()` 会重新构建字符串，否则不要永久保存带有主题颜色的字符串。主题切换会清空渲染缓存，但无法移除嵌入应用状态中的旧 ANSI 颜色。

在渲染期间求值的主题回调，无需特别重建。无状态组件也可以在每次渲染时重新计算主题输出。

使用[主题](themes.md)创建终端配色。渲染需要匹配当前应用主题的 Markdown 时，使用 Pi 的 `getMarkdownTheme()`。

## 保持渲染响应性

渲染发生在交互路径上。应按宽度和内容缓存成本较高的布局与语法高亮工作，再从 `invalidate()` 中清除缓存。

保持默认视图紧凑，通过展开或专用界面显示详情。自定义工具渲染应处理部分结果，并在能够安全更新时复用前一个组件。

排查渲染问题时，使用 `PI_TUI_WRITE_LOG` 捕获原始 ANSI 流。测试窄宽度、宽字符、窗口大小调整、主题变化、焦点切换，以及普通和全屏两种模式。

## 示例与源码

经过检查的扩展示例覆盖了主要模式：

- [`preset.ts`](../examples/extensions/preset.ts) 和 [`tools.ts`](../examples/extensions/tools.ts) 使用选择列表与设置列表。
- [`qna.ts`](../examples/extensions/qna.ts) 使用可取消的异步 UI。
- [`modal-editor.ts`](../examples/extensions/modal-editor.ts) 替换编辑器。
- [`custom-footer.ts`](../examples/extensions/custom-footer.ts) 替换页脚。
- [`widget-placement.ts`](../examples/extensions/widget-placement.ts) 在编辑器周围放置持久内容。
- [`doom-overlay/`](../examples/extensions/doom-overlay/) 展示持续渲染的覆盖层。

公开导出项定义于 [`packages/tui/src/index.ts`](https://github.com/earendil-works/pi/blob/main/packages/tui/src/index.ts)。扩展生命周期、状态、工具、事件和模式行为，见[扩展](extensions.md)。

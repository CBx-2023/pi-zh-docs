# 配置终端

大多数现代终端无需额外配置即可使用 Pi。如果带修饰键的按键、滚动、链接、图像、颜色或输入法（IME）候选窗位置未按预期工作，可参考本页。

Pi 使用扩展按键协议，让终端能够区分 `Shift+Enter`、`Alt+Enter` 等组合与普通 `Enter`。终端代理、复用器和 IDE 内置终端，可能会改写或丢弃这些信息。

## 故障排查

| 现象 | 从这里开始 |
|---|---|
| `Shift+Enter` 提交了输入，没有换行 | 查看下文对应终端的小节；tmux 用户参阅[在 tmux 中运行 Pi](tmux.md) |
| `Alt+Enter` 没有将后续消息加入队列 | [WezTerm](#wezterm)、[Alacritty](#alacritty) 或 [Windows Terminal](#windows-terminal) |
| 全屏滚动异常缓慢 | [iTerm2](#iterm2) |
| 链接可用，但悬停时没有预览 | [Ghostty](#ghostty) |
| 未检测到内联图像或颜色支持 | [覆盖检测到的能力](#override-detected-capabilities) |
| 输入法候选窗出现在错误位置 | [WezTerm](#wezterm) 或 [IntelliJ IDEA](#intellij-idea-integrated-terminal) |
| 仅在 tmux 内无法使用带修饰键的按键 | [在 tmux 中运行 Pi](tmux.md) |

使用 `/hotkeys` 查看 Pi 当前生效的快捷键。修改方式请参阅[按键绑定](keybindings.md)。

## Kitty

Kitty 无需额外配置，就支持所需的键盘协议。

## iTerm2

常规终端模式无需额外配置。

### 修复全屏滚动缓慢

全屏模式下，Pi 控制视口，因此 iTerm2 会发送鼠标滚轮报告，而不是滚动终端原生历史。快速触控板手势因而可能每次只移动约一行。

要改变该行为：

1. 打开 **iTerm2 > Settings > Advanced**。
2. 搜索 **Trackpad scrolls fast?**。
3. 将其设置为 **No**。

这是 iTerm2 的全局设置，也可能改变原生触控板滚动。相关底层行为见 [iTerm2 issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619)。

## Apple Terminal

可用时，Pi 会启用增强按键报告。如果 Terminal.app 仍将 `Shift+Enter` 发送为普通 Return，Pi 会使用本地 macOS 修饰键回退机制，将其视为 `Shift+Enter`。

这种回退只在 Pi 与 Terminal.app 运行于同一台 Mac 时有效。通过 SSH 在另一台机器上运行 Pi 时，它无法检查本地修饰键状态。

## Ghostty

如果 `Alt+Backspace` 不起作用，请将以下映射加入 Ghostty 配置：

```text
keybind = alt+backspace=text:\x1b\x7f
```

macOS 上的配置文件位于 `~/Library/Application Support/com.mitchellh.ghostty/config`，Linux 上位于 `~/.config/ghostty/config`。

较旧的 Claude Code 配置可能包含：

```text
keybind = shift+enter=text:\n
```

这会发送原始换行符，Pi 无法将其与 `Ctrl+J` 区分。如果添加该映射只是为了兼容较旧的 Claude Code 安装，请移除它。Pi 已经将 `Ctrl+J` 绑定为另一种换行方式，因此该映射可能看似有效，却仍阻止 Pi 和 tmux 接收真正的 `Shift+Enter` 事件。

### 在全屏模式下打开链接

全屏模式下，链接仍然可点击，但 Pi 捕获鼠标输入时，Ghostty 不会显示正常的悬停下划线或 URL 预览。在 macOS 上按住 `Shift+Command`，或在 Linux 上按住 `Shift+Ctrl`，即可使用 Ghostty 的原生链接处理。

## WezTerm

WezTerm 通常通过 xterm 扩展按键报告 `Shift+Enter`。要显式启用 Kitty 键盘协议，创建 `~/.wezterm.lua`：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

### 在 macOS 上转发 Alt+Enter

WezTerm 在 macOS 上默认将 `Option+Enter` 绑定为全屏。要用于 Pi 的后续消息队列，请在 `config.keys` 表中添加以下条目：

```lua
{
  key = 'Enter',
  mods = 'ALT',
  action = wezterm.action.SendString('\x1b[13;3u'),
}
```

完整的最小配置如下：

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

### 在 WSL 中定位输入法候选窗

如果 CJK 输入法候选窗在 WSL 中无法跟随 Pi 的文本光标，请显示硬件光标：

```bash
export PI_HARDWARE_CURSOR=1
pi
```

也可以在 Pi 设置中，将 `showHardwareCursor` 设为 `true`。

## Alacritty

Alacritty 通常能够报告 `Shift+Enter`。在 macOS 上，`Option+Enter` 可能被接收为普通 `Enter`。将以下内容加入 `~/.config/alacritty/alacritty.toml`，即可将其转发给 Pi：

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

修改文件后请重启 Alacritty。

## VS Code 集成终端

VS Code 1.109.5 及更新版本，默认在集成终端中启用 Kitty 键盘协议。

较旧版本需要在 `keybindings.json` 中添加 `Shift+Enter` 的终端绑定：

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

用户 `keybindings.json` 通常位于：

- macOS：`~/Library/Application Support/Code/User/keybindings.json`
- Linux：`~/.config/Code/User/keybindings.json`
- Windows：`%APPDATA%\\Code\\User\\keybindings.json`

## Zed 集成终端

将以下绑定添加到 Zed 的 `keymap.json`：

```json
{
  "context": "Terminal",
  "bindings": {
    "shift-enter": ["terminal::SendText", "\u001b[13;2u"],
    "ctrl--": ["terminal::SendText", "\u001b[45;5u"],
    "ctrl-alt-]": ["terminal::SendText", "\u001b[93;7u"]
  }
}
```

## Windows Terminal

Windows Terminal 使用 Pi 针对 Windows 和 WSL 的默认快捷键，完整列表请参阅[按键绑定](keybindings.md)。

### 转发 Shift+Enter

通过 `Ctrl+Shift+,` 或 **Settings > Open JSON file** 打开 Windows Terminal 的 `settings.json`，将以下对象添加到其 `actions` 数组：

```json
{
  "command": { "action": "sendInput", "input": "\u001b[13;2u" },
  "keys": "shift+enter"
}
```

完全关闭并重新打开 Windows Terminal，然后确认 `Shift+Enter` 能在 Pi 中插入新行。

### 使用 Alt+Enter 发送后续消息

Windows Terminal 默认将 `Alt+Enter` 绑定为全屏，因此 Pi 在 Windows 和 WSL 上使用 `Ctrl+Q` 发送后续消息。

要改用 `Alt+Enter`，需要配置 Windows Terminal 转发该按键，并在 Pi 的 `keybindings.json` 中将 `app.message.followUp` 绑定为 `alt+enter`，参阅[按键绑定](keybindings.md#assign-keybindings)。

## xfce4-terminal 和 Terminator

这些终端无法可靠地区分带修饰键的 Enter 与普通 `Enter`，因此 `Ctrl+Enter` 或 `Shift+Enter` 等自定义绑定可能无效。

需要这些快捷键时，请使用支持现代扩展按键的终端，例如 Kitty、Ghostty、WezTerm、iTerm2、Windows Terminal，或兼容的 Alacritty 构建。

## IntelliJ IDEA 集成终端

IntelliJ IDEA 的内置终端无法可靠地区分 `Shift+Enter` 与普通 `Enter`。请使用 `Ctrl+J` 换行，或在支持现代扩展按键的终端中运行 Pi。

如果输入法候选窗无法跟随文本光标，请显示硬件光标：

```bash
export PI_HARDWARE_CURSOR=1
pi
```

## 覆盖检测到的能力

Pi 自动检测 OSC 8 超链接、内联图像协议和真彩色支持。终端代理或复用器可能导致检测不准确。

| 能力 | 环境变量 | 设置 |
|---|---|---|
| 超链接 | `PI_HYPERLINKS=1\|0\|auto` | `terminal.hyperlinks: true\|false\|"auto"` |
| 内联图像 | `PI_IMAGE_PROTOCOL=kitty\|iterm2\|none\|auto` | `terminal.images: "kitty"\|"iterm2"\|false\|"auto"` |
| 真彩色 | `PI_TRUE_COLOR=1\|0\|auto` | `terminal.trueColor: true\|false\|"auto"` |

设置优先于环境变量。未设置值或使用 `auto` 时，保留自动检测。

只有完整终端链路支持某项能力时，才应强制启用。不受支持的转义序列可能破坏渲染。规范的值定义请参阅[环境变量](environment-variables.md#pi-process-configuration)和[设置](settings.md)。

## 程序状态

Pi 通过[程序状态协议（OSC 7501）](https://www.superlogical.com/rex/docs/build/program-status)报告状态，让终端和智能体仪表盘能够显示它正在工作、等待用户、已经完成还是发生失败：

| 状态 | 何时出现 |
|---|---|
| `working` | 正在运行智能体或压缩上下文。消息为会话名称。 |
| `blocked` | 扩展对话框或登录正在等待你操作。消息为对话框标题。 |
| `done` | 一次运行已完成。消息为会话名称。 |
| `error` | 一次运行因无法重试的错误而结束。消息为错误的第一行。 |
| `idle` | Pi 刚启动，或你取消了运行。 |

报告从不包含提示或模型输出。只有终端回应协议支持查询后，Pi 才会发送报告；tmux 和 screen 不会转发这些报告。设置 `PI_PROGRAM_STATUS=1` 可直接发送而不先查询，设置 `PI_PROGRAM_STATUS=0` 则关闭报告。

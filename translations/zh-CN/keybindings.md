# 快捷键参考

Pi 提供 `app.session.new` 等具名操作，可以为它们分配快捷键。你可以在 Pi 的[用户配置](configuration.md#agent-directory)中修改默认绑定，或为尚未分配的操作绑定按键。

运行 `/hotkeys`，查看主编辑器和应用当前生效的快捷键。

## 分配快捷键

创建 `<agent-dir>/keybindings.json`。智能体目录默认为 `~/.pi/agent`，说明见[智能体目录](configuration.md#agent-directory)。

将每个操作标识符映射为一个按键或按键列表：

```json
{
  "$schema": "https://pi.dev/schemas/keybindings.schema.json",
  "app.session.new": "ctrl+shift+n",
  "app.session.tree": ["ctrl+shift+t", "alt+shift+t"]
}
```

配置值会替换该操作的默认值。使用空列表可以禁用某个操作的快捷键：

```json
{
  "tui.altScreen.pageUp": []
}
```

编辑文件后，运行 `/reload`，将更改应用于当前会话。

## 按键语法

按键写成 `modifier+key`。修饰键包括 `ctrl`、`shift`、`alt` 和 `super`，可以组合使用。有效按键包括：

- **字母:** `a-z`
- **数字:** `0-9`
- **特殊键:** `escape`, `esc`, `enter`, `return`, `tab`, `space`, `backspace`, `delete`, `insert`, `clear`, `home`, `end`, `pageUp`, `pageDown`, `up`, `down`, `left`, `right`
- **功能键:** `f1`-`f12`
- **符号:** `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `_`, `+`, `|`, `~`, `{`, `}`, `:`, `<`, `>`, `?`

例如：`ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+super+k` 和 `ctrl+1`。

`super` 绑定要求终端能够独立报告该修饰键，通常通过 Kitty 键盘协议实现。不支持该能力的终端可能无法使用。

## 操作

### 终端 UI

#### 光标移动

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.editor.cursorUp` | `up` | 光标上移；到达顶部后浏览更早的历史 |
| `tui.editor.cursorDown` | `down` | 光标下移；到达底部后浏览更新的历史 |
| `tui.editor.historyPrevious` | 无 | 选择上一条提示历史记录 |
| `tui.editor.historyNext` | 无 | 选择下一条提示历史记录 |
| `tui.editor.cursorLeft` | `left`, `ctrl+b` | 光标左移 |
| `tui.editor.cursorRight` | `right`, `ctrl+f` | 光标右移 |
| `tui.editor.cursorWordLeft` | `alt+left`, `ctrl+left`, `alt+b` | 光标向左移动一个单词 |
| `tui.editor.cursorWordRight` | `alt+right`, `ctrl+right`, `alt+f` | 光标向右移动一个单词 |
| `tui.editor.cursorLineStart` | `home`, `ctrl+a` | 移动到行首 |
| `tui.editor.cursorLineEnd` | `end`, `ctrl+e` | 移动到行尾 |
| `tui.editor.jumpForward` | `ctrl+]` | 向前跳到指定字符 |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 向后跳到指定字符 |
| `tui.editor.pageUp` | `pageUp`, `ctrl+pageUp` | 向上翻页 |
| `tui.editor.pageDown` | `pageDown`, `ctrl+pageDown` | 向下翻页 |

专用的历史操作不受光标位置影响，始终浏览提示历史，并且优先于使用相同按键的应用操作。

#### 文本编辑

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.editor.deleteCharBackward` | `backspace` | 删除前一个字符 |
| `tui.editor.deleteCharForward` | `delete`, `ctrl+d` | 删除后一个字符 |
| `tui.editor.deleteWordBackward` | `ctrl+w`, `alt+backspace` | 删除前一个单词 |
| `tui.editor.deleteWordForward` | `alt+d`, `alt+delete` | 删除后一个单词 |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 删除至行首 |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 删除至行尾 |
| `tui.editor.yank` | `ctrl+y` | 粘贴最近删除的文本 |
| `tui.editor.yankPop` | `alt+y` | 粘贴删除文本后，循环切换已删除文本 |
| `tui.editor.undo` | `ctrl+-` (`ctrl+z` 在 Windows 上; `alt+z` 在 WSL 上) | 撤销上次编辑 |

#### 输入与选择

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.input.newLine` | `shift+enter`, `ctrl+j` | 插入新行 |
| `tui.input.submit` | `enter` | 提交输入 |
| `tui.input.tab` | `tab` | Tab 或自动补全 |
| `tui.input.copy` | `ctrl+c` | 复制选中内容 |
| `tui.select.up` | `up` | 选择上移 |
| `tui.select.down` | `down` | 选择下移 |
| `tui.select.pageUp` | `pageUp` | 在列表中向上翻页 |
| `tui.select.pageDown` | `pageDown` | 在列表中向下翻页 |
| `tui.select.confirm` | `enter` | 确认选择 |
| `tui.select.cancel` | `escape`, `ctrl+c` | 取消选择 |

#### 全屏

在全屏模式下，这些操作控制对话记录，并优先于使用相同按键的编辑器操作。

| 快捷键 ID | 默认值 | 说明 |
|---|---|---|
| `tui.altScreen.pageUp` | `pageUp` | 将对话记录向上滚动一页 |
| `tui.altScreen.pageDown` | `pageDown` | 将对话记录向下滚动一页 |
| `tui.altScreen.halfPageUp` | 无 | 将对话记录向上滚动半页 |
| `tui.altScreen.halfPageDown` | 无 | 将对话记录向下滚动半页 |
| `tui.altScreen.lineUp` | 无 | 将对话记录向上滚动一行 |
| `tui.altScreen.lineDown` | 无 | 将对话记录向下滚动一行 |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up`, `ctrl+up` (`ctrl+up` 仅用于 Windows 和 WSL) | 跳到上一条标记的消息 |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down`, `ctrl+down` (`ctrl+down` 仅用于 Windows 和 WSL) | 跳到下一条标记的消息 |
| `tui.altScreen.search` | `ctrl+shift+f` (`ctrl+f` 在 Windows 和 WSL 上) | 搜索已渲染的对话记录 |
| `tui.altScreen.searchNext` | `enter`, `ctrl+g` | 搜索时选择下一个匹配项 |
| `tui.altScreen.searchPrevious` | `shift+enter`, `ctrl+shift+g` | 搜索时选择上一个匹配项 |
| `tui.altScreen.searchClose` | `escape` | 关闭对话记录搜索 |
| `tui.altScreen.top` | `ctrl+home` | 滚动到对话记录开头 |
| `tui.altScreen.bottom` | `ctrl+end` | 滚动到对话记录末尾，并跟随新输出 |

### 应用

| 快捷键 ID | 默认值 | 说明 |
|--------|---------|-------------|
| `app.interrupt` | `escape` | 取消／中止 |
| `app.clear` | `ctrl+c` | 第一次清空编辑器，第二次退出 |
| `app.exit` | `ctrl+d` | 退出；仅在编辑器为空时生效 |
| `app.suspend` | `ctrl+z` (None 在 Windows 上) | 挂起到后台 |
| `app.editor.external` | `ctrl+g` | 在外部编辑器中打开，依次使用 `externalEditor`、`$VISUAL`、`$EDITOR`，Windows 上的记事本，或其他平台的 `nano` |
| `app.clipboard.pasteImage` | `ctrl+v` (`alt+v` 在 Windows 和 WSL 上) | 在 macOS 上粘贴文件，或从剪贴板粘贴图像或文本 |

原生 Windows 上，`app.suspend` 没有默认绑定，因为 Windows 终端不支持 Unix 作业控制。即使手动分配，Pi 也只会显示状态消息，而不会挂起。WSL 使用正常的 `ctrl+z` 和 `fg` 行为。

### 会话

| 快捷键 ID | 默认值 | 说明 |
|--------|---------|-------------|
| `app.session.new` | 无 | 开始新会话（`/new`） |
| `app.session.tree` | 无 | 打开会话树导航器（`/tree`） |
| `app.session.fork` | 无 | 分叉当前会话（`/fork`） |
| `app.session.resume` | 无 | 打开会话恢复选择器（`/resume`） |
| `app.session.togglePath` | `ctrl+p` | 切换路径显示 |
| `app.session.toggleSort` | `ctrl+s` | 切换排序模式 |
| `app.session.toggleNamedFilter` | `ctrl+n` | 切换仅显示具名会话的过滤器 |
| `app.session.rename` | `ctrl+r` | 重命名会话 |
| `app.session.delete` | `ctrl+d` | 删除会话 |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | 查询为空时删除会话 |

### 模型与思考

| 快捷键 ID | 默认值 | 说明 |
|--------|---------|-------------|
| `app.model.select` | `ctrl+l` | 打开模型选择器 |
| `app.model.cycleForward` | `ctrl+p` | 循环切换到下一个模型 |
| `app.model.cycleBackward` | `shift+ctrl+p` (`alt+p` 在 Windows 和 WSL 上) | 循环切换到上一个模型 |
| `app.models.save` | `ctrl+s` | 将选中的默认模型或限定模型配置保存到设置 |
| `app.thinking.cycle` | `shift+tab` | 循环切换思考级别 |
| `app.thinking.save` | `ctrl+s` | 将当前思考级别保存到设置 |
| `app.thinking.toggle` | `ctrl+t` | 折叠或展开思考块 |

### 显示与消息队列

| 快捷键 ID | 默认值 | 说明 |
|--------|---------|-------------|
| `app.tools.expand` | `ctrl+o` | 折叠或展开工具输出 |
| `app.message.copy` | `ctrl+x` | 在 `/tree` 中复制选中的消息；全屏模式下，`fullscreenCopyOnSelect` 为 `false` 时复制当前选区，否则复制助手的上一条消息。在 OAuth 登录界面中复制登录 URL |
| `app.message.followUp` | `alt+enter` (`ctrl+q` 在 Windows 和 WSL 上) | 将后续消息加入队列 |
| `app.message.dequeue` | `alt+up` (`alt+q` 在 Windows 和 WSL 上) | 将排队消息恢复到编辑器 |

### 树导航

| 快捷键 ID | 默认值 | 说明 |
|--------|---------|-------------|
| `app.tree.foldOrUp` | `ctrl+left`, `alt+left` | 折叠当前分支片段，或跳到上一个片段的起点 |
| `app.tree.unfoldOrDown` | `ctrl+right`, `alt+right` | 展开当前分支片段，或跳到下一个片段起点或分支末尾 |
| `app.tree.editLabel` | `shift+l` | 编辑选中树节点的标签 |
| `app.tree.toggleLabelTimestamp` | `shift+t` | 切换树中的标签时间戳显示 |
| `app.tree.filter.default` | `ctrl+d` | 将树过滤器设为默认视图 |
| `app.tree.filter.noTools` | `ctrl+t` | 切换隐藏工具结果的树过滤器 |
| `app.tree.filter.userOnly` | `ctrl+u` | 切换仅显示用户消息的树过滤器 |
| `app.tree.filter.labeledOnly` | `ctrl+l` | 切换仅显示带标签条目的树过滤器 |
| `app.tree.filter.all` | `ctrl+a` | 切换显示所有条目的树过滤器 |
| `app.tree.filter.cycleForward` | `ctrl+o` | 向前循环切换树过滤器 |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | 向后循环切换树过滤器 |

### 限定模型选择器

在通过 `/scoped-models` 打开的限定模型选择器中使用。

| 快捷键 ID | 默认值 | 说明 |
|--------|---------|-------------|
| `app.models.enableAll` | `ctrl+a` | 启用所有模型，或所有匹配当前搜索的模型 |
| `app.models.clearAll` | `ctrl+x` | 清除所有模型，或所有匹配当前搜索的模型 |
| `app.models.toggleProvider` | `ctrl+p` | 切换当前提供商下的所有模型 |
| `app.models.reorderUp` | `alt+up` | 将选中模型在循环顺序中上移 |
| `app.models.reorderDown` | `alt+down` | 将选中模型在循环顺序中下移 |

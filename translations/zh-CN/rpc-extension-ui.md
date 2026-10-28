# RPC 扩展 UI

扩展可以通过 `ctx.ui` 请求用户交互。在 RPC 模式中，受支持的调用会变成请求／响应子协议，与普通 [RPC 命令](rpc-commands.md)和[会话事件](json.md)并行存在。

扩展 UI 方法分为两类：

- **对话框方法**（`select`、`confirm`、`input`、`editor`）：向 stdout 发出 `extension_ui_request`，并阻塞，直到客户端在 stdin 返回具有匹配 `id` 的 `extension_ui_response`。
- **发送后不等待的方法**（`notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text`）：向 stdout 发出 `extension_ui_request`，但不期待响应。客户端可以显示信息，也可以忽略。

如果对话框方法包含 `timeout` 字段，超时后智能体端会自动使用默认值完成。客户端无需跟踪超时。

## 限制

部分 `ExtensionUIContext` 方法需要直接访问终端 UI，因此在 RPC 模式中不受支持或能力有所降低：

- `custom()` 返回 `undefined`。
- `onTerminalInput()` 返回一个不执行任何操作的取消订阅函数。
- `setWorkingMessage()`、`setWorkingVisible()`、`setWorkingIndicator()`、`setHiddenThinkingLabel()`、`setFooter()`、`setHeader()`、`addAutocompleteProvider()`、`setEditorComponent()` 和 `setToolsExpanded()` 不执行任何操作。
- `getEditorText()` 返回 `""`，`getEditorComponent()` 返回 `undefined`。
- `getToolsExpanded()` 返回 `false`。
- `pasteToEditor()` 委托给 `setEditorText()`，不执行终端粘贴处理。
- `getAllThemes()` 返回 `[]`，`getTheme()` 返回 `undefined`。
- `setTheme()` 返回 `{ success: false, error: "Theme switching not supported in RPC mode" }`。

注意：RPC 模式中，`ctx.mode` 为 `"rpc"`，`ctx.hasUI` 为 `true`，因为对话框和发送后不等待的方法，可以通过扩展 UI 子协议正常工作。对于 `custom()` 等要求真实终端的 TUI 专用能力，应使用 `ctx.mode === "tui"` 判断。

## Pi 发出的请求

所有请求都包含 `type: "extension_ui_request"`、唯一 `id` 和 `method` 字段。

### select

提示用户从列表中选择。包含 `timeout` 字段的对话框方法，以毫秒提供超时值；客户端未及时响应时，智能体自动以 `undefined` 完成。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-1",
  "method": "select",
  "title": "Allow dangerous command?",
  "options": ["Allow", "Block"],
  "timeout": 10000
}
```

预期响应：带有 `value`，即选项字符串，或 `cancelled: true` 的 `extension_ui_response`。

### confirm

请求用户进行是／否确认。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-2",
  "method": "confirm",
  "title": "Clear session?",
  "message": "All messages will be lost.",
  "timeout": 5000
}
```

预期响应：带有 `confirmed: true/false` 或 `cancelled: true` 的 `extension_ui_response`。

### input

请求用户输入自由文本。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

预期响应：带有 `value`，即输入文本，或 `cancelled: true` 的 `extension_ui_response`。

### editor

打开多行文本编辑器，可选提供预填内容。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

预期响应：带有 `value`，即编辑后的文本，或 `cancelled: true` 的 `extension_ui_response`。

### notify

显示通知。发送后不等待，不要求响应。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` 字段为 `"info"`、`"warning"` 或 `"error"`。省略时默认为 `"info"`。

### setStatus

设置或清除页脚／状态栏中的状态条目。发送后不等待。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

发送 `statusText: undefined`，或省略该字段，可以清除对应键的状态条目。

### setWidget

设置或清除显示在编辑器上方或下方的小组件，即文本行块。发送后不等待。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-7",
  "method": "setWidget",
  "widgetKey": "my-ext",
  "widgetLines": ["--- My Widget ---", "Line 1", "Line 2"],
  "widgetPlacement": "aboveEditor"
}
```

发送 `widgetLines: undefined`，或省略该字段，可以清除小组件。`widgetPlacement` 字段为 `"aboveEditor"`（默认）或 `"belowEditor"`。RPC 模式仅支持字符串数组；组件工厂会被忽略。

### setTitle

设置终端窗口／标签页标题。发送后不等待。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

### set_editor_text

设置输入编辑器中的文本。发送后不等待。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

## 向 Pi 返回响应

只有对话框方法，即 `select`、`confirm`、`input`、`editor`，需要发送响应。`id` 必须与请求匹配。

### 值响应（select、input、editor）

```json
{"type": "extension_ui_response", "id": "uuid-1", "value": "Allow"}
```

### 确认响应（confirm）

```json
{"type": "extension_ui_response", "id": "uuid-2", "confirmed": true}
```

### 取消响应（任意对话框）

关闭任意对话框方法。扩展会收到 `undefined`（select/input/editor）或 `false`（confirm）。

```json
{"type": "extension_ui_response", "id": "uuid-3", "cancelled": true}
```

## 示例

见经过检查的 [RPC 扩展 UI 客户端](../examples/rpc-extension-ui.ts)及其[演示扩展](../examples/extensions/rpc-demo.ts)。

导出的请求和响应联合类型定义于 [`rpc-types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-types.ts)。与模式无关的扩展指导，见[扩展](extensions.md#ui-and-modes)。

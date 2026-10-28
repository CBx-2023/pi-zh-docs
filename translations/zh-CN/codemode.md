# Codemode

`codemode` 工具让模型编写 JavaScript 脚本，调用 Pi 的其他工具，并运行分类器、图像模型等非 LLM 模型。只有脚本输出会抵达模型，因此脚本可以并行调用工具，并在模型看到大体积结果前进行过滤。启用方法见[启用 codemode](cli.md#enable-codemode)。

## 脚本

工具输入是原始 JavaScript 源码，不是 JSON，也不是 Markdown 代码围栏。它作为异步函数体在 QuickJS 沙箱中运行，因此支持顶层 `await` 和 `return`。沙箱没有 Node API、文件系统、网络或计时器；脚本只能通过工具和 `models` 访问外部世界。

脚本可以以选项行开头。它必须是第一行；选项行出现在其他位置时，调用会在运行脚本前失败：

```js
// @options: {"max_output_tokens": 2000, "timeout_ms": 60000}
```

- `max_output_tokens`（默认 10000）限制输出长度。较长输出保留开头和结尾，完整文本写入临时文件，并在结果中包含路径。当文本和 base64 图像数据超过 16777216 个字符，或调用 `text()`、`image()` 和 `console` 超过 100000 次时，脚本会失败；大体积数据应改用工具写入文件。
- `timeout_ms` 是整个脚本的硬性时限，包括等待空闲工作线程的时间。默认不设置。图像生成可能耗时数分钟，因此生成图像的脚本不要设置过短时限。

结果以 `Script completed` 或 `Script failed`、实际耗时和输出开头。文本和图像项按顺序出现，每项单独一行。输出包含多个文本项，来源为 `text()` 或 `return` 时，每项都以 `==> text N/M <==` 行开头。`console` 调用随后合并在一个 `<console_output>` 块中，每次调用占一行。失败的脚本保留已产生的输出，之后附上 `Script error:` 和错误。工具调用会真实生效：失败前已执行的调用不会回滚。脚本结束时，仍在运行的调用会被取消，未等待的 Promise 会被丢弃。

## 全局对象与函数

| 全局项 | 用途 |
|---|---|
| `tools.<name>(args)` | 调用工具，见[调用工具](#call-tools)。 |
| `text(value)` | 向输出添加文本项。字符串原样添加，其他值按 JSON 输出。 |
| `image(value)` | 向输出添加图像：可以是 base64 `data:` URL、`{ image_url }` 对象，或 `{ type: "image", data, mimeType }` 图像块，例如 MCP 工具和 `models.generateImages()` 的返回值。不支持远程 URL。接受 PNG、JPEG、GIF 和 WebP。每张图像也会保存到临时文件，结果会在图像前显示路径。 |
| `console.log(...)` | 在其他输出后的 `<console_output>` 块中添加一行。参数以空格连接；`info`、`warn`、`error` 和 `debug` 行为相同。 |
| `return value` | 顶层 `return` 像 `text()` 一样添加该值。 |
| `exit()` | 成功结束脚本。 |
| `store(key, value)` / `load(key)` | 在多次 `codemode` 调用间保留小型 JSON 值，见[存储值](#store-values)。 |
| `ALL_TOOLS` | 以 `{ name, description }` 形式列出所有可调用工具，包括描述中未列出的工具。 |
| `searchTools(query, { limit?, namespace? })` | 按相关性对可调用工具排序，使用 BM25，默认上限为 8。返回 `{ name, description }[]`。 |
| `describeTool(name)` | 返回工具描述及 TypeScript 声明，或 `undefined`。 |
| `describeNamespace(name)` | 返回 MCP Server 等命名空间的 `{ name, description?, instructions?, tools }`，或 `undefined`。 |
| `models` | 列出并运行非 LLM 模型，见[模型](#models)。 |

## 调用工具

会话可以调用的每个工具，都是 `tools` 上以工具标识符命名的方法：不符合 JavaScript 标识符规则的字符会变为 `_`，因此 MCP 工具 `mcp__dev-radius__search` 对应 `tools.mcp__dev_radius__search`。每个方法接受一个包含工具参数的对象。

调用的返回值取决于工具：

- 带有输出 Schema 的工具返回结构化值。`bash` 返回 `{ output, truncated, full_output_path?, exit_code, wall_time_seconds }`，退出码非零时也是如此。其 `output` 不受模型所见的 2000 行或 50KB 限制：最多保留 1 MiB，更长输出会在省略标记前后分别保留最前和最后 512 KiB，设置 `truncated`，并通过 `full_output_path` 提供完整输出。
- MCP 工具返回其 `CallToolResult`，包括 `isError` 和 `structuredContent`。
- `read` 返回文件文本；图像则返回可由 `image()` 显示的 `{ type: "image", data, mimeType, note }` 图像块。`data` 是模型会看到的 base64 图像，`note` 是随附文字，例如缩放提示。
- 其他工具，如 `edit` 和 `write`，返回其文本输出。

调用失败、被阻止或参数无效时，会以携带工具错误文本的 `Error` 拒绝。使用 `Promise.allSettled()` 可以保留成功调用的结果。

`codemode` 描述按命名空间，例如一个 MCP Server，列出工具及其 TypeScript 声明。以 `deferred` 方式暴露的工具不会列出，其中包括使用默认 `codemode` 暴露方式的 MCP 工具，因此 MCP Server 连接时，描述会保持不变。列出的声明共享约 3000 个 Token 的预算，对应[设置](settings.md#tools)中的 `codemode.inlineBudget`。脚本通过 `searchTools()`、`describeTool()`、`describeNamespace()` 或过滤 `ALL_TOOLS` 发现其他工具。

`codemode` 启用时，[设置](settings.md#tools)中的 `codemode.mode` 决定其他工具如何呈现。设为 `on`（默认）时，已声明工具继续保持声明，其描述会说明如何从脚本调用。设为 `only` 时，它们会对模型隐藏，改为列在 `codemode` 描述中，模型因此通过脚本调用。`codemode` 描述、`describeTool()` 和 `ALL_TOOLS` 中的工具声明会携带工具自身的提示指南，因为系统提示规则只覆盖已声明工具。

## 存储值

`store(key, value)` 将 JSON 值保存在字符串键下，供后续 `codemode` 调用使用；存储 `undefined` 会删除该键。`load(key)` 返回值，或 `undefined`。只有脚本成功时才会保留写入：每个成功且存储了值的脚本，都会向会话追加一个 `codemode-store` 自定义条目，因此恢复的会话保留这些值，每条分支也只会看到自身路径上写入的值。

存储适合 ID、游标或摘要等小型状态。单个值的 JSON 最多 262144 个字符，所有值合计最多 1048576 个字符。不要存储图像数据；使用 `image()` 展示图像，它也会将图像保存到临时文件。

## 模型

`models` 访问模型目录，并使用会话凭据运行非 LLM 模型：分类器可以针对 JSON 状态回答类型化问题，部分模型也接受图像；图像模型则生成图像。聊天模型可以列出，但不能从脚本运行。可用的分类和图像模型见[使用分类模型](models.md#use-classifier-models)与[使用图像模型](models.md#use-image-models)。

```ts
type ModelType = "chat" | "image" | "classifier";

/** A catalog entry. `provider` and `id` identify it; other fields depend on the type. */
interface ModelInfo {
  type?: ModelType;
  provider: string;
  id: string;
  name: string;
  api: string;
  input: ("text" | "image")[];
  contextWindow?: number;
  [key: string]: unknown;
}

declare const models: {
  /** Every known model of a type, optionally for one provider. */
  getModelsOfType(type: ModelType, provider?: string): Promise<ModelInfo[]>;
  /** Models of a type whose provider has working credentials. */
  getAvailableOfType(type: ModelType, provider?: string): Promise<ModelInfo[]>;
  /** One catalog entry, or undefined. */
  getModelOfType(type: ModelType, provider: string, id: string): Promise<ModelInfo | undefined>;
  /** Answer `context.questions` about `context.state`; answers are in `result.answers` by question ID. */
  classify(model: ModelInfo, context: ClassifierContext): Promise<ClassifierResult>;
  /** Generate images from `context.input` text and image blocks; show `result.output` blocks with image(). Can take minutes. */
  generateImages(model: ModelInfo, context: ImagesContext): Promise<ImagesResult>;
};
```

`classify()` 和 `generateImages()` 只使用 `model` 的 `provider` 和 `id`，因此传入 `{ provider, id }` 也可以。遇到提供商错误时它们不会抛出异常：请检查 `stopReason` 和 `errorMessage`。每个脚本同一时刻最多运行四个这类调用，更多调用会等待空闲槽位，因此对大量条目使用 `Promise.all()` 没有问题。其用量会加入 `codemode` 工具结果，并计入会话费用。

不同提供商的模型 ID 不同，例如 `typesafe/jev-latest` 与 `openrouter/typesafe/jev-1.13`。使用 `models.getAvailableOfType(type)` 查找当前凭据可用的 ID。

### 分类

```ts
interface ClassifierContext {
  /** The data to classify. */
  state: Record<string, unknown>;
  /** Images judged together with `state`. Only models whose `input` includes "image" accept them. */
  images?: { type: "image"; data: string; mimeType: string }[];
  /** Questions by ID. One call answers all of them. */
  questions: Record<string, ClassifierQuestion>;
}

type ClassifierQuestion =
  /** Pick one label. `criteria` maps each label to what it means. */
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  /** Score on an ordered scale. `criteria` describes each level, lowest first. */
  | { type: "score"; instructions: string; criteria: string[] }
  /** Yes or no. */
  | { type: "bool"; instructions: string; criteria: { true: string; false: string } };

interface ClassifierResult {
  provider: string;
  model: string;
  /** Answers by question ID. */
  answers: Record<string, ClassifierAnswer>;
  usage?: ModelUsage;
  stopReason: "stop" | "error" | "aborted";
  errorMessage?: string;
}

type ClassifierAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  /** `score` is the expected level index, from 0 to `criteria.length - 1`. */
  | { type: "score"; score: number; confidence: number }
  /** Probability of `true`. */
  | { type: "bool"; probability: number };

/** Token counts and cost in USD, when the service reports them. */
type ModelUsage = { input: number; output: number; totalTokens: number; cost: { total: number } };
```

要分类多个条目，对每个条目分别调用一次 `classify()`。以下脚本对反馈消息进行归类，例如脚本中前面的工具返回的消息：

```js
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const results = await Promise.all(
  messages.map((message) =>
    models.classify(jev, {
      state: { message },
      questions: {
        sentiment: {
          type: "choice",
          instructions: "How does the user feel about the product?",
          criteria: { positive: "Satisfied or happy", negative: "Unhappy or frustrated", neutral: "Neither" },
        },
        urgency: {
          type: "score",
          instructions: "How urgently does this need a reply?",
          criteria: ["no reply needed", "reply this week", "reply today"],
        },
      },
    }),
  ),
);
return results.map((result, i) =>
  result.stopReason === "stop"
    ? { message: messages[i], sentiment: result.answers.sentiment.choice, urgency: result.answers.urgency.score }
    : { message: messages[i], error: result.errorMessage },
);
```

`input` 包含 `"image"` 的分类器还可以判断图像。`tools.read()` 返回的图像文件是 `images` 可接受的图像块。对于其他分类器，`images` 不为空时会返回错误结果。

```js
const luna = await models.getModelOfType("classifier", "openai", "gpt-6-luna");
const photo = await tools.read({ path: "screenshot.png" });
const result = await models.classify(luna, {
  state: { task: "Settings page redesign" },
  images: [photo],
  questions: {
    broken: {
      type: "bool",
      instructions: "Does the screenshot show a broken layout?",
      criteria: { true: "Overlapping, cut-off, or misaligned elements", false: "Clean layout" },
    },
  },
});
```

### 生成图像

```ts
interface ImagesContext {
  /** The prompt as text blocks, plus image blocks to edit or use as references. */
  input: (TextBlock | ImageBlock)[];
}

interface ImagesResult {
  provider: string;
  model: string;
  /** Generated images, and text blocks for models that also return text. */
  output: (TextBlock | ImageBlock)[];
  usage?: ModelUsage;
  stopReason: "stop" | "error" | "aborted";
  errorMessage?: string;
}

type TextBlock = { type: "text"; text: string };
/** `data` is base64. */
type ImageBlock = { type: "image"; data: string; mimeType: string };
```

通过 `image(block)` 展示生成的图像。不要使用 `text()`、`console` 或 `return` 输出 `data`：数据很大，模型也无法将其当作文本读取。`image()` 还会把每张图像保存到临时文件，并在结果中给出路径，供后续轮次复制或移动。

```js
// @options: {"timeout_ms": 300000}
const painter = await models.getModelOfType("image", "openrouter", "google/gemini-2.5-flash-image");
const result = await models.generateImages(painter, {
  input: [{ type: "text", text: "A red fox in the snow, watercolor" }],
});
if (result.stopReason !== "stop") return result.errorMessage;
for (const block of result.output) {
  if (block.type === "image") image(block);
  else text(block.text);
}
```

## 限制

- 脚本的 VM 有 256 MB 内存。耗尽时会抛出 `InternalError: out of memory`；请过滤或聚合大体积数据，而不是不断累积。
- 在 Bun 上，停止脚本或达到时限会立即结束调用，但不轮询 QuickJS 中断处理器的内置函数，可能会继续在其工作线程中计算，直到返回。
- 同一 Pi 进程的所有会话合计最多有两个存活的 codemode 工作线程，可用 `PI_CODEMODE_MAX_WORKERS` 修改上限。被取消的工作线程会继续占用槽位，直到退出。达到上限时，新脚本按到达顺序等待空闲线程。如果 60 秒内，或在自身 `timeout_ms` 之前未获得线程，脚本就会失败，且不会运行。
- 如果脚本等待一个永远不可能完成的 Promise，即没有待处理工具调用，它会立即失败，因为没有计时器。
- 脚本不能启动其他 `codemode` 脚本。

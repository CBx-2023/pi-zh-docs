# 通过 Termux 在 Android 上运行 Pi

Pi 可以通过 [Termux](https://termux.dev/) 在 Android 上运行。Termux 是终端模拟器与 Linux 环境，支持文本输入、文件工具和 shell 命令。Pi 可以借助 Termux:API，通过 Android 剪贴板复制和粘贴文本，但不支持从剪贴板粘贴图像。

## 开始之前

从 [GitHub 或 F-Droid](https://github.com/termux/termux-app#installation) 安装 Termux，不要使用已弃用的 Google Play 版本。

[Termux:API](https://github.com/termux/termux-api#installation) 是可选组件。仅当你希望 Pi 复制或粘贴 Android 剪贴板文本，或 shell 命令需要访问 Android 设备 API 时才需要安装。

## 安装 Pi

1. 更新 Termux 包：

   ```bash
   pkg update && pkg upgrade
   ```

2. 安装 Node.js 和 Git：

   ```bash
   pkg install nodejs git
   ```

3. 安装 Pi：

   ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   ```

4. 验证安装：

   ```bash
   pi --version
   ```

5. 打开希望处理的目录，并启动 Pi：

   ```bash
   cd /path/to/working-folder
   pi
   ```

继续按照主[快速入门](quickstart.md#3-choose-a-model)连接模型，并运行第一个任务。

## 访问 Android 共享存储

授予权限之前，Termux 无法访问 Android 共享存储。运行一次以下命令：

```bash
termux-setup-storage
```

批准后，可以通过 `/storage/emulated/0`，以及 Termux 在 `~/storage/` 下创建的链接，访问 Android 共享存储。

只有在 Pi 确实需要访问这些文件时才应授予权限。Termux 内运行的命令和工具，与 Termux 进程拥有相同的存储权限。

## 使用剪贴板命令

Pi 使用 `termux-clipboard-set` 复制文本，通过 `termux-clipboard-get` 实现剪贴板粘贴快捷键。Shell 命令可以直接使用这两个命令。请安装 Termux:API 应用及其命令行包：

```bash
pkg install termux-api
```

验证集成：

```bash
printf 'Pi clipboard test' | termux-clipboard-set
termux-clipboard-get
```

第二条命令应当输出 `Pi clipboard test`。

Termux 剪贴板 API 只支持文本。Pi 的剪贴板粘贴快捷键会将文本插入编辑器，但无法附加剪贴板图像。

## 添加 Termux 专用指令

Pi 能检测自己正在 Termux 中运行，但无法推断你希望它如何与 Android 交互。只需将与你工作有关的环境信息添加到 `~/.pi/agent/AGENTS.md`：

````markdown
# Termux environment

- Pi runs in Termux on Android.
- Shared Android storage is under `/storage/emulated/0`.
- Open URLs with `termux-open-url "https://example.com"`.
- Open files with `termux-open <path>`.
- Do not access shared storage unless the task requires it.
````

在活动会话中修改文件后，运行 `/reload`。

## 故障排查

### 剪贴板集成失败

确认已经安装以下两个组件：

1. 与 Termux 来自同一来源的 Termux:API Android 应用
2. `termux-api` 命令行包

然后在 Pi 外运行上文的剪贴板验证命令。如果外部运行也失败，应先修复 Termux:API 安装，再重试 Pi 的复制命令。

### 共享存储提示权限不足

运行 `termux-setup-storage`，批准 Android 权限请求，然后重试 `~/storage/` 或 `/storage/emulated/0` 下的路径。

### 安装后找不到 Pi

打开新的 Termux shell 并运行：

```bash
npm prefix -g
command -v pi
```

确认全局 npm 可执行文件目录已加入 `PATH`；如果包缺失，再重新安装 Pi。

# 在 tmux 中运行 Pi

Pi 可以在 tmux 中运行，但 tmux 可能将 `Shift+Enter`、`Ctrl+Enter` 和普通 `Enter` 报告为同一个按键。启用扩展按键后，Pi 才能区分它们。

## 检查 tmux 版本

```bash
tmux -V
```

对于 tmux 3.5 或更新版本，使用下文推荐的 CSI-u 配置。对于 tmux 3.2 至 3.4，使用较旧版本的配置。

## 在 tmux 3.5 或更新版本中启用扩展按键

将以下内容添加到 `~/.tmux.conf`：

```tmux
set -g extended-keys on
set -g extended-keys-format csi-u
```

终端未直接提供 Kitty 键盘协议时，Pi 会请求报告扩展按键。通过 tmux 转发带修饰键的按键时，CSI-u 是最可靠的格式。

## 重启 tmux

配置对 tmux 服务器生效。要确保配置已启用，请关闭 tmux 会话并启动新的服务器。

如果选择从命令行停止服务器，请先保存工作。以下命令会终止该服务器管理的所有会话：

```bash
tmux kill-server
tmux
```

## 验证带修饰键的按键

在新的 tmux 会话中启动 Pi，并检查：

1. `Shift+Enter` 在编辑器中插入新行。
2. `Enter` 提交提示。
3. `Alt+Enter` 在 macOS 和 Linux 上将后续消息加入队列。Windows 和 WSL 默认使用 `Ctrl+Q`。

如果这些按键的行为仍与普通 `Enter` 相同，请确认 tmux 外部的终端能够报告带修饰键的按键，参阅[配置终端](terminal-setup.md)。

## 使用 tmux 3.2 至 3.4

这些版本支持扩展按键，但不支持 `extended-keys-format csi-u`。只需添加：

```tmux
set -g extended-keys on
```

Pi 支持这些版本使用的 xterm `modifyOtherKeys` 格式。重启 tmux，并再次执行验证步骤。

对于更旧的版本，请升级 tmux，或在 tmux 外运行 Pi，而不要依赖带修饰键的 Enter 快捷键。

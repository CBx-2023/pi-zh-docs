# 在隔离环境中运行 Pi

使用隔离环境，限制生成命令能够访问或影响的文件、凭据、进程和网络服务。

你可以隔离整个 Pi 进程，也可以让 Pi 留在宿主机上，将选定工具路由到隔离环境中执行。

## 选择隔离方式

| 方式 | Pi 运行位置 | 隔离范围 | 凭据处理方式 | 最适合 |
|---|---|---|---|---|
| 普通 Docker | 容器 | Pi、内置工具、`!` 命令和扩展 | 将凭据传入容器 | 简单直接的本地容器边界 |
| Docker Sandboxes | 托管沙箱 | Pi、内置工具、`!` 命令和扩展 | 提供商凭据留在宿主机，由代理替换 | 无需暴露真实提供商密钥的托管本地隔离 |
| OpenShell | 本地或远程沙箱 | Pi、内置工具、`!` 命令和扩展 | 通过策略控制凭据和推理路由 | 文件系统、进程、网络及凭据策略 |
| Gondolin 扩展 | 宿主机 | 内置工具和 `!` 命令 | 已保存的 Pi 凭据留在宿主机，但命令会继承宿主机环境变量 | 在保留宿主机界面的同时，通过本地 micro-VM 执行工具 |

所选方式会改变扩展的运行位置。整个 Pi 进程运行在隔离环境内时，扩展也在那里运行。宿主机上的 Pi 通过 Gondolin 委派内置工具时，其他扩展工具仍在宿主机运行，除非它们也委派自己的工作。

## 决定 Pi 可以访问什么

隔离进程仍能影响你向其开放的资源：

- 以读写方式挂载宿主机目录，就允许 Pi 修改其中的文件。
- 挂载 `~/.pi/agent`，会暴露你的 Pi 凭据、设置、扩展和会话。
- 传入容器的环境变量，可被其中的进程读取。
- 网络访问可能允许代码或工具输出离开环境。
- 仅隔离工具，不会约束宿主机上的 Pi 进程，也不会约束不使用隔离后端的扩展工具。

只开放任务所需的工作目录、凭据和网络目标。如果不希望写入影响宿主机，应使用只读挂载，或通过复制的方式向环境传入和取出文件。

## 在普通 Docker 中运行 Pi

普通 Docker 提供最简单的整进程容器边界。

### 构建镜像

创建 `Dockerfile.pi`：

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

在该文件所在目录中构建：

```bash
docker build -t pi-sandbox -f Dockerfile.pi .
```

### 启动 Pi

在希望 Pi 访问的工作目录中运行：

```bash
docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

将 `ANTHROPIC_API_KEY` 替换为所用提供商要求的凭据。命名卷 `pi-agent-home` 会在多次运行之间保留容器内的设置、凭据和会话。

除非容器确实应当访问宿主机上的 Pi 配置与凭据，否则不要挂载宿主机的 `~/.pi/agent`。

### 验证工作区

在 Pi 中运行：

```text
!pwd
```

该命令应报告 `/workspace`。对 `/workspace` 下文件的修改，会写入挂载的宿主机目录。如果不能接受这种行为，应移除绑定挂载，或改为只读挂载。

## 通过 Docker Sandboxes 运行 Pi

[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) 在托管沙箱内运行整个 Pi 进程。它的代理可以将真实的提供商凭据保留在宿主机，并在请求离开沙箱时替换凭据。

创建沙箱之前先配置凭据。不要在沙箱内运行 `/login`，否则会将真实凭据写入沙箱。

### 使用 Claude Pro 或 Max 令牌

在安装了 Claude Code 的机器上，通过 `claude setup-token` 生成令牌。如果已经配置 `anthropic` 密钥，请先移除，避免代理在 Bearer Token 之外，又添加 API Key 请求头：

```bash
sbx secret rm anthropic

sbx secret set-custom \
  --host api.anthropic.com \
  --env ANTHROPIC_OAUTH_TOKEN \
  --placeholder 'sk-ant-oat01-{rand}'
```

`sbx secret set-custom` 从标准输入读取真实令牌。沙箱收到的是 OAuth 形式的占位符，代理只会在发往已配置主机的请求中替换它。

使用 Anthropic API Key 时，改用 `sbx secret set anthropic`。

### 启动 Pi

在希望挂载的工作目录中运行：

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

对于已有沙箱，可以通过以下方式非交互式运行 Pi：

```bash
sbx exec <sandbox-name> -- pi -p "list the failing tests"
```

其他提供商、故障排查和镜像版本固定方式，请参阅 [Pi kit 文档](https://github.com/docker/sbx-kits-contrib/tree/main/pi)。

## 通过 OpenShell 运行 Pi

[NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview) 提供本地或远程沙箱，支持文件系统、进程、网络、凭据及推理策略。

### 选择网关

每个沙箱都需要一个活动网关：

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

### 创建沙箱

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

Pi、内置工具、`!` 命令和扩展工具都在 OpenShell 边界内运行。

### 将文件传入远程沙箱

远程网关不会绑定挂载宿主机工作目录。应在沙箱内克隆仓库，或显式传输文件：

```bash
openshell sandbox upload pi-sandbox ./working-folder /workspace
openshell sandbox download pi-sandbox /workspace/working-folder ./working-folder-out
```

OpenShell 的推理路由可以将原始模型凭据留在沙箱之外。完成配置后，将 Pi 指向网关提供的相应 OpenAI 兼容或 Anthropic 兼容端点。

## 通过 Gondolin 路由工具

[Gondolin](https://github.com/earendil-works/gondolin) 是一个本地 Linux micro-VM。它的示例扩展将 Pi 进程及基于文件的提供商凭据保留在宿主机，同时将内置工具和用户的 `!` 命令路由到虚拟机。

虚拟机中的命令会继承宿主进程的环境变量。因此，通过环境变量提供的提供商密钥，可能在虚拟机内可见。除非移除敏感变量，或修改扩展处理环境变量的方式，否则不要将这种模式视为凭据边界。

Gondolin 需要 Node.js 23.6 或更新版本，以及通过操作系统包管理器安装的 QEMU。

### 安装扩展

在 Pi 源码检出目录中运行：

```bash
mkdir -p ~/.pi/agent/extensions
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

### 启动 Pi

在希望挂载的工作目录中运行 Pi：

```bash
cd /path/to/working-folder
pi -e ~/.pi/agent/extensions/gondolin
```

扩展将宿主机工作目录挂载到虚拟机中的 `/workspace`，并覆盖 `read`、`write`、`edit`、`bash`、`grep`、`find` 和 `ls`。修改 `/workspace` 下的文件，会写回宿主机。

其他扩展工具仍然运行在宿主机上，除非它们明确委派操作。添加可能绕过虚拟机边界的工具之前，请先检查 [Gondolin 示例](../examples/extensions/gondolin/)。

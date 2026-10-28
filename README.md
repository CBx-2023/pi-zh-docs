# Pi 中文学习文档

Pi 官方 Latest 文档的非官方简体中文译本，包含官方导航中的 42 篇文档。沿用 MCP 中文站确认的文档布局，通过独立 Cloudflare Worker 托管。

- 站点：https://docs.starlandai.com/pi-zh-docs/
- 英文原文：https://pi.dev/docs/latest/
- 固定源码：`earendil-works/pi@a92283056d915c758799fcd904948ff0cb42628c`
- 获取日期：2026-10-28

## 开发与部署

需要 Node.js 22.12+，推荐 Node.js 24 LTS。

```sh
npm ci
npm run dev
npm run build
npm run preview
npm run deploy
```

`build` 依次校验翻译、生成页面、构建静态站点及搜索索引、检查链接与锚点，最后打包到 `deploy/pi-zh-docs/`。部署仅上传 `deploy/`。

Cloudflare Routes 只接管 `docs.starlandai.com/pi-zh-docs` 及其子路径，沿用现有主机名的 DNS 与 HTTPS；MCP 站点由自己的 Worker 继续管理。GitHub Actions 负责构建检查，不自动部署。

## 内容维护

- `upstream/`：锁定版本的英文原文、导航、MIT 许可与哈希。
- `translations/zh-CN/`：完整中文 Markdown，保持原文件名。
- `content/site.json`：中文导航与页面清单。
- `scripts/`：保真校验、路径及锚点适配、站点检查、部署打包。
- `src/`：站点布局和交互。
- `public/docs/latest/images/`：原文图片。

不要手动编辑生成的 `src/content/docs/`、`dist/` 和 `deploy/`。翻译前阅读 [TRANSLATION_PROMPT.md](TRANSLATION_PROMPT.md)；单篇检查使用 `node scripts/validate.mjs quickstart.md`。

代码块、行内代码、原始链接和显式锚点必须保留；Frontmatter 仅允许改变 `title` 的值。框架所需的路径前缀与英文标题锚点在编译阶段适配，不回写译文。

原文 © 2025 Mario Zechner，依据 MIT 许可使用，详见 [upstream/LICENSE](upstream/LICENSE)。本项目对原文进行了中文翻译，并增加独立站点软件；新增软件范围见 [LICENSE](LICENSE)。

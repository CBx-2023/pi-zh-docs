---
title: 翻译约定与来源
---

本站是 Pi 官方文档的**非官方简体中文译本**，涵盖官方 Latest 导航下的 42 篇学习指南与参考文档，沿用已确认的中文文档站布局。

## 翻译规则

- 翻译自然语言，保留准确的技术含义与原文要求强度，不删节、不擅自修正示例。
- 所有代码块逐字保留，包括注释、字符串、语言标记、缩进与图表源码。
- 行内代码、参数名、环境变量及 API 标识符保留原样。
- Frontmatter 若存在，仅可翻译 `title` 的值；其他键和值保持原样。
- 译文源文件中的链接目标、显式锚点、节点标记、HTML 标签与功能属性保持不变。可见的自然语言 `alt`、`title` 等属性可以翻译。
- 网站构建层为相对文档路径添加本站前缀，同时保留原英文标题对应的锚点。源码与译文保持独立。

## 版本来源

官方文档入口：[pi.dev/docs/latest](https://pi.dev/docs/latest/)。

本译本固定于官方仓库 [`earendil-works/pi`](https://github.com/earendil-works/pi) 的 commit [`a922830`](https://github.com/earendil-works/pi/tree/a92283056d915c758799fcd904948ff0cb42628c)，获取日期为 **2026 年 10 月 28 日**。`Latest` 是上游文档入口，本译本记录具体源码快照，避免内容随上游更新而失去对应关系。

[源码清单](/source-manifest.json)记录英文文件路径、哈希及来源。中文译文、原文快照、导航配置和构建脚本保存在 [GitHub 仓库](https://github.com/CBx-2023/pi-zh-docs)。

## 署名与许可

原文版权 © 2025 Mario Zechner；Pi 项目由 Earendil Inc. 及贡献者维护。原文依据 [MIT 许可](/upstream-license.txt)使用，本站保留完整许可和署名。

本站进行了简体中文翻译及网站展示适配，与 Pi 官方及 Earendil Inc. 无隶属或背书关系。代码保真校验不代表已逐一运行文档中的全部示例。

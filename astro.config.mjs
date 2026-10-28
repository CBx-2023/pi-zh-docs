import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import expressiveCode from "astro-expressive-code";
import { pluginFramesTexts } from "@expressive-code/plugin-frames";
pluginFramesTexts.addLocale("zh-CN", {
  terminalWindowFallbackTitle: "终端",
  copyButtonTooltip: "复制代码",
  copyButtonCopied: "已复制",
});
import { remarkPi } from "./scripts/remark-pi.mjs";
export default defineConfig({
  site: "https://docs.starlandai.com",
  base: "/pi-zh-docs",
  trailingSlash: "always",
  markdown: {
    processor: unified({ smartypants: false, remarkPlugins: [remarkPi] }),
  },
  integrations: [
    expressiveCode({
      themes: ["github-light", "github-dark"],
      defaultLocale: "zh-CN",
      frames: {
        extractFileNameFromCode: false,
        removeCommentsWhenCopyingTerminalFrames: false,
      },
      shiki: { langAlias: { tmux: "shellscript" } },
      styleOverrides: { borderRadius: "0.75rem", codeFontSize: "0.8125rem" },
    }),
  ],
});

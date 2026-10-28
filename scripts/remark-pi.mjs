import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import { parser } from "./lib.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "/pi-zh-docs";
const site = JSON.parse(
  readFileSync(path.join(root, "content/site.json"), "utf8"),
);
export function remarkPi() {
  return (tree, file) => {
    const route = file.path
      .replaceAll("\\", "/")
      .split("/src/content/docs/")[1]
      ?.replace(/\.md$/, "");
    if (!route) return;
    const page = site.pages.find((p) => p.path === route);
    if (page) {
      const en = readFileSync(path.join(root, "upstream", page.source), "utf8");
      const slugger = new GithubSlugger();
      const ids = [];
      visit(parser.parse(en), "heading", (n) => {
        ids.push(slugger.slug(toString(n)));
      });
      const explicit = new Set(
        [...en.matchAll(/<a\s[^>]*id=["']([^"']+)["']/g)].map((m) => m[1]),
      );
      let i = 0;
      visit(tree, "heading", (n) => {
        const id = ids[i++];
        n.data ??= {};
        n.data.hProperties ??= {};
        n.data.hProperties.id = explicit.has(id) ? id + "-heading" : id;
        if (n.depth === 1) n.data.hProperties.className = ["source-title"];
      });
      if (i !== ids.length)
        throw new Error("Heading count changed: " + page.source);
    }
    function target(url, image = false) {
      if (
        !url ||
        url.startsWith("#") ||
        /^(?:[a-z]+:)?\/\//i.test(url) ||
        url.startsWith("data:")
      )
        return url;
      if (url.startsWith("/pi-zh-docs/")) return url;
      if (url.startsWith("/")) return base + url;
      const [name, hash] = url.split("#");
      const clean = path.posix.normalize(name);
      const known = site.pages.find((p) => p.source === clean);
      if (known) return `${base}/${known.path}/${hash ? "#" + hash : ""}`;
      if (image || clean.startsWith("images/"))
        return `${base}/docs/latest/${clean}`;
      return `https://github.com/earendil-works/pi/blob/${JSON.parse(readFileSync(path.join(root, "upstream/manifest.json"))).commit}/packages/coding-agent/${path.posix.normalize("docs/" + clean)}${hash ? "#" + hash : ""}`;
    }
    visit(tree, (n) => {
      if (n.type === "link" || n.type === "image")
        n.url = target(n.url, n.type === "image");
      if (n.type === "html")
        n.value = n.value.replace(
          /\b(href|src)=(['"])(.*?)\2/g,
          (all, key, quote, value) =>
            `${key}=${quote}${target(value, key === "src")}${quote}`,
        );
    });
    const escape = (text) =>
      text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    visit(tree, "code", (n, index, parent) => {
      if (n.lang === "mermaid") {
        const source = escape(n.value);
        parent.children[index] = {
          type: "html",
          value: `<div class="mermaid-diagram" data-mermaid-source="${source}" data-pagefind-ignore><pre>${source}</pre></div>`,
        };
      }
    });
  };
}

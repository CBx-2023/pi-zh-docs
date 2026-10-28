import { readFile } from "node:fs/promises";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { visit } from "unist-util-visit";
export const manifest = JSON.parse(
  await readFile(new URL("../upstream/manifest.json", import.meta.url), "utf8"),
);
export const parser = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ["yaml"])
  .use(remarkGfm);
export function nodes(text, type) {
  const found = [];
  visit(parser.parse(text), type, (n) => {
    found.push(n);
  });
  return found;
}
export const raw = (text, n) =>
  text.slice(n.position.start.offset, n.position.end.offset);

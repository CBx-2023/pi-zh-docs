import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { toString } from "mdast-util-to-string";
import { dump } from "js-yaml";
import { manifest, nodes } from "./lib.mjs";
const site = JSON.parse(await readFile("content/site.json", "utf8"));
await rm("src/content/docs", { recursive: true, force: true });
await mkdir("src/content/docs", { recursive: true });
let prepared = 0;
for (const page of site.pages) {
  if (
    process.env.PI_DOCS_PARTIAL === "1" &&
    !existsSync("translations/zh-CN/" + page.source)
  )
    continue;
  prepared++;
  const zh = await readFile("translations/zh-CN/" + page.source, "utf8");
  const title =
    toString(nodes(zh, "heading").find((n) => n.depth === 1) || {}) ||
    page.label;
  const target = `src/content/docs/${page.path}.md`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(
    target,
    `---\n${dump({ title }, { lineWidth: -1 })}---\n\n${zh}`,
  );
  const raw = `public/${page.path}.md`;
  await mkdir(path.dirname(raw), { recursive: true });
  await writeFile(raw, zh);
}
await copyFile(
  "content/translation-guide.md",
  "src/content/docs/translation-guide.md",
);
await copyFile("upstream/LICENSE", "public/upstream-license.txt");
await writeFile(
  "public/source-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
const redirects = ["/ /pi-zh-docs/ 302", "/pi-zh-docs /pi-zh-docs/ 301"];
for (const r of JSON.parse(await readFile("upstream/docs.json", "utf8"))
  .redirects) {
  const from = r.from.replace(/\.md$/, "");
  const to =
    r.to === "index.md"
      ? "docs/latest"
      : "docs/latest/" + r.to.replace(/\.md$/, "");
  for (const suffix of ["", "/"])
    redirects.push(
      `/pi-zh-docs/docs/latest/${from}${suffix} /pi-zh-docs/${to}/ 302`,
    );
}
await writeFile("public/_redirects", redirects.join("\n") + "\n");
console.log(`Prepared ${prepared} Pi translations.`);

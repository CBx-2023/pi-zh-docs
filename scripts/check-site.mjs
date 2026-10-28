import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";
import { nodes, parser } from "./lib.mjs";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
const site = JSON.parse(await readFile("content/site.json", "utf8"));
const officialHeadings = JSON.parse(await readFile("upstream/headings.json", "utf8"));
const base = site.base;
const files = (await readdir("dist", { recursive: true })).filter((p) =>
  p.endsWith(".html"),
);
const docs = new Map();
const errors = [];
for (const file of files) {
  const $ = load(await readFile(path.join("dist", file), "utf8"));
  const ids = new Set();
  $("[id]").each((_, el) => {
    const id = $(el).attr("id");
    if (ids.has(id)) errors.push(`${file}: duplicate ID ${id}`);
    ids.add(id);
  });
  docs.set(file, { $, ids });
}
const redirects = new Set(
  (await readFile("dist/_redirects", "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split(/\s+/)[0]),
);
let links = 0,
  assets = 0;
for (const [file, { $ }] of docs) {
  if (file === "404.html") continue;
  const origin =
    "https://local.invalid" + base + "/" + file.replace(/index\.html$/, "");
  for (const e of $(
    'a[href],img[src],script[src],link[rel="stylesheet"]',
  ).toArray()) {
    const ref = $(e).attr(
      e.tagName === "img" || e.tagName === "script" ? "src" : "href",
    );
    if (!ref || /^(mailto:|tel:|data:)/.test(ref)) continue;
    const u = new URL(ref, origin);
    if (u.origin !== "https://local.invalid") continue;
    if (u.pathname.startsWith("/mcp-zh-docs")) continue;
    if (redirects.has(u.pathname)) continue;
    const rel = decodeURIComponent(u.pathname)
      .replace(/^\/pi-zh-docs\/?/, "")
      .replace(/^\//, "");
    const target = docs.has(path.posix.join(rel, "index.html"))
      ? path.posix.join(rel, "index.html")
      : rel;
    if (e.tagName === "a") links++;
    else assets++;
    if (!existsSync(path.join("dist", target))) {
      errors.push(`${file}: missing ${ref}`);
      continue;
    }
    if (
      u.hash &&
      docs.has(target) &&
      !docs.get(target).ids.has(decodeURIComponent(u.hash.slice(1)))
    )
      errors.push(`${file}: missing anchor ${ref}`);
  }
}
for (const page of site.pages) {
  const doc = docs.get(page.path + "/index.html");
  assert.ok(doc, `Missing page: ${page.path}`);
  const en = await readFile("upstream/" + page.source, "utf8");
  for(const id of officialHeadings[page.source])if(!doc.ids.has(id)&&!doc.ids.has(id+'-heading'))errors.push(`${page.source}: lost official heading ${id}`);
  const slugger = new GithubSlugger();
  visit(parser.parse(en), "heading", (n) => {
    const id = slugger.slug(toString(n));
    if (!doc.ids.has(id) && !doc.ids.has(id + "-heading"))
      errors.push(`${page.source}: lost heading ${id}`);
  });
  for (const m of en.matchAll(/<a\s[^>]*id=['"]([^'"]+)['"]/g))
    if (!doc.ids.has(m[1]))
      errors.push(`${page.source}: lost explicit anchor ${m[1]}`);
  const sourceBlocks=nodes(en,'code');
  const rendered=doc.$('#content pre').toArray().map(el=>{const lines=doc.$(el).find('.ec-line .code');return lines.length?lines.toArray().map(line=>doc.$(line).text()).join('\n'):doc.$(el).text()});
  if(rendered.length!==sourceBlocks.length)errors.push(`${page.source}: rendered code block count differs`);
  const trimFinalNewline=text=>text.replace(/\n$/,'');
  sourceBlocks.forEach((block,i)=>{if(trimFinalNewline(rendered[i]??'')!==trimFinalNewline(block.value))errors.push(`${page.source}: rendered code ${i+1} differs from original`)});
  const copied=doc.$('#content .expressive-code .copy button').toArray().map(el=>(doc.$(el).attr('data-code')??'').replaceAll('\u007f','\n'));
  const copySources=sourceBlocks.filter(block=>block.lang!=='mermaid');
  if(copied.length!==copySources.length)errors.push(`${page.source}: code copy button count differs`);
  copySources.forEach((block,i)=>{if(trimFinalNewline(copied[i]??'')!==trimFinalNewline(block.value))errors.push(`${page.source}: copied code ${i+1} differs from original`)});
}
assert.ok(existsSync("dist/pagefind/pagefind.js"), "Missing search index");
await writeFile(
  "reports/site-validation.json",
  JSON.stringify(
    {
      pages: files.length,
      translatedPages: site.pages.length,
      internalLinks: links,
      assets,
      errors,
    },
    null,
    2,
  ) + "\n",
);
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  `✓ ${site.pages.length} translated Pi pages, ${links} links and ${assets} assets checked.`,
);

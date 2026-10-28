import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { manifest, parser, nodes, raw } from "./lib.mjs";
const sha = (data) => createHash("sha256").update(data).digest("hex");
for (const f of manifest.files)
  assert.equal(
    sha(await readFile("upstream/" + f.path)),
    f.sha256,
    `Source changed: ${f.path}`,
  );
for (const f of manifest.assets || [])
  assert.equal(
    sha(await readFile(f.path)),
    f.sha256,
    `Image changed: ${f.path}`,
  );
const requested = process.argv.slice(2);
const files = requested.length
  ? requested
  : manifest.files.filter((f) => f.path.endsWith(".md")).map((f) => f.path);
const report = { commit: manifest.commit, pages: [] };
function shape(n) {
  if (n.type === "text") return null;
  const out = { type: n.type };
  for (const key of [
    "depth",
    "ordered",
    "start",
    "checked",
    "align",
    "url",
    "identifier",
    "label",
    "lang",
    "meta",
  ])
    if (n[key] !== undefined) out[key] = n[key];
  if (["code", "inlineCode", "definition"].includes(n.type))
    out.value = n.value;
  if (n.type === "html")
    out.value = n.value
      .replace(
        /\b(alt|title|aria-label)=(['"])[\s\S]*?\2/g,
        '$1="<translated>"',
      )
      .replace(/>[^<]+</g, "><");
  if (n.children) {
    out.children = n.children.map(shape).filter(Boolean);
    if (["paragraph", "heading"].includes(n.type))
      out.children.sort((a, b) =>
        JSON.stringify(a).localeCompare(JSON.stringify(b)),
      );
  }
  return out;
}
for (const file of files) {
  const en = await readFile("upstream/" + file, "utf8"),
    zh = await readFile("translations/zh-CN/" + file, "utf8");
  try {
    assert.deepEqual(shape(parser.parse(zh)), shape(parser.parse(en)));
  } catch {
    const tag = file.replace(/\W/g, "_");
    await mkdir(".work", { recursive: true });
    await writeFile(
      `.work/${tag}-en-shape.json`,
      JSON.stringify(shape(parser.parse(en)), null, 2),
    );
    await writeFile(
      `.work/${tag}-zh-shape.json`,
      JSON.stringify(shape(parser.parse(zh)), null, 2),
    );
    throw new Error(
      `Markdown structure or protected values changed: ${file}; inspect .work/${tag}-*-shape.json`,
    );
  }
  for (const type of ["code", "inlineCode"]) {
    const a = nodes(en, type).map((n) => raw(en, n)),
      b = nodes(zh, type).map((n) => raw(zh, n));
    if (type === "inlineCode") {
      a.sort();
      b.sort();
    }
    assert.deepEqual(b, a, `${type} bytes changed: ${file}`);
  }
  const yaml = (t) =>
    nodes(t, "yaml").map((n) =>
      raw(t, n).replace(/^title:.*$/m, "title: <translated>"),
    );
  assert.deepEqual(yaml(zh), yaml(en), `Frontmatter changed: ${file}`);
  assert.deepEqual(
    zh.match(/\{#[^}]+\}/g) || [],
    en.match(/\{#[^}]+\}/g) || [],
    `Node markers changed: ${file}`,
  );
  const candidates = nodes(zh, "text")
    .map((n) => n.value)
    .filter((t) => /[A-Za-z]{3}/.test(t) && !/[\u3400-\u9fff]/.test(t));
  report.pages.push({
    file,
    codeBlocks: nodes(en, "code").length,
    links: nodes(en, "link").length,
    untranslatedCandidates: [...new Set(candidates)],
  });
  console.log(`✓ ${file}: protected structure, code and links identical`);
}
await mkdir("reports", { recursive: true });
await writeFile(
  "reports/translation-validation.json",
  JSON.stringify(report, null, 2) + "\n",
);

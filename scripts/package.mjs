import { cp, rm, mkdir, copyFile, writeFile } from "node:fs/promises";
await rm("deploy", { recursive: true, force: true });
await mkdir("deploy", { recursive: true });
await cp("dist", "deploy/pi-zh-docs", { recursive: true });
await copyFile("dist/_redirects", "deploy/_redirects");
await copyFile("dist/404.html", "deploy/404.html");
await rm("deploy/pi-zh-docs/_redirects");
await writeFile(
  "deploy/_headers",
  "/pi-zh-docs/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n",
);
console.log("Packaged /pi-zh-docs/ assets.");

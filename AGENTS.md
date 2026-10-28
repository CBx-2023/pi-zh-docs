# Project instructions

This repository contains an unofficial Chinese translation of the Pi learning documentation.

- Read `TRANSLATION_PROMPT.md` before editing translations.
- Never change `upstream/` snapshots without an explicit source update and matching manifest changes.
- Edit `translations/zh-CN/` or `content/`; never edit generated `src/content/docs/`.
- Keep every code block byte-for-byte identical, including comments, strings, fence info and Mermaid.
- In translation frontmatter, change only the value of `title`.
- Keep URLs, anchors, component structure and expressions intact. Framework adaptations belong in scripts/components.
- Run `npm run build` before publishing. It includes translation and generated-site checks.
- Preserve the license boundary between original site software and upstream material.
- Deploy only the packaged `deploy/` output to the intended Cloudflare account.

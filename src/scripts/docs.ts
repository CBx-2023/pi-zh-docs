const theme = document.querySelector(".theme-toggle");
theme?.addEventListener("click", () => {
  const t =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("pi-docs-theme", t);
  } catch {}
});
const menu = document.querySelector(".mobile-menu");
function closeMenu() {
  document.body.classList.remove("navigation-open");
  menu?.setAttribute("aria-expanded", "false");
}
menu?.addEventListener("click", () => {
  const open = document.body.classList.toggle("navigation-open");
  menu.setAttribute("aria-expanded", String(open));
});
document
  .querySelector(".mobile-backdrop")
  ?.addEventListener("click", closeMenu);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});
document.querySelectorAll<HTMLButtonElement>(".copy-page").forEach((button) =>
  button.addEventListener("click", async () => {
    try {
      let text = document.querySelector("#content")?.textContent ?? "";
      if (button.dataset.copyUrl) {
        const response = await fetch(button.dataset.copyUrl);
        if (!response.ok) throw new Error("Page source unavailable");
        text = await response.text();
      }
      await navigator.clipboard.writeText(text);
      const label = button.querySelector("span");
      if (label) {
        label.textContent = "已复制";
        setTimeout(() => (label.textContent = "复制页面"), 1800);
      }
    } catch {
      button.setAttribute("aria-label", "复制失败，请手动选择正文");
    }
  }),
);
function updateToc() {
  document.querySelectorAll<HTMLAnchorElement>(".page-toc a").forEach((a) => {
    const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    a.parentElement?.toggleAttribute(
      "hidden",
      !!el?.closest('[role="tabpanel"][hidden]'),
    );
  });
}
const observer = new MutationObserver(updateToc);
document
  .querySelectorAll('[role="tabpanel"]')
  .forEach((p) =>
    observer.observe(p, { attributes: true, attributeFilter: ["hidden"] }),
  );
updateToc();
const sections = [
  ...document.querySelectorAll<HTMLElement>(
    ".mdx-content h2[id],.mdx-content h3[id]",
  ),
];
const highlight = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        document
          .querySelectorAll(".page-toc a")
          .forEach((a) =>
            a.classList.toggle(
              "current",
              a.getAttribute("href") === "#" + entry.target.id,
            ),
          );
      }
  },
  { rootMargin: "-120px 0px -65% 0px" },
);
sections.forEach((s) => highlight.observe(s));
async function renderDiagrams() {
  const containers = [
    ...document.querySelectorAll<HTMLElement>("[data-mermaid-source]"),
  ];
  if (!containers.length) return;
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme:
      document.documentElement.dataset.theme === "dark" ? "dark" : "neutral",
    fontFamily: "system-ui,sans-serif",
  });
  for (const [index, container] of containers.entries())
    try {
      const { svg } = await mermaid.render(
        `pi-diagram-${index}`,
        container.dataset.mermaidSource!,
      );
      container.innerHTML = svg;
      container.setAttribute("role", "img");
      container.setAttribute(
        "aria-label",
        "Pi 生命周期图（图中文字保留英文原文）",
      );
    } catch {
      container.dataset.rendered = "error";
    }
}
renderDiagrams();

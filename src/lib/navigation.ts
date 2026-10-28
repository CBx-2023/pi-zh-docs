import site from "../../content/site.json";
export const base = "/pi-zh-docs";
export const local = (path: string) => `${base}/${path.replace(/^\//, "")}`;
export const groups = site.navigation;
export const pages = site.pages;

import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".zip": "application/zip",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
};
const assets = {};
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "server" || entry.name === ".openai") continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else
      assets["/" + path.relative(root, file).split(path.sep).join("/")] = [
        types[path.extname(file)] || "application/octet-stream",
        fs.readFileSync(file).toString("base64"),
      ];
  }
}
walk(root);
const source = fs
  .readFileSync("worker/static-response.mjs", "utf8")
  .replace("export function", "function");
fs.mkdirSync("dist/server", { recursive: true });
fs.mkdirSync("dist/.openai", { recursive: true });
fs.writeFileSync(
  "dist/server/index.js",
  source +
    "\nconst assets=" +
    JSON.stringify(assets) +
    ";\nexport default {fetch:createStaticHandler(path=>{const asset=assets[path];if(!asset)return null;return {type:asset[0],body:Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0))};})};\n",
);
if (fs.existsSync(".openai/hosting.json")) {
  fs.copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");
}
console.log(
  "Built static UTF-8 Worker for " + Object.keys(assets).length + " assets.",
);

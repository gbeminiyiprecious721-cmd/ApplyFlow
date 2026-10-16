import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createStaticHandler } from "../worker/static-response.mjs";
const root = path.resolve("dist");
const handler = createStaticHandler((url) => {
  const file = path.join(root, url);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return {
    body: fs.readFileSync(file),
    type: url.endsWith(".html") ? "text/html" : "application/octet-stream",
  };
});
function htmlFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() && !["server", ".openai"].includes(e.name)
        ? htmlFiles(path.join(dir, e.name))
        : e.isFile() && e.name.endsWith(".html")
          ? [path.join(dir, e.name)]
          : [],
    );
}
for (const file of htmlFiles(root)) {
  const response = await handler(
    new Request("http://local/" + path.relative(root, file)),
  );
  assert.match(
    response.headers.get("content-type"),
    /^text\/html; charset=utf-8$/i,
  );
  assert.match(await response.text(), /<meta charset=["']?utf-8/i);
}
for (const [method, url, status] of [
  ["GET", "/missing", 404],
  ["POST", "/", 405],
  ["HEAD", "/", 200],
]) {
  const r = await handler(new Request("http://local" + url, { method }));
  assert.equal(r.status, status);
  assert.match(r.headers.get("content-type"), /charset=utf-8/);
  if (method === "HEAD") assert.equal(await r.text(), "");
}
console.log(
  "HTML: all shipped HTML files, error responses, and HEAD declare UTF-8.",
);

const postDeployCheckerPath = path.resolve(
  "scripts/check-deployed-content-type.mjs",
);
assert(
  fs.existsSync(postDeployCheckerPath),
  "post-deploy content-type checker should exist",
);
const { checkDeployedHtml } = await import(
  pathToFileURL(postDeployCheckerPath).href,
);
const mockSite = createServer((request, response) => {
  if (request.url === "/wrong-type") {
    response.writeHead(200, { "Content-Type": "text/plain" });
  } else {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
  }
  response.end("ok");
});
await new Promise((resolve) => mockSite.listen(0, "127.0.0.1", resolve));
const mockOrigin = `http://127.0.0.1:${mockSite.address().port}`;
try {
  await checkDeployedHtml(mockOrigin);
  await assert.rejects(
    checkDeployedHtml(`${mockOrigin}/wrong-type`),
    /text\/html; charset=utf-8/,
  );
} finally {
  await new Promise((resolve, reject) =>
    mockSite.close((error) => (error ? reject(error) : resolve())),
  );
}

execFileSync(process.execPath, ["scripts/build-static-worker.mjs"]);
const built = (
  await import(
    "data:text/javascript;base64," +
      fs.readFileSync("dist/server/index.js").toString("base64")
  )
).default;
for (const url of [
  "/",
  "/index.html",
  "/agent-sandbox.html",
  "/clipper/popup.html",
  "/missing",
]) {
  const r = await built.fetch(new Request("https://fixture.invalid" + url));
  assert.match(r.headers.get("content-type"), /text\/html; charset=utf-8/);
}
for (const url of [
  "/vendor/DejaVuSans.ttf",
  "/vendor/jspdf.umd.min.js",
  "/ApplyFlow-Job-Clipper.zip",
]) {
  const r = await built.fetch(new Request("https://fixture.invalid" + url));
  assert.equal(r.status, 200);
  assert.deepEqual(
    Buffer.from(await r.arrayBuffer()),
    fs.readFileSync(path.join(root, url)),
  );
}
console.log(
  "Built Worker: HTML headers, font, PDF library and extension ZIP bytes verified.",
);

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createStaticHandler } from "../../worker/static-response.mjs";
const root = path.resolve("dist"),
  tables = new Map(),
  files = new Map(),
  accounts = new Map();
const denied = { data: null, error: { message: "Access denied" } };
const ok = (data) => ({ data, error: null });
function api(q) {
  const rows = tables.get(q.table) || [];
  const visible = (r) => q.table === "jobs" || r.user_id === q.owner;
  const matches = (r) =>
    visible(r) &&
    (q.filters || []).every(([op, k, v]) =>
      op === "in"
        ? v.includes(r[k])
        : op === "neq"
          ? r[k] !== v
          : op === "is" && v === null
            ? r[k] == null
            : r[k] === v,
    );
  if (q.op === "signup" || q.op === "signin") {
    let account = accounts.get(q.email);
    if (q.op === "signup") {
      if (account) return { error: { message: "Account already registered" } };
      account = {
        id: crypto.randomUUID(),
        email: q.email,
        password: q.password,
      };
      accounts.set(q.email, account);
    }
    if (!account || account.password !== q.password) return denied;
    const user = { id: account.id, email: account.email };
    return ok({
      user,
      session: {
        user,
        access_token: "local-test-session",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    });
  }
  if (!q.owner) return denied;
  if (q.op === "rpc" && q.name === "upsert_normalized_job") {
    const jobs = tables.get("jobs") || [];
    const old = jobs.find(
      (j) => j.canonical_url === q.args.p_job.canonical_url,
    );
    if (old) return ok(old.id);
    const record = { id: crypto.randomUUID(), ...q.args.p_job };
    jobs.push(record);
    tables.set("jobs", jobs);
    return ok(record.id);
  }
  if (q.op === "query") {
    let selected = rows.filter(matches);
    if (q.method === "insert" || q.method === "upsert") {
      selected = [];
      for (const value of [].concat(q.rows || [])) {
        if (q.table !== "jobs" && value.user_id && value.user_id !== q.owner)
          return denied;
        const record = {
          id: crypto.randomUUID(),
          user_id: q.owner,
          created_at: new Date().toISOString(),
          ...value,
        };
        const keys = (q.conflict || "id").split(",");
        const old =
          q.method === "upsert" &&
          rows.find((r) => visible(r) && keys.every((k) => r[k] === record[k]));
        if (old) {
          Object.assign(old, record, { id: old.id });
          selected.push(old);
        } else {
          rows.push(record);
          selected.push(record);
        }
      }
    } else if (q.method === "delete") {
      tables.set(
        q.table,
        rows.filter((r) => !matches(r)),
      );
      return ok(selected);
    } else if (q.method === "update")
      selected.forEach((r) => Object.assign(r, q.rows));
    tables.set(q.table, rows);
    if (q.order) {
      const [k, asc] = q.order;
      selected.sort(
        (a, b) => String(a[k]).localeCompare(String(b[k])) * (asc ? 1 : -1),
      );
    }
    if (q.limit) selected = selected.slice(0, q.limit);
    return ok(q.single ? selected[0] || null : selected);
  }
  const fileKey = q.bucket + "/" + q.path;
  if (q.op === "upload") {
    if (!q.path.startsWith(q.owner + "/")) return denied;
    files.set(fileKey, { content: q.content, type: q.type });
    return ok({ path: q.path });
  }
  if (q.op === "download") {
    if (!q.path.startsWith(q.owner + "/") || !files.has(fileKey)) return denied;
    return ok(files.get(fileKey));
  }
  if (q.op === "list")
    return ok(
      [...files.keys()]
        .filter(
          (k) =>
            k.startsWith(q.bucket + "/" + q.owner + "/") &&
            k.startsWith(q.bucket + "/" + q.prefix),
        )
        .map((k) => ({
          name: k.slice((q.bucket + "/" + q.prefix + "/").length),
        })),
    );
  if (q.op === "remove") {
    for (const p of q.paths) {
      if (!p.startsWith(q.owner + "/")) return denied;
      files.delete(q.bucket + "/" + p);
    }
    return ok([]);
  }
  return denied;
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".zip": "application/zip",
};
const handler = createStaticHandler((url) => {
  if (url === "/__e2e/job.html")
    return {
      type: "text/html",
      body: fs.readFileSync("tests/e2e/fixtures/job.html"),
    };
  const file = path.resolve(root, "." + decodeURIComponent(url));
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  )
    return null;
  return {
    type: types[path.extname(file)] || "application/octet-stream",
    body: fs.readFileSync(file),
  };
});
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/__e2e/api") {
      let body = "";
      for await (const chunk of req) body += chunk;
      if (body.length > 16000000) throw Error("Too large");
      const result = api(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result));
      return;
    }
    if (url.pathname === "/__e2e/file") {
      const result = api({
        op: "download",
        ...Object.fromEntries(url.searchParams),
      });
      if (result.error) {
        res.writeHead(403);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": result.data.type || "application/octet-stream",
      });
      res.end(Buffer.from(result.data.content, "base64"));
      return;
    }
    const response = await handler(
      new Request("http://127.0.0.1" + req.url, { method: req.method }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<!doctype html><p>Fixture server error</p>");
  }
});
server.listen(Number(process.env.E2E_PORT || 4173), "127.0.0.1", () =>
  console.log(
    "Isolated browser fixture server ready. No employer or provider operations.",
  ),
);

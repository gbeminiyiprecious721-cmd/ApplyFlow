import assert from "node:assert/strict";
import vm from "node:vm";
import {
  createLocalReadOnlyFetch,
  injectLocalSupabaseConfig,
  localSupabaseConfig,
  proxyLocalAdzunaSearch,
  proxyLocalAgentStatus,
  renderLocalSetupPage,
  verifyLocalSupabaseConfig,
} from "../scripts/local-supabase-config.mjs";

const projectUrl = "https://tbggqauyesloekynqavb.supabase.co";
const publishableKey = "sb_publishable_test-only-not-a-real-key";
const sourceHtml = `const SB_URL = '${projectUrl}';\nconst SB_ANON = 'APPLYFLOW_LOCAL_KEY_NOT_INCLUDED';`;
const setupPage = renderLocalSetupPage();
assert.match(setupPage, /type="password"/);
assert.match(setupPage, /__local\/config/);
assert.match(setupPage, /input\.value=''/);
assert(!setupPage.includes(publishableKey));
const injected = injectLocalSupabaseConfig(sourceHtml, {
  url: projectUrl,
  key: publishableKey,
});
assert(injected.includes(JSON.stringify(publishableKey)));
assert(!injected.includes("APPLYFLOW_LOCAL_KEY_NOT_INCLUDED"));
const bootstrap = injected.slice(
  injected.indexOf("window.__APPLYFLOW_LOCAL_READ_ONLY__ = true;"),
  injected.indexOf("const SB_URL"),
);
let forwarded = 0;
const forwardedRequests = [];
const localWindow = {
  location: { origin: "http://127.0.0.1:4173" },
  fetch: async (input) => {
    forwarded++;
    forwardedRequests.push(input);
    return new Response("ok");
  },
};
vm.runInNewContext(bootstrap, {
  window: localWindow,
  URL,
  Request,
  Response,
  Headers,
  Promise,
  JSON,
});
await localWindow.fetch(`${projectUrl}/auth/v1/token`, { method: "POST" });
await localWindow.fetch(`${projectUrl}/rest/v1/profiles`, { method: "GET" });
await localWindow.fetch(
  `${projectUrl}/functions/v1/applyflow-application-agent`,
  {
    method: "POST",
    headers: { Authorization: "Bearer user-session", apikey: publishableKey },
    body: JSON.stringify({ action: "STATUS" }),
  },
);
await localWindow.fetch(
  `${projectUrl}/functions/v1/applyflow-adzuna-search`,
  {
    method: "POST",
    headers: { Authorization: "Bearer user-session", apikey: publishableKey },
    body: JSON.stringify({ what: "data analyst", where: "United Kingdom" }),
  },
);
const remoteWrite = await localWindow.fetch(`${projectUrl}/rest/v1/profiles`, { method: "POST" });
const externalWrite = await localWindow.fetch("https://provider.example/run", { method: "POST" });
assert.equal(forwarded, 4);
assert.equal(new URL(forwardedRequests[2].url).pathname, "/__local/agent-status");
assert.equal(forwardedRequests[2].headers.get("authorization"), "Bearer user-session");
assert.deepEqual(await forwardedRequests[2].clone().json(), { action: "STATUS" });
assert.equal(new URL(forwardedRequests[3].url).pathname, "/__local/adzuna-search");
assert.equal(forwardedRequests[3].headers.get("authorization"), "Bearer user-session");
assert.deepEqual(await forwardedRequests[3].clone().json(), { what: "data analyst", where: "United Kingdom" });
assert.equal(remoteWrite.status, 403);
assert.equal(externalWrite.status, 403);
assert.throws(
  () =>
    injectLocalSupabaseConfig(sourceHtml, {
      url: "https://other.supabase.co",
      key: publishableKey,
    }),
  /existing ApplyFlow Supabase project/,
);
assert.throws(
  () =>
    injectLocalSupabaseConfig(sourceHtml, {
      url: projectUrl,
      key: "sb_secret_not-for-browser",
    }),
  /public publishable key or anon JWT/,
);
assert.throws(
  () => localSupabaseConfig({ APPLYFLOW_LOCAL_SUPABASE_URL: projectUrl }),
  /public key is required/i,
);
let requestedKey;
await verifyLocalSupabaseConfig(
  { url: projectUrl, key: publishableKey },
  async (url, options) => {
    assert.equal(url, `${projectUrl}/auth/v1/settings`);
    requestedKey = options.headers.apikey;
    return new Response("{}", { status: 200 });
  },
);
assert.equal(requestedKey, publishableKey);
await assert.rejects(
  verifyLocalSupabaseConfig(
    { url: projectUrl, key: publishableKey },
    async () => new Response("", { status: 401 }),
  ),
  /rejected the local public key \(HTTP 401\)/,
);
forwarded = 0;
const readOnlyFetch = createLocalReadOnlyFetch(async () => {
  forwarded++;
  return new Response("ok");
});
await readOnlyFetch(`${projectUrl}/auth/v1/token`, { method: "POST" });
await readOnlyFetch(`${projectUrl}/rest/v1/profiles`, { method: "GET" });
await readOnlyFetch(
  new Request(`${projectUrl}/functions/v1/applyflow-application-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "STATUS" }),
  }),
);
const blocked = await readOnlyFetch(`${projectUrl}/rest/v1/profiles`, {
  method: "POST",
});
const blockedAgentAction = await readOnlyFetch(
  new Request(`${projectUrl}/functions/v1/applyflow-application-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "PROCESS" }),
  }),
);
const blockedEmployerRead = await readOnlyFetch("https://jobs.example/test-role");
assert.equal(forwarded, 3);
assert.equal(blocked.status, 403);
assert.equal(blockedAgentAction.status, 403);
assert.equal(blockedEmployerRead.status, 403);
let proxyCalls = 0;
const statusResponse = await proxyLocalAgentStatus(
  new Request("http://127.0.0.1/__local/agent-status", {
    method: "POST",
    headers: {
      Authorization: "Bearer user-session",
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "STATUS" }),
  }),
  async (url, options) => {
    proxyCalls++;
    assert.equal(url, `${projectUrl}/functions/v1/applyflow-application-agent`);
    assert.equal(options.headers.Authorization, "Bearer user-session");
    assert.equal(
      options.headers.Origin,
      "https://applyflow-review.gbeminiyiprecious721.chatgpt.site",
    );
    assert.equal(options.headers.apikey, publishableKey);
    assert.deepEqual(JSON.parse(options.body), { action: "STATUS" });
    return new Response('{"settings":{}}', { status: 200 });
  },
);
assert.equal(statusResponse.status, 200);
assert.deepEqual(await statusResponse.json(), { settings: {} });
const deniedAction = await proxyLocalAgentStatus(
  new Request("http://127.0.0.1/__local/agent-status", {
    method: "POST",
    headers: {
      Authorization: "Bearer user-session",
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "PROCESS" }),
  }),
  async () => {
    proxyCalls++;
    return new Response("unexpected");
  },
);
assert.equal(deniedAction.status, 403);
assert.equal(proxyCalls, 1);

let adzunaProxyCalls = 0;
const searchResponse = await proxyLocalAdzunaSearch(
  new Request("http://127.0.0.1/__local/adzuna-search", {
    method: "POST",
    headers: {
      Authorization: "Bearer user-session",
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ what: "data analyst", where: "United Kingdom" }),
  }),
  async (url, options) => {
    adzunaProxyCalls++;
    assert.equal(url, `${projectUrl}/functions/v1/applyflow-adzuna-search`);
    assert.equal(options.headers.Authorization, "Bearer user-session");
    assert.equal(
      options.headers.Origin,
      "https://applyflow-review.gbeminiyiprecious721.chatgpt.site",
    );
    assert.equal(options.headers.apikey, publishableKey);
    assert.deepEqual(JSON.parse(options.body), { what: "data analyst", where: "United Kingdom" });
    return new Response('{"results":[]}', { status: 200 });
  },
);
assert.equal(searchResponse.status, 200);
assert.deepEqual(await searchResponse.json(), { results: [] });
assert.equal(adzunaProxyCalls, 1);
const noAuth = await proxyLocalAdzunaSearch(
  new Request("http://127.0.0.1/__local/adzuna-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ what: "data analyst" }),
  }),
  async () => {
    adzunaProxyCalls++;
    return new Response("unexpected");
  },
);
assert.equal(noAuth.status, 401);
assert.equal(adzunaProxyCalls, 1, "No upstream call without an authorization header");

console.log("Local Supabase config: project boundary, public-key formats, read-only validation and Adzuna search proxy passed.");

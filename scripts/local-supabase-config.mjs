export const LOCAL_SUPABASE_URL =
  "https://tbggqauyesloekynqavb.supabase.co";
const LOCAL_PROJECT_REF = "tbggqauyesloekynqavb";

export function renderLocalSetupPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connect local ApplyFlow</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f6f4;color:#17231e;font:16px/1.5 Segoe UI,sans-serif}
    main{width:min(440px,calc(100% - 40px));padding:28px 0}
    h1{font-size:25px;margin:0 0 8px} p{color:#53615a;margin:0 0 24px}
    label{display:block;font-weight:600;margin-bottom:8px}
    input,button{box-sizing:border-box;width:100%;min-height:46px;font:inherit}
    input{padding:10px 12px;border:1px solid #98a69e;border-radius:4px;background:#fff;color:#17231e}
    button{margin-top:14px;border:0;border-radius:4px;background:#176b50;color:white;font-weight:600;cursor:pointer}
    button:disabled{opacity:.65;cursor:wait} #status{min-height:24px;margin-top:14px;color:#34473d}
  </style>
</head>
<body>
  <main>
    <h1>Connect local ApplyFlow</h1>
    <p>Enter the existing project's public client key to continue. This local preview is read-only.</p>
    <form id="config-form">
      <label for="public-key">Supabase publishable or anon key</label>
      <input id="public-key" type="password" autocomplete="off" spellcheck="false" required>
      <button id="connect" type="submit">Verify and open ApplyFlow</button>
      <div id="status" role="status" aria-live="polite"></div>
    </form>
  </main>
  <script>
    const form=document.querySelector('#config-form');
    const input=document.querySelector('#public-key');
    const button=document.querySelector('#connect');
    const status=document.querySelector('#status');
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const key=input.value.trim();
      input.value='';
      button.disabled=true;
      status.textContent='Verifying project key…';
      try{
        const response=await fetch('/__local/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
        if(!response.ok)throw new Error(response.status===401?'Supabase rejected this public key. Check that it belongs to the existing ApplyFlow project.':'Could not verify this key (HTTP '+response.status+').');
        location.reload();
      }catch(error){
        status.textContent=error.message||'Could not connect to Supabase. Check your network and try again.';
        button.disabled=false;
        input.focus();
      }
    });
  </script>
</body>
</html>`;
}

function makeReadOnlyFetch(upstreamFetch, localOrigin, supabaseOrigin) {
  return async (input, init = {}) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(requestUrl, localOrigin);
    const method = String(
      init.method || (input instanceof Request ? input.method : "GET"),
    ).toUpperCase();
    if (url.origin === localOrigin) {
      return upstreamFetch(input, init);
    }
    if (url.origin === supabaseOrigin) {
      if (
        url.pathname.startsWith("/auth/v1/") ||
        ["GET", "HEAD", "OPTIONS"].includes(method)
      ) {
        return upstreamFetch(input, init);
      }
      if (
        method === "POST" &&
        url.pathname.endsWith("/functions/v1/applyflow-application-agent")
      ) {
        let body;
        try {
          body =
            input instanceof Request
              ? await input.clone().json()
              : JSON.parse(init.body || "{}");
        } catch {}
        if (body?.action === "STATUS") {
          const request =
            input instanceof Request ? input : new Request(input, init);
          return upstreamFetch(
            new Request(`${localOrigin}/__local/agent-status`, {
              method: "POST",
              headers: new Headers(request.headers),
              body: await request.clone().arrayBuffer(),
              credentials: "omit",
            }),
          );
        }
      }
      if (
        method === "POST" &&
        url.pathname.endsWith("/functions/v1/applyflow-adzuna-search")
      ) {
        const request =
          input instanceof Request ? input : new Request(input, init);
        return upstreamFetch(
          new Request(`${localOrigin}/__local/adzuna-search`, {
            method: "POST",
            headers: new Headers(request.headers),
            body: await request.clone().arrayBuffer(),
            credentials: "omit",
          }),
        );
      }
      if (
        method === "POST" &&
        url.pathname.endsWith("/functions/v1/applyflow-capability-gateway")
      ) {
        // Every existing use (AI chat, job-URL scraping, Greenhouse/Lever
        // search via serper) is a read against an external service, never a
        // write to this app's own data, so it's safe to proxy unconditionally
        // the same way Adzuna search is.
        const request =
          input instanceof Request ? input : new Request(input, init);
        return upstreamFetch(
          new Request(`${localOrigin}/__local/capability-gateway`, {
            method: "POST",
            headers: new Headers(request.headers),
            body: await request.clone().arrayBuffer(),
            credentials: "omit",
          }),
        );
      }
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({ message: "Local ApplyFlow preview is read-only." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );
  };
}

function validateConfig(config) {
  const url = new URL(config.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== `${LOCAL_PROJECT_REF}.supabase.co` ||
    url.pathname !== "/"
  ) {
    throw new Error("Local config must use the existing ApplyFlow Supabase project.");
  }

  const key = config.key.trim();
  if (key.startsWith("sb_publishable_") && key.length > 24) {
    return { url: url.origin, key };
  }
  if (!key.startsWith("eyJ") || key.split(".").length !== 3) {
    throw new Error("Use a Supabase public publishable key or anon JWT.");
  }

  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString("utf8"),
    );
    if (payload.role !== "anon" || payload.ref !== LOCAL_PROJECT_REF) {
      throw new Error();
    }
  } catch {
    throw new Error("Anon JWT must belong to the existing ApplyFlow project.");
  }
  return { url: url.origin, key };
}

export function localSupabaseConfig(env = process.env) {
  const url = env.APPLYFLOW_LOCAL_SUPABASE_URL || LOCAL_SUPABASE_URL;
  const key = env.APPLYFLOW_LOCAL_SUPABASE_KEY || "";
  if (!key) throw new Error("A local Supabase public key is required.");
  return validateConfig({ url, key });
}

export function injectLocalSupabaseConfig(html, config) {
  const { url, key } = validateConfig(config);
  const assignment = /const SB_URL = '[^']+';\s*const SB_ANON = '[^']+';/;
  if (!assignment.test(html) || !html.includes("APPLYFLOW_LOCAL_KEY_NOT_INCLUDED")) {
    throw new Error("The expected local Supabase placeholder was not found.");
  }
  const bootstrap = `window.__APPLYFLOW_LOCAL_READ_ONLY__ = true;\n    window.fetch = (${makeReadOnlyFetch.toString()})(window.fetch.bind(window), window.location.origin, ${JSON.stringify(url)});`;
  return html.replace(
    assignment,
    `${bootstrap}\n    const SB_URL = ${JSON.stringify(url)};\n    const SB_ANON = ${JSON.stringify(key)};`,
  );
}

export async function verifyLocalSupabaseConfig(config, fetchImpl = fetch) {
  const validated = validateConfig(config);
  const response = await fetchImpl(`${validated.url}/auth/v1/settings`, {
    headers: { apikey: validated.key },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error(
      `Supabase rejected the local public key (HTTP ${response.status}).`,
    );
  }
  return true;
}

export async function proxyLocalAgentStatus(request, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  const authorization = request.headers.get("authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  if (!/^Bearer\s+\S+/i.test(authorization) || !apiKey) {
    return new Response(null, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (body?.action !== "STATUS") {
    return new Response(null, { status: 403 });
  }

  try {
    const response = await fetchImpl(
      `${LOCAL_SUPABASE_URL}/functions/v1/applyflow-application-agent`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          apikey: apiKey,
          Origin: "https://applyflow-review.gbeminiyiprecious721.chatgpt.site",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "STATUS" }),
        signal: AbortSignal.timeout(10000),
      },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ message: "Agent status is unavailable from this network." }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function proxyLocalAdzunaSearch(request, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  const authorization = request.headers.get("authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  if (!/^Bearer\s+\S+/i.test(authorization) || !apiKey) {
    return new Response(null, { status: 401 });
  }
  let body;
  try {
    body = await request.text();
    JSON.parse(body || "{}");
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    const response = await fetchImpl(
      `${LOCAL_SUPABASE_URL}/functions/v1/applyflow-adzuna-search`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          apikey: apiKey,
          Origin: "https://applyflow-review.gbeminiyiprecious721.chatgpt.site",
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(15000),
      },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ message: "Adzuna search is unavailable from this network." }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function proxyLocalCapabilityGateway(request, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  const authorization = request.headers.get("authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  if (!/^Bearer\s+\S+/i.test(authorization) || !apiKey) {
    return new Response(null, { status: 401 });
  }
  let body;
  try {
    body = await request.text();
    JSON.parse(body || "{}");
  } catch {
    return new Response(null, { status: 400 });
  }

  try {
    const response = await fetchImpl(
      `${LOCAL_SUPABASE_URL}/functions/v1/applyflow-capability-gateway`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          apikey: apiKey,
          Origin: "https://applyflow-review.gbeminiyiprecious721.chatgpt.site",
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(30000),
      },
    );
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ message: "Capability gateway is unavailable from this network." }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export function createLocalReadOnlyFetch(
  fetchImpl = fetch,
  localOrigin = "http://127.0.0.1:4173",
  supabaseOrigin = LOCAL_SUPABASE_URL,
) {
  return makeReadOnlyFetch(fetchImpl, localOrigin, supabaseOrigin);
}
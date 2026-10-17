/* Browser-only test adapter. It talks to the isolated local fixture server,
   never Supabase or employers. This is NOT a test of production RLS. */
(() => {
  const key = "applyflow-e2e-session";
  let session = JSON.parse(localStorage.getItem(key) || "null");
  const listeners = [];
  async function call(op, data = {}) {
    const r = await fetch("/__e2e/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, owner: session?.user.id, ...data }),
    });
    return r.json();
  }
  function notify(event) {
    for (const cb of listeners) cb(event, session);
  }
  async function login(op, credentials) {
    const r = await call(op, credentials);
    if (!r.error) {
      session = r.data.session;
      localStorage.setItem(key, JSON.stringify(session));
      setTimeout(() => notify("SIGNED_IN"), 0);
    }
    return r;
  }
  class Query {
    constructor(table) {
      this.q = { table, method: "select", filters: [] };
    }
    select(columns = "*") {
      this.q.columns = columns;
      return this;
    }
    insert(rows) {
      this.q.method = "insert";
      this.q.rows = rows;
      return this;
    }
    upsert(rows, opts = {}) {
      this.q.method = "upsert";
      this.q.rows = rows;
      this.q.conflict = opts.onConflict;
      return this;
    }
    update(rows) {
      this.q.method = "update";
      this.q.rows = rows;
      return this;
    }
    delete() {
      this.q.method = "delete";
      return this;
    }
    eq(k, v) {
      this.q.filters.push(["eq", k, v]);
      return this;
    }
    neq(k, v) {
      this.q.filters.push(["neq", k, v]);
      return this;
    }
    in(k, v) {
      this.q.filters.push(["in", k, v]);
      return this;
    }
    is(k, v) {
      this.q.filters.push(["is", k, v]);
      return this;
    }
    order(k, opts) {
      this.q.order = [k, opts?.ascending !== false];
      return this;
    }
    limit(n) {
      this.q.limit = n;
      return this;
    }
    maybeSingle() {
      this.q.single = true;
      return this;
    }
    single() {
      this.q.single = true;
      return this;
    }
    then(resolve, reject) {
      return call("query", this.q).then(resolve, reject);
    }
  }
  const storage = (bucket) => ({
    upload: async (path, file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return call("upload", {
        bucket,
        path,
        content: btoa(binary),
        type: file.type,
      });
    },
    download: async (path) => {
      const r = await call("download", { bucket, path });
      if (r.error) return r;
      return {
        data: new Blob(
          [Uint8Array.from(atob(r.data.content), (c) => c.charCodeAt(0))],
          { type: r.data.type },
        ),
        error: null,
      };
    },
    createSignedUrl: async (path) => {
      const r = await call("download", { bucket, path });
      return r.error
        ? r
        : {
            data: {
              signedUrl:
                location.origin +
                "/__e2e/file?bucket=" +
                encodeURIComponent(bucket) +
                "&path=" +
                encodeURIComponent(path) +
                "&owner=" +
                session.user.id,
            },
            error: null,
          };
    },
    list: (prefix = "", opts = {}) => call("list", { bucket, prefix, ...opts }),
    remove: (paths) => call("remove", { bucket, paths }),
  });
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session } }),
        getUser: async () => ({ data: { user: session?.user || null } }),
        signUp: (credentials) => login("signup", credentials),
        signInWithPassword: (credentials) => login("signin", credentials),
        signOut: async () => {
          session = null;
          localStorage.removeItem(key);
          notify("SIGNED_OUT");
          return { error: null };
        },
        onAuthStateChange: (cb) => {
          listeners.push(cb);
          return { data: { subscription: { unsubscribe() {} } } };
        },
      },
      from: (table) => new Query(table),
      rpc: (name, args) => call("rpc", { name, args }),
      storage: { from: storage },
      functions: {
        invoke: async (name, { body } = {}) => {
          if (name === "applyflow-application-agent") {
            if (body?.action === "STATUS")
              return {
                data: {
                  settings: {
                    mode: "review",
                    enabled: false,
                    daily_limit: 5,
                    minimum_match: 85,
                    countries: [],
                    excluded_companies: [],
                  },
                  runs: [],
                  provider_configured: false,
                  provider_health: {
                    runnable: false,
                    message:
                      "Automatic filling is temporarily unavailable, your packet is ready for assisted apply",
                  },
                },
                error: null,
              };
            if (body?.action === "DELETE_DATA")
              return { data: { ok: true }, error: null };
          }
          if (name === "applyflow-capability-gateway" && body?.provider === "status") {
            return { data: { sources: window.__E2E_SOURCE_READINESS__ || { adzuna: false, greenhouse: false, lever: false }, mailbox: { implemented: false, connected: false } }, error: null };
          }
          if (name === "applyflow-adzuna-search") {
            if (window.__E2E_ADZUNA_RESULTS__) return { data: { results: window.__E2E_ADZUNA_RESULTS__ }, error: null };
            // Mirrors the real applyflow-adzuna-search function's response when
            // ADZUNA_APP_ID/ADZUNA_APP_KEY are not configured (HTTP 501). No
            // real network call is made, and no credentials are involved.
            return {
              data: null,
              error: {
                message: "Adzuna is not configured.",
                context: {
                  json: async () => ({ error: "Adzuna is not configured." }),
                },
              },
            };
          }
          return {
            data: null,
            error: {
              message: "External operations disabled in local browser tests",
            },
          };
        },
      },
    }),
  };
})();

const { test, expect } = require("@playwright/test");
const {
  local,
  cv,
  name,
  protect,
  signup,
  onboard,
  importFixture,
} = require("./helpers.cjs");
// These checks intentionally NEVER treat the local adapter as evidence of RLS.
test.skip(
  local,
  "Requires a separate staging app and Supabase project; local fixture policy is not real RLS.",
);
test("staging: account B cannot read account A rows or private storage files", async ({
  browser,
  baseURL,
}, testInfo) => {
  test.skip(
    local,
    "Requires a separate staging app and Supabase project; local fixture policy is not real RLS.",
  );
  const a = await browser.newContext(),
    b = await browser.newContext();
  await protect(a, baseURL);
  await protect(b, baseURL);
  const pa = await a.newPage(),
    pb = await b.newPage();
  try {
    await signup(pa);
    await onboard(pa);
    await importFixture(pa);
    // Persist a fixed reviewed packet through the real app's save path. No AI calls,
    // cloud runs, or employer submission are involved.
    await pa.evaluate(async (text) => {
      const j = state.jobs[0];
      j.stage = "Needs Review";
      state.packages.push({
        job_id: String(j.job_id || j.id),
        state: "NEEDS_REVIEW",
        tailored: text,
        cover: "Synthetic test cover letter",
        claim_audit: [
          { claim: "Synthetic CV fixture", status: "SUPPORTED", ok: true },
        ],
        answers: [],
      });
      await persistRemote();
      if (workspaceSync.phase === "error")
        throw Error("Could not seed private packet");
    }, cv);
    await pa.evaluate(async () => {
      const settings = await supabaseClient.functions.invoke(
        "applyflow-application-agent",
        {
          body: {
            action: "SETTINGS",
            mode: "review",
            enabled: false,
            daily_limit: 5,
            minimum_match: 85,
            countries: [],
            excluded_companies: [],
            consent: false,
          },
        },
      );
      if (settings.error || settings.data?.error)
        throw Error("Could not seed paused cloud settings");
      const upload = await supabaseClient.storage
        .from("submission-evidence")
        .upload(
          uid() + "/e2e/isolation-fixture.pdf",
          await ApplyFlowPdf.fromText("Account A storage isolation fixture"),
        );
      if (upload.error) throw Error(upload.error.message);
    });
    const owned = await pa.evaluate(async () => {
      const owner = uid(),
        rows = {};
      for (const table of [
        "profiles",
        "user_preferences",
        "candidate_facts",
        "answer_bank",
        "resumes",
        "saved_jobs",
        "applications",
        "application_documents",
        "agent_settings",
        "career_workspaces",
        "application_agent_settings",
      ]) {
        const identity = [
          "career_workspaces",
          "application_agent_settings",
        ].includes(table)
          ? "user_id"
          : "id";
        const r = await supabaseClient
          .from(table)
          .select(identity === "user_id" ? "user_id" : "id,user_id")
          .eq("user_id", owner);
        if (r.error) throw Error(table + ": " + r.error.message);
        if (!r.data.length)
          throw Error("Positive ownership control has no " + table + " rows");
        rows[table] = { identity, ids: r.data.map((x) => x[identity]) };
      }
      const docs = await supabaseClient
        .from("application_documents")
        .select("storage_bucket,storage_path")
        .eq("user_id", owner);
      if (docs.error) throw Error(docs.error.message);
      const files = [
        { bucket: "resumes", path: state.resumeMeta.storagePath },
        {
          bucket: "submission-evidence",
          path: owner + "/e2e/isolation-fixture.pdf",
        },
        ...docs.data.map((d) => ({
          bucket: d.storage_bucket,
          path: d.storage_path,
        })),
      ];
      for (const f of files) {
        const r = await supabaseClient.storage.from(f.bucket).download(f.path);
        if (r.error || !r.data?.size)
          throw Error("Owner cannot download seeded file");
        const listed = await supabaseClient.storage
          .from(f.bucket)
          .list(f.path.slice(0, f.path.lastIndexOf("/")));
        if (
          listed.error ||
          !listed.data.some((x) => x.name === f.path.split("/").at(-1))
        )
          throw Error("Owner cannot list seeded file");
      }
      return { owner, rows, files };
    });
    await signup(pb);
    await expect
      .poll(() =>
        pb.evaluate(async () => {
          const r = await supabaseClient
            .from("profiles")
            .select("user_id")
            .eq("user_id", uid());
          if (r.error) throw Error(r.error.message);
          return r.data.length;
        }),
      )
      .toBe(1);
    // B's own storage must work; a broken storage service cannot pass denial tests.
    await pb.evaluate(
      async (buckets) => {
        for (const bucket of new Set(buckets)) {
          const path = uid() + "/e2e/control.pdf";
          const r = await supabaseClient.storage
            .from(bucket)
            .upload(
              path,
              await ApplyFlowPdf.fromText("Account B storage control"),
            );
          if (r.error) throw Error(r.error.message);
          const read = await supabaseClient.storage.from(bucket).download(path);
          if (
            read.error ||
            new TextDecoder().decode(
              (await read.data.arrayBuffer()).slice(0, 5),
            ) !== "%PDF-"
          )
            throw Error("B own storage failed");
        }
      },
      owned.files.map((f) => f.bucket),
    );
    const denied = await pb.evaluate(async (owned) => {
      const result = { rows: [], files: [] };
      for (const [table, { identity, ids }] of Object.entries(owned.rows)) {
        for (const filter of ["owner", "id"]) {
          const q = supabaseClient
            .from(table)
            .select(identity === "user_id" ? "user_id" : "id,user_id");
          const r = await (filter === "owner"
            ? q.eq("user_id", owned.owner)
            : q.in(identity, ids));
          if (r.error)
            throw Error(table + ": unexpected query error " + r.error.message);
          result.rows.push({ table, filter, count: r.data.length });
        }
      }
      for (const f of owned.files) {
        const bucket = supabaseClient.storage.from(f.bucket);
        const publicResponse = await fetch(
          bucket.getPublicUrl(f.path).data.publicUrl,
          { credentials: "omit" },
        );
        const download = await bucket.download(f.path),
          signed = await bucket.createSignedUrl(f.path, 60),
          listing = await bucket.list(f.path.slice(0, f.path.lastIndexOf("/")));
        result.files.push({
          bucket: f.bucket,
          publicDenied: [400, 403, 404].includes(publicResponse.status),
          downloadDenied: !!download.error && !download.data,
          signedDenied: !!signed.error && !signed.data?.signedUrl,
          listCount: listing.error ? null : listing.data.length,
        });
      }
      return result;
    }, owned);
    for (const row of denied.rows)
      expect(row.count, row.table + " " + row.filter).toBe(0);
    for (const file of denied.files) {
      expect(file.publicDenied, file.bucket + " public URL").toBeTruthy();
      expect(file.downloadDenied, file.bucket + " download").toBeTruthy();
      expect(file.signedDenied, file.bucket + " signed URL").toBeTruthy();
      expect(file.listCount, file.bucket + " listing").toBe(0);
    }
    expect(
      await pb.evaluate(() =>
        JSON.stringify({
          profile: state.profile,
          resumes: state.resumes,
          jobs: state.jobs,
          packages: state.packages,
        }),
      ),
    ).not.toContain(name);
    testInfo.annotations.push({
      type: "integration",
      description:
        "Real staging Supabase policies, seeded positive owner controls and cross-account row/file denial.",
    });
  } finally {
    for (const p of [pa, pb]) {
      try {
        await p.evaluate(async () => {
          if (state.signedIn) {
            for (const bucket of [
              "resumes",
              "generated-docs",
              "submission-evidence",
            ])
              await supabaseClient.storage
                .from(bucket)
                .remove([
                  uid() + "/e2e/control.pdf",
                  uid() + "/e2e/isolation-fixture.pdf",
                ]);
            await dbApi("delete-account-data", {});
          }
        });
      } catch {
        testInfo.annotations.push({
          type: "cleanup-warning",
          description:
            "Test data cleanup did not complete; review staging test accounts.",
        });
      }
    }
    await a.close();
    await b.close();
  }
});

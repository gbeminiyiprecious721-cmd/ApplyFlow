const assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process"),
  path = require("node:path");
function check(env) {
  const clean = { ...process.env };
  for (const key of Object.keys(clean))
    if (key.startsWith("E2E_")) delete clean[key];
  return spawnSync(
    process.execPath,
    ["-e", 'require("./playwright.config.cjs")'],
    {
      cwd: path.join(__dirname, ".."),
      env: { ...clean, ...env },
      encoding: "utf8",
    },
  );
}
for (const [env, message] of [
  [{ E2E_TARGET: "typo" }, /local or staging/],
  [{ E2E_BASE_URL: "https://jobs.employer.example" }, /loopback/],
  [
    { E2E_TARGET: "staging", E2E_BASE_URL: "https://staging.example" },
    /E2E_SANDBOX/,
  ],
  [
    {
      E2E_TARGET: "staging",
      E2E_SANDBOX: "1",
      E2E_BASE_URL:
        "https://applyflow-review.gbeminiyiprecious721.chatgpt.site",
    },
    /non-production/,
  ],
  [
    {
      E2E_TARGET: "staging",
      E2E_SANDBOX: "1",
      E2E_BASE_URL: "https://staging.example",
      E2E_SUPABASE_ORIGIN: "https://tbggqauyesloekynqavb.supabase.co",
    },
    /production is blocked/,
  ],
  [{ E2E_FIXTURE_URL: "https://employer.example" }, /loopback/],
]) {
  const r = check(env);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, message);
}
assert.equal(check({ E2E_BASE_URL: "http://127.0.0.1:4300" }).status, 0);
assert.equal(
  check({
    E2E_TARGET: "staging",
    E2E_SANDBOX: "1",
    E2E_BASE_URL: "https://staging.example",
    E2E_SUPABASE_ORIGIN: "https://test-project.supabase.co",
  }).status,
  0,
);
console.log(
  "E2E configuration: production/employer targets rejected; local and separate staging accepted.",
);

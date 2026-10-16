const fs = require("node:fs");
const { expect } = require("@playwright/test");
const { randomUUID } = require("node:crypto");
const local = process.env.E2E_TARGET !== "staging";
const cv = fs.readFileSync(
  require("node:path").join(__dirname, "fixtures/sample-cv.txt"),
  "utf8",
);
const name = "Ọláwálé Adébáyọ̀ García";
async function protect(context, baseURL) {
  const appOrigin = new URL(baseURL).origin;
  const fixtureOrigin = new URL(
    process.env.E2E_FIXTURE_URL || (local ? baseURL : "http://127.0.0.1:4173"),
  ).origin;
  const sbOrigin = process.env.E2E_SUPABASE_ORIGIN
    ? new URL(process.env.E2E_SUPABASE_ORIGIN).origin
    : undefined;
  if (
    !local &&
    (!sbOrigin ||
      new URL(sbOrigin).hostname === "tbggqauyesloekynqavb.supabase.co")
  )
    throw Error(
      "Set E2E_SUPABASE_ORIGIN to a separate staging Supabase project. Production is blocked.",
    );
  await context.route("**/*", async (route) => {
    const req = route.request(),
      u = new URL(req.url());
    if (
      local &&
      u.hostname === "cdn.jsdelivr.net" &&
      u.pathname.includes("@supabase/supabase-js")
    )
      return route.fulfill({
        contentType: "text/javascript; charset=utf-8",
        body: fs.readFileSync(
          require("node:path").join(__dirname, "local-client.js"),
          "utf8",
        ),
      });
    if (u.origin === appOrigin || u.origin === fixtureOrigin)
      return route.continue();
    if (!local && u.origin === sbOrigin) {
      if (u.pathname.startsWith("/functions/")) {
        let action, body;
        try {
          body = req.postDataJSON();
          action = body?.action;
        } catch {}
        if (
          !["STATUS", "DELETE_DATA"].includes(action) &&
          !(
            action === "SETTINGS" &&
            body.enabled === false &&
            body.mode === "review"
          )
        )
          return route.abort("blockedbyclient");
      }
      return route.continue();
    }
    if (
      !local &&
      u.hostname === "cdn.jsdelivr.net" &&
      req.method() === "GET" &&
      req.resourceType() === "script"
    )
      return route.continue();
    // Includes employers, AI providers, Browserbase and job source APIs.
    return route.abort("blockedbyclient");
  });
}
async function signup(page) {
  await page.goto("/");
  await expect(page.locator("#welcomeRegister")).toBeVisible();
  if (!local)
    expect(await page.evaluate(() => new URL(SB_URL).origin)).toBe(
      new URL(process.env.E2E_SUPABASE_ORIGIN).origin,
    );
  const email =
    "applyflow-e2e-" +
    randomUUID() +
    "@" +
    (process.env.E2E_EMAIL_DOMAIN || "example.com");
  await page.locator("#welcomeEmail").fill(email);
  await page.locator("#welcomePass").fill("Synthetic-" + randomUUID());
  await page.locator("#welcomeRegister").click();
  await expect(page.locator("#welcomeAuth")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(page.locator("#obNext")).toBeVisible({ timeout: 20000 });
  return email;
}
async function onboard(page) {
  await page.locator("#obNext").click();
  await page.locator("#obResume").setInputFiles({
    name: "sample-cv.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(cv),
  });
  await expect(page.locator("#obResumeStatus")).toContainText("CV analysed", {
    timeout: 15000,
  });
  await page.locator("#obNext").click();
  await expect(page.locator("#p_name")).toHaveValue(name);
  await expect(page.locator("#p_summary")).toHaveValue(/Ẹ káàárọ̀, iṣẹ́ àpẹẹrẹ/);
  await page.locator("#p_confirm").check();
  await page.locator("#obNext").click();
  await page.locator("#c_titles").fill("Data Analyst");
  await page.locator("#c_locs").fill("Lagos, Nigeria");
  await page.locator("#obNext").click();
  await page.locator("#obNext").click();
  await page.locator("#obNext").click();
  await expect(page.locator("#onboard")).toBeHidden();
  await expect(page.locator("#workspaceSync")).toHaveAttribute(
    "data-phase",
    "saved",
    { timeout: 20000 },
  );
}
async function importFixture(page) {
  const url =
    (process.env.E2E_FIXTURE_URL ||
      (local ? new URL(page.url()).origin : "http://127.0.0.1:4173")) +
    "/__e2e/job.html";
  await page.locator("nav[aria-label=Primary] [data-view=search]").click();
  await page.getByText("Import a job URL", { exact: true }).click();
  await page.locator("#jobUrl").fill(url);
  await page.locator("#importUrl").click();
  await expect(page.locator("#workspaceSync")).toHaveAttribute(
    "data-phase",
    "saved",
    { timeout: 20000 },
  );
  return url;
}
async function profile(page, owner) {
  return page.evaluate(async (owner) => {
    const r = await supabaseClient
      .from("profiles")
      .select("full_name,onboarding_completed_at")
      .eq("user_id", owner);
    if (r.error) throw Error(r.error.message);
    return r.data;
  }, owner);
}
module.exports = {
  local,
  cv,
  name,
  protect,
  signup,
  onboard,
  importFixture,
  profile,
};

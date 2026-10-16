const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  local,
  cv,
  name,
  protect,
  signup,
  onboard,
  importFixture,
  profile,
} = require("./helpers.cjs");

function channels(value) {
  return value.match(/[\d.]+/g).map(Number);
}

function luminance(rgb) {
  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

test.beforeEach(async ({ context, baseURL }) => protect(context, baseURL));
test("every shipped HTML response declares UTF-8", async ({
  request,
  baseURL,
}) => {
  function walk(dir) {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() && !["server", ".openai"].includes(e.name)
          ? walk(path.join(dir, e.name))
          : e.isFile() && e.name.endsWith(".html")
            ? [
                path.relative(
                  path.join(__dirname, "../../dist"),
                  path.join(dir, e.name),
                ),
              ]
            : [],
      );
  }
  for (const url of ["/", ...walk(path.join(__dirname, "../../dist"))]) {
    const r = await request.get(new URL(url, baseURL).href);
    expect(r.ok(), url).toBeTruthy();
    expect(r.headers()["content-type"], url).toMatch(
      /^text\/html\s*;\s*charset=utf-8/i,
    );
  }
});
test("signup, Unicode CV onboarding, database round trip and reload persistence", async ({
  page,
}) => {
  await signup(page);
  await onboard(page);
  const id = await page.evaluate(() => uid());
  const rows = await profile(page, id);
  expect(rows).toHaveLength(1);
  expect(rows[0].full_name).toBe(name);
  const resume = await page.evaluate(async () => {
    const r = await supabaseClient
      .from("resumes")
      .select("parsed_text")
      .eq("user_id", uid());
    if (r.error) throw Error(r.error.message);
    return r.data;
  });
  expect(
    resume.some((r) => r.parsed_text?.includes("Ẹ káàárọ̀, iṣẹ́ àpẹẹrẹ")),
  ).toBeTruthy();
  await page.reload();
  await expect(page.locator("#workspaceSyncText")).toHaveText(
    "Workspace restored",
  );
  await page.locator("#welcomeContinue").click();
  await expect(page.locator("#welcomeGate")).toBeHidden();
  await page.locator("nav[aria-label=Primary] [data-view=settings]").click();
  await page.locator("[data-setting=candidate]").click();
  await expect(page.locator("#fullName")).toHaveValue(name);
  await expect(page.locator("#workspaceSync")).toHaveAttribute(
    "data-phase",
    "saved",
  );
});
test("local fixture job URL import persists across reload", async ({
  page,
  request,
}) => {
  await signup(page);
  await onboard(page);
  const url = await importFixture(page);
  const fixture = await request.get(url);
  expect(await fixture.text()).toContain("Example Test Company");
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => state.jobs.map((j) => j.url || j.application_url)),
    )
    .toContain(url);
});
test("reviewed packet downloads a readable Unicode PDF without submitting", async ({
  page,
}, testInfo) => {
  await signup(page);
  await onboard(page);
  await importFixture(page);
  // Seed a deterministic prepared packet, avoiding paid AI and every employer.
  // Preparation/claim verification itself is covered by policy tests, not this fixture.
  await page.evaluate((text) => {
    const job = state.jobs[0];
    state.packages.push({
      job_id: String(job.job_id || job.id),
      tailored: text,
      cover: "Test cover letter",
      state: "NEEDS_REVIEW",
      answers: [],
      claim_audit: [],
    });
    ApplyFlowWorkspace.openInspector(job);
  }, cv);
  const event = page.waitForEvent("download");
  await page.locator("#downloadPacketPdf").click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("application-cv.pdf");
  const file = testInfo.outputPath("application-cv.pdf");
  await download.saveAs(file);
  expect(fs.readFileSync(file).subarray(0, 5).toString()).toBe("%PDF-");
  const text = execFileSync("pdftotext", ["-layout", file, "-"], {
    encoding: "utf8",
  }).normalize("NFC");
  for (const line of cv.trim().split("\n"))
    expect(text).toContain(line.normalize("NFC"));
  expect(
    await page.evaluate(() => state.jobs.every((j) => !j.appliedAt)),
  ).toBeTruthy();
});
test("delete confirmation: cancel preserves rows and files; confirm removes them", async ({
  page,
}) => {
  await signup(page);
  await onboard(page);
  const id = await page.evaluate(() => uid());
  await page.locator("nav[aria-label=Primary] [data-view=settings]").click();
  await page.locator("[data-setting=privacy]").click();
  page.once("dialog", (d) => d.dismiss());
  await page.locator("#delAccount").click();
  expect(await profile(page, id)).toHaveLength(1);
  page.once("dialog", (d) => d.accept());
  await page.locator("#delAccount").click();
  await expect(page.locator("#toast")).toContainText("were deleted");
  expect(await profile(page, id)).toHaveLength(0);
  expect(
    await page.evaluate(async () => {
      const r = await supabaseClient.storage.from("resumes").list(uid());
      if (r.error) throw Error(r.error.message);
      return r.data;
    }),
  ).toHaveLength(0);
});
test("retired controls absent; unavailable sources actually disabled", async ({
  page,
}) => {
  await signup(page);
  await onboard(page);
  for (const selector of [
    "#systemDiagnostics",
    "#settings-advanced",
    "input[name=ctrlMode]",
    "#mode",
    "#autoOn",
    "#demoMode",
    "#runAgent",
    "#startAgent",
    "#pauseAgent",
    "#stopAutopilot",
    "#obCtrl",
    "input[name=onboardingMode]",
  ])
    await expect(page.locator(selector)).toHaveCount(0);
  for (const id of ["provider", "apSrc"])
    for (const value of ["adzuna", "greenhouse", "lever"])
      await expect(
        page.locator("#" + id + " option[value=" + value + "]"),
      ).toBeDisabled();
  await expect(page.locator("#mailboxSync")).toBeDisabled();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const view of [
    "overview",
    "search",
    "pipeline",
    "profile",
    "agent",
    "settings",
  ])
    await page
      .locator("nav[aria-label=Primary] [data-view=" + view + "]")
      .click();
  expect(errors).toEqual([]);
});
test("primary navigation labels remain readable when hovered", async ({
  page,
}) => {
  await signup(page);
  await onboard(page);
  const buttons = page.locator('nav[aria-label="Primary"] .nav-btn[data-view]');
  for (const button of await buttons.all()) {
    await button.hover();
    const colors = await button.evaluate((element) => {
      const buttonStyle = getComputedStyle(element);
      const navStyle = getComputedStyle(element.closest("nav"));
      return {
        text: buttonStyle.color,
        overlay: buttonStyle.backgroundColor,
        surface: navStyle.backgroundColor,
        label: element.textContent.trim(),
      };
    });
    const text = channels(colors.text);
    const overlay = channels(colors.overlay);
    const surface = channels(colors.surface);
    const alpha = overlay.length > 3 ? overlay[3] : 1;
    const background = surface.map(
      (channel, index) => overlay[index] * alpha + channel * (1 - alpha),
    );
    expect(
      contrast(text, background),
      `${colors.label} hover contrast`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
test("local read-only preview explains saves without offering a futile retry", async ({
  page,
}) => {
  await signup(page);
  await onboard(page);
  await page.evaluate(() => {
    window.__APPLYFLOW_LOCAL_READ_ONLY__ = true;
    persist();
  });
  await expect(page.locator("#workspaceSync")).toHaveAttribute(
    "data-phase",
    "readonly",
  );
  await expect(page.locator("#workspaceSyncText")).toHaveText(
    /read-only.*not saved/i,
  );
  await expect(page.locator("#workspaceSyncRetry")).toBeHidden();
});
test("overview keeps pipeline and activity available behind clear disclosures", async ({
  page,
}) => {
  await signup(page);
  await onboard(page);
  await page.evaluate(() => {
    state.packages.push({ job_id: "overview-test-packet", state: "NEEDS_REVIEW" });
    showView("overview");
    ApplyFlowProduct.renderProductHome();
  });
  const disclosures = page.locator("#productHome details.home-disclosure");
  await expect(disclosures).toHaveCount(2);
  await expect(disclosures.nth(0)).not.toHaveAttribute("open", "");
  await expect(disclosures.nth(1)).not.toHaveAttribute("open", "");
  await disclosures.nth(0).locator("summary").click();
  await expect(disclosures.nth(0)).toHaveAttribute("open", "");
  await expect(disclosures.nth(0)).toContainText("Open Applications");
  await disclosures.nth(1).locator("summary").click();
  await expect(disclosures.nth(1)).toHaveAttribute("open", "");
  await expect(disclosures.nth(1)).toContainText("Plan follow-ups");
});
test("mobile viewport and dark mode screenshots", async ({
  page,
}, testInfo) => {
  await signup(page);
  await onboard(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".mobile-nav [data-view=overview]").click();
  await expect(page.locator("#productHome")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: testInfo.outputPath("mobile-light.png"),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "More", exact: true })
    .click();
  await page.locator("#moreNavigation [data-more-view=settings]").click();
  await page.locator("[data-setting=appearance]").click();
  await page.locator("#themeBtn").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator(".mobile-nav [data-view=overview]").click();
  await page.screenshot({
    path: testInfo.outputPath("mobile-dark.png"),
    fullPage: true,
    animations: "disabled",
    caret: "hide",
  });
});

const { test, expect } = require("@playwright/test");
const { protect, signup, onboard, name } = require("./helpers.cjs");
test("signing out and creating account B clears account A from the rendered forms", async ({
  page,
  context,
  baseURL,
}) => {
  await protect(context, baseURL);
  await signup(page);
  await onboard(page);
  await page.locator("#userBtn").click();
  await page.locator("#accountLogout").click();
  await expect(page.locator("#welcomeRegister")).toBeVisible();
  await signup(page);
  await expect(page.locator("#apRoles")).toHaveValue("");
  await expect(page.locator("#apLocs")).toHaveValue("");
  await page.locator("#obNext").click();
  await page.locator("#manualProfile").click();
  await expect(page.locator("#p_name")).toHaveValue("");
  await expect(page.locator("#p_summary")).toHaveValue("");
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        profile: state.profile,
        resumes: state.resumes,
        packages: state.packages,
      }),
    ),
  ).not.toContain(name);
});

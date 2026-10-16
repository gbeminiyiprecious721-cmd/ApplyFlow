const { defineConfig, devices } = require("@playwright/test");
if (
  process.env.E2E_TARGET &&
  !["local", "staging"].includes(process.env.E2E_TARGET)
)
  throw new Error("E2E_TARGET must be local or staging.");
const local = process.env.E2E_TARGET !== "staging";
const baseURL =
  process.env.E2E_BASE_URL || (local ? "http://127.0.0.1:4173" : undefined);
if (!baseURL)
  throw new Error("Set E2E_BASE_URL to your explicitly approved staging URL.");
const url = new URL(baseURL);
if (local && !["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("Local tests must use a loopback URL.");
if (
  !local &&
  (process.env.E2E_SANDBOX !== "1" ||
    url.hostname === "applyflow-review.gbeminiyiprecious721.chatgpt.site")
)
  throw new Error(
    "Staging writes require E2E_SANDBOX=1 and a separate non-production app.",
  );
if (!local) {
  const sb = process.env.E2E_SUPABASE_ORIGIN;
  if (!sb || new URL(sb).hostname === "tbggqauyesloekynqavb.supabase.co")
    throw new Error(
      "A separate staging Supabase origin is required; production is blocked.",
    );
}
const fixtureURL =
  process.env.E2E_FIXTURE_URL || (local ? baseURL : "http://127.0.0.1:4173");
const fixture = new URL(fixtureURL);
if (
  fixture.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(fixture.hostname)
)
  throw new Error("Fixture server must use an HTTP loopback URL.");
module.exports = defineConfig({
  testDir: "tests/e2e",
  testMatch: "*.spec.cjs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.E2E_CHROMIUM_EXECUTABLE
          ? {
              executablePath: process.env.E2E_CHROMIUM_EXECUTABLE,
              args: [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
              ],
            }
          : undefined,
      },
    },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: fixtureURL,
    env: {
      E2E_PORT: process.env.E2E_PORT || fixture.port || "4173",
      APPLYFLOW_E2E: "1",
    },
    reuseExistingServer: false,
    timeout: 15000,
  },
});

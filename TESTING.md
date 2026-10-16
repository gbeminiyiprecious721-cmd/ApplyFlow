# ApplyFlow testing and audit handoff

## Run locally

Prerequisites: Node.js 22+, npm, and Poppler (`pdftotext`). On Ubuntu, install Poppler with `sudo apt-get install poppler-utils`.

```bash
npm ci
npx playwright install --with-deps chromium msedge
npm test
E2E_BASE_URL=http://127.0.0.1:4173 npm run test:e2e
npm run build
```

`test:e2e` includes Chromium and the actual Microsoft Edge `msedge` channel. It starts its own loopback fixture server. The fixture server uses the port in `E2E_BASE_URL`; `E2E_PORT` can explicitly override it. A Chromium binary already installed in a restricted environment can be selected with `E2E_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium`; this does not replace the Edge channel.

The default browser suite renders the shipped app in a real browser, with an explicitly isolated test adapter for authentication, database and storage. It checks signup, CV onboarding, Unicode values, reload persistence, local fixture URL import, actual PDF download/text extraction, deletion cancel/confirm, account-switch form clearing, retired DOM controls, disabled sources, mobile layout, and light/dark screenshots. This adapter is **not evidence that Supabase RLS or real login works**.

To use the existing project for local sign-in, confirm project ref `tbggqauyesloekynqavb` in the Supabase dashboard and copy its public publishable key (or legacy anon key). Run `scripts\Start-ApplyFlow-Local.ps1` in PowerShell, then open http://127.0.0.1:4173 and enter the key in the masked setup field. The local server validates it with a read-only Auth settings request, keeps it in memory only, and blocks database/storage writes. The setup endpoint binds to loopback and does not log the key. Supabase auth/session calls, reads, and Agent STATUS are allowed; agent mutations and other external requests are blocked. Do not use a service-role or `sb_secret_` key. Stop the server with Ctrl+C.

All external employer, job-source, AI and Browserbase requests are blocked. Packet download uses a deterministic prepared fixture; it does not test AI preparation or submit applications. Traces and video are disabled; screenshots contain synthetic data. Reports are under `playwright-report/`, downloads/screenshots under `test-results/`; these directories are ignored by Git.

## Run against an existing staging deployment

Use a staging app already configured for its own Supabase project. Production app and Supabase addresses are explicitly rejected. The staging worker must have `APPLYFLOW_APP_ORIGIN` set to the exact staging origin. Test signup must return a session without external email confirmation; otherwise signup fails clearly. Tests generate synthetic account emails/passwords; no API keys or service-role credentials are requested or written.

```bash
E2E_TARGET=staging \
E2E_SANDBOX=1 \
E2E_BASE_URL=https://your-staging-app.example \
E2E_SUPABASE_ORIGIN=https://your-staging-project.supabase.co \
E2E_EMAIL_DOMAIN=your-approved-test-email-domain.example \
npm run test:e2e
```

PowerShell equivalent:

```powershell
$env:E2E_TARGET = "staging"
$env:E2E_SANDBOX = "1"
$env:E2E_BASE_URL = "https://your-staging-app.example"
$env:E2E_SUPABASE_ORIGIN = "https://your-staging-project.supabase.co"
$env:E2E_EMAIL_DOMAIN = "your-approved-test-email-domain.example"
npm run test:e2e
```

After deploying, verify the live HTML response header with:

```powershell
$env:APPLYFLOW_POST_DEPLOY_URL = "https://your-staging-app.example"
npm run check:deployed
```

The check follows redirects and fails on a non-2xx response or if the final response does not declare exactly `text/html; charset=utf-8`.

Staging uses the app's existing client, authenticated requests and real database/storage. It additionally checks positive owner reads and cross-account denial by both owner ID and record ID for profiles, preferences, candidate facts, answer bank, CV records, saved jobs, applications, application documents, legacy search settings, paused cloud agent settings and career workspace. Private files are checked in `resumes`, `generated-docs` and `submission-evidence`: A must download/list its files, B must read its own controls, and B must not download, mint signed URLs, list A's files or read them through public URLs.

Only STATUS, DELETE_DATA, and explicitly disabled review SETTINGS calls are permitted for the cloud agent. QUEUE, PROCESS, TEST and provider calls are blocked. Real queued runs/submission records are not seeded or submitted. Their live API behavior remains outside this suite; existing mocked backend tests cover owner binding and submission policy.

The isolation test removes synthetic account data and probe files in `finally`, and reports cleanup warnings. Auth identities remain because deletion would require administrative credentials; delete those test identities through your existing staging administration process. Other staging UI tests leave their synthetic records available for inspection. Do not point this suite at real user accounts.

## Backend changes and deployment order

Apply `backend/agent-circuit-breaker.sql` before deploying `backend/application-agent.js` together with `agent-policy.mjs` and `provider-circuit.mjs`. Also apply `backend/resume-text-storage.sql` so the existing TXT onboarding format is accepted by the private CV bucket.

The provider's failure count and open state live in the database, serialized with a row lock across worker instances. Three consecutive HTTP 402 or 5xx responses open the circuit. Success or another HTTP status breaks the consecutive failure sequence. The scheduler and worker stop provider requests indefinitely while open, and an opening records one private alert plus a structured log without provider response bodies. Users see:

> Automatic filling is temporarily unavailable, your packet is ready for assisted apply

Only an explicit successful connection TEST closes the circuit; there is no timed retry/reopening. Running a TEST is an operator/user action, not part of this QA run. The circuit breaker tests use mock provider responses, including mixed failure codes, resets, manual recovery and repeated worker ticks while open. Actual provider failure/recovery behavior has not been exercised here.

To notify operators when the circuit transitions from closed to open, configure the worker environment variable `APPLYFLOW_CIRCUIT_OPEN_WEBHOOK_URL` with an HTTPS webhook endpoint. Keep the URL private in the deployment platform's environment/secret settings. The worker sends one event after the database transaction commits; delivery has a five-second timeout and failure does not undo the circuit opening. Leave the variable unset to disable webhook delivery. Tests use a mock endpoint and do not send notifications externally.

The static asset Worker exists solely to control HTTP Content-Type. It serves all HTML, including error responses, as `text/html; charset=utf-8`, preserves binary asset bytes, and keeps the existing Site identity. `npm run build` generates ignored `dist/server/index.js` and deployment metadata. Tests execute that generated Worker and verify HTML headers, font/library/extension bytes. These tests do not by themselves verify the deployed host's response headers.

## GitHub Actions

`.github/workflows/tests.yml` runs `npm ci`, `npm test`, the build, and both browser projects on every push and pull request. The optional staging job runs when repository variable `APPLYFLOW_E2E_STAGING_URL` exists, with `APPLYFLOW_E2E_SUPABASE_ORIGIN` and optional `APPLYFLOW_E2E_EMAIL_DOMAIN`. These are public endpoint/domain variables, not API keys. Uploads retain reports and synthetic screenshots for seven days. The workflow must be hosted on GitHub to execute; adding the file to the managed Site repository does not prove an Actions run occurred.

## Verification recorded on 2026-10-11

- `npm test`: eleven suites passed, including actual embedded-font PDF creation and Poppler extraction of accented/Yoruba text, and generated Worker HTTP/asset tests.
- Local Chromium 153 headless shell: eight rendered tests passed; staging isolation skipped intentionally. Standard Playwright Chromium download returned an invalid archive in this environment, so the explicit executable override was used.
- Microsoft Edge 155 installed, but launch failed because this container denies the browser's required socket operation (`Operation not permitted`). No Edge application behavior is claimed.
- Circuit migration applied; application agent deployed as version 8. Catalog checks confirmed the scheduler checks the breaker and authenticated clients cannot read private alerts. Provider readiness remained false, circuit closed, count zero; no provider request was made.
- TXT bucket configuration applied and checked: private visibility preserved; text/plain accepted. Real authenticated TXT upload has not been run.
- No staging app/project variables were supplied. Live signup, PostgreSQL Unicode persistence, owner/file isolation, provider failure/recovery, real extension behavior and GitHub Actions execution remain unverified.

Key handling note: one source inspection displayed the existing public publishable browser key in tool output. No secret key values were read and no credentials were changed.

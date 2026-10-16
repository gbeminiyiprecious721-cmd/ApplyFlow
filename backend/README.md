# Application agent V2

The existing static Site and legacy preparation worker are preserved. The new service is `applyflow-application-agent`; schema is in `agent-schema.sql`. Runtime credentials are supplied by Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Browserbase credentials remain in the existing server-only Vault record. No secrets belong in source.

Every interactive action verifies the Supabase user with Auth. Database queries bind that user to the profile, documents, matches and application. Only owner SELECT policies are exposed; queue/config writes run through the authenticated service. Scheduler TICK requests use an independent database-generated secret and cannot be called with a browser token. The gateway JWT check is disabled because the scheduler does not use a user JWT; both request paths perform their own authentication.

Review mode prepares approved packets without submitting. Auto mode submits only separately approved packets passing server-side profile, document, match, country, employer exclusion and daily-limit checks. One run per application avoids blind duplicate attempts. Immutable packet checks prevent using changed data. Job discovery and document tailoring retain the existing product workflow; the new agent consumes its prepared packets rather than claiming a new job-index integration.

Processing uses database cron / pg_net and Browserbase managed agents, so it continues after the Site tab closes. The static Site remains hosted through Sites. Adding a second Cloudflare account is unnecessary for this architecture.

## Verification

Run `node tests/agent.test.mjs`, `node tests/autofill.test.cjs`, and JavaScript syntax checks. Tests cover consent, eligibility, limits, URL rejection, frozen packets, matching fields, preservation, CAPTCHA pause and evidence gating. Live provider connection must be verified separately. Full Chrome/Edge and employer ATS end-to-end coverage is not implied by unit tests. No live employer submission is used for development QA.

## Recovery

The previous Site source commit is `b7cd62cc1718e1b1d66328bf64f9ee0affc28db0` (Site version 11). The legacy worker was not changed. New settings default disabled and the new scheduler processes only explicitly queued runs. Pause accounts before rollback. Keep old run IDs and confirmation evidence; do not retry uncertain provider requests.

Live verification on 10 October 2026: provider list access succeeded, but creating the neutral form test returned HTTP 402. Cloud runs are blocked by a server-owned readiness flag until the provider accepts a connection test. The Agent panel displays this blocker. An authenticated user can retest with the neutral fixture after restoring provider billing or credits. No employer application has been submitted during QA.

The database advisor reports pg_net installed in public; this provider extension is non-relocatable. Its HTTP functions live in net, and the scheduler dispatcher remains private with EXECUTE revoked from browser roles. Existing unrelated advisor notices were preserved.

## Workspace audit release (11 October 2026)

Run `npm ci --ignore-scripts` and `npm test` at the repository root. `QA.md` records coverage and outstanding live checks. `submission-guards.sql` protects confirmed progress from stale browser saves and active-run deletion; `global-preferences.sql` removes an implicit GBP default for new/edited preferences. Apply each migration once. The application agent version 6 additionally consumes verified packet answers, requires READY packets and PDF documents, keeps configuration reads inside transactions, and exposes owner-only cleanup. Cancelled work can be requeued only without a provider run ID.

Browser billing still blocks neutral cloud runs. Managed AI remains pilot-account-only; other discovery and mailbox providers are displayed as disconnected. Emulated DOM and mocked request tests are regression evidence, not live Chrome/Edge or ATS certification. Production readiness requires the remaining checks in QA.md.

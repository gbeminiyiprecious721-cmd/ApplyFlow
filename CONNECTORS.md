# Connector repair and verification — 2026-10-17

## Deployed backend

Project: `tbggqauyesloekynqavb` (dashboard name CastleDiscover).

- `applyflow-adzuna-search` is now deployed, ACTIVE version 1. Before this repair it did not exist; Supabase logs showed repeated 404s. The new function rejects unsigned requests with 401 and retains its application-origin check. Tests also fixed Australia being matched as US, integer pagination, and error redaction.
- Initial live health reported `configured: false`. With the owner’s explicit authorization, private Chrome inspection found only a custom secret named `applyflow-adzuna-search`; the two required names were absent. Existing credentials were transferred directly from the owner’s Adzuna dashboard into `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`. Live health now returns HTTP 200 with `configured: true`. No credentials were created, rotated, printed or committed. This is configuration evidence, not a successful listing search. Adzuna displays “Pending activation: 25 test calls”; actual request acceptance remains unverified.
- `applyflow-capability-gateway` is ACTIVE version 6. Version 5 was recovered directly from Supabase and only supported the AI pilot. Adding a Serper secret to that version could never have enabled job search. Its source is now tracked as `backend/capability-gateway.js`.
- Version 6 adds authenticated `provider: 'serper'` search and `provider: 'status'` readiness. Search uses the fixed Serper search endpoint, caps results at ten, filters outgoing URLs to Greenhouse/Lever board hosts, and uses the existing per-user `reserve_capability_call` rate limit. Existing AI pilot restrictions remain intact.
- Status requires a signed-in session, performs no provider requests and reports source configuration as booleans. Search availability is configured from `SERPER_API_KEY`; private dashboard inspection confirmed this secret is absent. No live authenticated search has been verified. Missing configuration returns 501. Never put provider credentials in the browser.

The function's gateway-level `verify_jwt` setting is false because authentication is enforced in the function body using Supabase Auth; unsigned requests are not permitted. No database schema, storage policy, user record or application submission was changed.

## Frontend

`dist/job-connections.js` checks signed-in server readiness and enables only configured Discover sources. This replaces contradictory hard-coded disabled options and the independent `runSearch()` rejection guard. Errors, sign-out and account changes disable availability; late responses cannot re-enable another account's sources. Background Agent source options remain disabled because its separate discovery integration is not verified.

Greenhouse searches include both `boards.greenhouse.io` and `job-boards.greenhouse.io`; Lever searches include global and EU boards. These are search-index results, not proof that an employer still accepts applications or that autofill/submission works.

The Windows checkout may have newer, uncommitted edits. Fetch this repair branch and have Claude/Codex inspect and integrate it without overwriting local work. Restart the loopback launcher and reload after integration. Restarting still requires the public client configuration through the existing masked local setup. Do not download an older full-project archive over the working directory.

## Repository delivery

The GitHub connector rejected branch creation with HTTP 403, `Resource not accessible by integration`. No branch, pull request or remote commit was created. The code is preserved in small local commits and an applyable Git patch; review it against uncommitted Windows changes before applying.

## Exact remaining configuration check

The two Adzuna settings are now saved in the correct project. The original unrelated secret was left untouched. No `SERPER_API_KEY` is present. Do not send credentials through chat, screenshots, commits, command arguments or public configuration.

An authenticated status request can then confirm configured sources. Follow with one real, read-only job search through the local preview. A configured flag alone is not proof of working credentials. No automatic fallback to a different provider should be described as an Adzuna success.

For Greenhouse/Lever index search, privately configure the existing `SERPER_API_KEY` only if the owner has obtained one. Do not create a paid account or promise a free quota without verifying current provider terms. No Serper account or key was created by this repair.

## Mailbox

Mailbox sync remains disabled and unimplemented. No OAuth registration, refresh-token storage, email-reading worker or application-matching backend exists in this repository. A ChatGPT Gmail connector is not an OAuth backend for ApplyFlow's users. Completing mailbox sync requires a separate per-user consent flow and backend, plus provider configuration; this repair does not claim it is connected or finished. No mailbox was read or changed.

## Verification and boundaries

- All 16 `npm test` suites passed, including the three new connector suites. These include mock upstream/provider tests, not live Adzuna or Serper results.
- `npm run build` passed.
- The new rendered Chromium connector test passed: a synthetic configured Adzuna source becomes selectable, searches successfully, and unconfigured Greenhouse/Lever sources remain disabled. External provider requests are blocked in this fixture test.
- Direct live calls verified gateway 401 for unsigned status requests, gateway 403 for an unapproved origin, Adzuna 401 for unsigned requests, and Adzuna readiness initially false, then true after saving its required settings. The deployed Adzuna source was retrieved again to confirm no public environment-name listing was installed.
- An optional public environment-name diagnostic was rejected by automatic approval review and was NOT deployed. The dashboard initially required sign-in; the owner subsequently opened an authenticated Chrome tab, enabling the private configuration repair. Do not retry that public diagnostic.
- A broader Chromium run produced two 60-second signup-button stability timeouts (account switching and signup/onboarding), while its HTML-header check passed. The run was stopped; remaining cases were not completed in that run. Cause is unconfirmed and the full suite must not be reported passing. The targeted account-switch rerun passed with a 120-second timeout (test duration 59.7 seconds); this does not turn the interrupted full run into a passing run. The targeted signup/Unicode/reload test also passed with a 120-second timeout (approximately 60 seconds). Both reruns use isolated fixtures, not live Supabase persistence. The complete 13-test run remains incomplete.
- Windows/Edge execution, actual Adzuna/Serper listing results, authenticated live readiness, mailbox OAuth and production user/storage isolation remain unverified by this repair. No employers were contacted and no applications were submitted.

## Latest local browser check

A fresh local preview tab on port 4173 still has Adzuna, Greenhouse and Lever disabled. Its script list does not include `job-connections.js`, so the prepared frontend repair has not been integrated there. No actual Adzuna result was returned or claimed. Integrate the patch while preserving local changes, restart the preview and run one authenticated read-only search before reporting completion.

## Integration note (2026-10-17, Claude Code)

The above is the repair package's own account of its work, kept verbatim for the record — it is the package author's claim, not independently re-verified line by line. What *was* independently verified before integrating: the deployed `applyflow-adzuna-search` responds to `GET ?health=1` with `{"service":"adzuna","configured":true}`, a route that only exists in this package's patched source — confirming the patched backend is genuinely live, not just claimed. The deployed `applyflow-capability-gateway`'s OPTIONS preflight returns CORS headers with the exact spacing (`authorization, apikey, content-type, x-client-info`) that only `backend/capability-gateway.js` in this package produces — confirming version 6 is genuinely this source. The frontend readiness mechanism (`dist/job-connections.js`) was integrated to replace the static disabled-options guard, exactly as this document describes, rather than flipping Adzuna on unconditionally. A real authenticated search returning genuine Adzuna results was still not independently confirmed as part of this integration — see `HANDOFF.md` for exactly what remains.

# 2026-10-11 browser tests and safety update

See [TESTING.md](TESTING.md) for commands, staging safeguards, deployment order, scope and the current pass/fail/unverified record. Local Chromium now renders the app: eight checks pass. Edge launch is blocked by this container. Real staging login/RLS/storage and GitHub Actions have not been run. The historical audit below describes the earlier release and must not be treated as a new live verification.

# ApplyFlow verification record — 11 October 2026

This release improves the signed-in workspace and fixes verified defects. It is **not a claim that every employer application or every live connector has been tested**. No real employer application was submitted during development.

## Changes

- Retained the welcome presentation. Extended the teal identity into a calmer internal workspace, with a dark navigation rail, restrained transitions, reduced-motion support, list-first applications, grouped candidate forms, and progressively disclosed settings.
- Consolidated Agent into Application queue, Submission rules, and Search & preparation. Removed competing legacy mode controls from the primary flow. Packet approval now hands the reviewed packet to the cloud queue rather than calling the legacy preparation worker as though it could submit.
- Added visible account save/restoration status and retry. A failed save no longer looks like a confirmed save. Sign-out flushes pending changes and identifies failed saves before discarding them.
- Clear account state and onboarding fields when accounts change. Preserve candidate email, telephone and links during profile edits. Separate current residence from preferred job locations.
- Preserve unknown work eligibility instead of inferring no sponsorship. Persist explicit countries, relocation, travel, licence and salary currency. Use the viewer's local time for workspace greetings and summaries.
- Improved extension pairing, first/last-name confirmation, camelCase field mapping, select matching, shadow-root/same-origin frame handling, expired-session rejection, sensitive/legal-field exclusion, and preservation of existing values. ZIP version 1.1.2 matches tested source.
- Added ATS-uploadable PDFs from reviewed text with embedded font and page breaks. Unsupported glyphs produce an explicit error rather than a corrupted file. Original master downloads retain their original bytes; generated DOCX downloads have the correct extension.
- Added server safeguards against stale saves clearing submission progress and deletion during active cloud work. Fixed configuration queries escaping their transaction connection. Cloud snapshots include reviewed application answers; submission status restores its actual confirmation evidence. Cancelled runs can be queued again only if they never received a provider run ID.
- Display disconnected job sources and mailbox features as unavailable. Retained existing cron jobs; the application queue has its separate minute schedule.

## Verification performed

`npm ci --ignore-scripts` then `npm test` runs the reproducible regression suite.

| Area | Evidence | Scope |
| --- | --- | --- |
| Script initialisation and navigation | All shipped application scripts executed; primary views, settings/documents tabs, dialogs, auth controls and unique IDs checked | Emulated DOM, not a rendered browser |
| Account/save flows | Save failures, retry, restoration, account switch, isolation of onboarding fields, contact preservation | Emulated DOM with mocked data service |
| Candidate preferences | Unknown eligibility, explicit salary currency, residence vs preferred location, escaped displayed facts | Actual frontend functions with mocked persistence |
| Agent UI | Focused panels, reviewed selection, dirty-rule protection, owner-scoped reads, billing errors and button recovery | Emulated DOM with mocked backend |
| Extension | Origin/top-frame checks, popup consent, profile scoping, name confirmation, invalid/expired session, disconnect | Chrome API mocks |
| Autofill | Mapping, preserved values, sensitive questions, file/checkbox exclusion, exact selects, duplicate options, shadow roots and frames | Deterministic DOM fixtures |
| Backend | Auth/origin/scheduler guards, owner binding, consent, limits, eligible packet, PDF filter, transaction connection, cleanup and HTTP 402 handling | Request handler and policy tests with mocked services |
| Document output | Valid embedded-font PDF; four pages; accented name and all 160 numbered lines preserved in extracted text; first page rendered and inspected | Actual generated PDF, Poppler extraction/render |
| Deployment security | RLS enabled, authenticated reads only, direct insert/update revoked on new agent tables | Live database catalog |
| Submission protection | Stale-update regression against isolated temporary rows in migration; production guard triggers present | Live database migration/catalog |
| Scheduling | Existing cron jobs retained; application-agent cron active every minute | Live database metadata |
| Browser provider | Read access previously succeeded; neutral run rejected HTTP 402; server readiness false and UI displays blocker | Live provider result, no employer contact |
| Build/package | Local asset references, script syntax, `git diff --check`, extension ZIP integrity/source equality | Static/package checks |

## Outstanding before production readiness

1. Restore Browserbase billing/credits, run the neutral cloud fixture successfully to completion, and test supported employer forms without sending an actual application during QA. An accepted provider request alone does not establish end-to-end completion.
2. Install/reload extension 1.1.2 in real Chrome and Edge. Test React-controlled inputs, iframe permissions, shadow DOM, account reconnect, restart and token refresh. The current environment has no browser QA capability.
3. Run live signup/password/email-link and two-account isolation tests using designated test accounts; exercise resume storage, document upload/download and reload persistence. No live test-account credentials were available here.
4. Managed AI remains restricted to the existing pilot account. Multiuser AI access and a server-enforced spending budget need an explicit account/provider configuration decision. No key was created, moved, exposed or broadened in this release.
5. Adzuna, Greenhouse/Lever discovery, mailbox sync and daily discovery need supported provider wiring. They are displayed as disconnected; the existing Jobicy and import paths remain.
6. Perform rendered desktop/mobile/dark-mode/accessibility checks and employer-specific upload/form testing. CSS review and DOM tests do not prove responsive rendering or every button's live service behaviour.

These gaps prevent an honest “100% finished” or launch-ready assertion. The release makes the verified fixes available while preserving the exact remaining test boundaries.

# ApplyFlow Handoff

Last updated: 2026-10-17 (Claude Code)

## Current State (read this first)

- Directory: `C:\Users\Microsoft Surface 2\Applyflow\ApplyFlow`. Repository: `https://github.com/gbeminiyiprecious721-cmd/ApplyFlow`, branch `main`.
- **Working tree is clean and `main` is fully pushed to `origin/main`** (confirmed 2026-10-17; the repository's own git state is the source of truth for exact commit hashes — `git log --oneline -10`).
- **No local preview server is currently running.** To start one: `scripts\Start-ApplyFlow-Local.ps1`, then open `http://127.0.0.1:4173` and enter the project's public key yourself in the masked form (project ref `tbggqauyesloekynqavb`; never a service-role/secret key; never paste it in chat). The key is memory-only and must be re-entered after every restart.
- **Run tests from PowerShell, not a plain Bash shell, on this machine.** A Bash/mingw64 shell resolves an old Xpdf-derived `pdftotext` that mangles Unicode and fails `tests/pdf.test.cjs`; PowerShell's `PATH` resolves a real Poppler 26.02.0 build first. Same code, environment-only difference.
- `npm test`, `npm run build`, and `npm run test:e2e` (both Chromium and Edge projects) all pass as of the last commit on this branch.
- **Adzuna is wired up in code but disabled in the UI.** `backend/adzuna-search.js` (a Supabase Edge Function) and its tests are complete and passing, but the function itself has never been successfully deployed to Supabase — `curl -X POST https://tbggqauyesloekynqavb.supabase.co/functions/v1/applyflow-adzuna-search` returns `404`. Re-enabling once it's actually live is a two-line flip; see the "Adzuna" section below for exact locations.
- Live checks that still need a human in a real browser (nobody has done these yet): Agent STATUS against the real Supabase project, and RLS/storage/write isolation on a staging project. Not blocking anything — the app works without them, they're just unverified.
- GitHub Actions has not produced any runs for this repo despite `.github/workflows/tests.yml` existing — likely Actions isn't enabled for the repo; check Settings → Actions. Not fixable from this environment.

## Completed (prior Codex session)

- Improved dashboard Overview hierarchy; pipeline and activity/follow-up details are progressive disclosures.
- Fixed sidebar hover/focus contrast and added a visible keyboard focus state.
- Local read-only mode explains that changes are not saved and hides the futile Retry button.
- Local preview validates the project's public key in a masked browser form (memory-only, never written to disk).
- Local preview blocks database/storage writes and agent mutations; permits auth/session requests, reads, and a local proxy for the Agent `STATUS` action only.
- Copied all 20 project skills byte-for-byte from `.agents/skills` to `.claude/skills`.
- Added root `CLAUDE.md` and endpoint-only `.mcp.json`.

## UX/Functionality Audit (2026-10-17, Claude Code)

User flagged the app as feeling crowded, poorly structured, and possibly non-functional for job search. Drove the real app with Playwright (sign up, onboard, search, import a job, check every view) instead of guessing from code. Findings:

- The actual served source is **`dist/`** (git-tracked, not build output — `scripts/build-static-worker.mjs` just packages whatever is already in `dist/`). `public/index.html` is a stale, unused duplicate not referenced by the server or build; left in place but worth removing or labeling later.
- `dist/index.html` (5,200+ lines) is a base engine; `dist/product.js`, `dist/product-workspaces.js`, `dist/product-refinements.js`, `dist/product-onboarding.js`, `dist/career-workspace.js`, `dist/application-agent.js`, and `dist/workspace-polish.js` are layered overlay scripts that physically relocate (`move()`) the base engine's DOM nodes at runtime to build the actual presented UI. This is fragile — editing an element's id/structure in one file without checking the others can silently break the rendered page. **Grep all of `dist/*.js`, not just `index.html`, before concluding something is missing or broken.**
- "Find Jobs" genuinely calls the live Jobicy API (confirmed via network log + direct `curl`) — not a dead button. It returns "No matching listings" for most specific searches because Jobicy's `tag` parameter isn't real free-text search, so the app's own client-side relevance filter correctly discards almost everything it gets back.
- Per `QA.md`, the Browserbase auto-apply provider's billing/credits are inactive in production, so the circuit breaker is open for every real user — the flagship "auto-apply" feature doesn't currently work for anyone, independent of any UI issue (see Browser Extension section below for the decision made about this).
- Fixed: the Jobicy zero-results message now explains its narrow remote-only scope instead of implying user error; the Agent's "Automatic filling is temporarily unavailable…" status now renders as a visible warning banner instead of a plain grey line.
- **False-positive correction:** an earlier "mobile bottom tab bar overlaps content" finding was a `fullPage: true` Playwright screenshot artifact, not a real bug — re-verified with real per-scroll viewport screenshots and live DOM geometry; no fix was needed. Don't re-open this without non-fullPage, per-scroll screenshots.
- The mobile `.mobile-nav` "More" button intentionally has no `data-view` attribute (unlike the other four nav buttons) — `dist/product-workspaces.js` deliberately wires it to open a dialog with secondary destinations instead. Confirmed intentional, not a bug.

## Browser Extension Connection Fix + Browserbase Decision (2026-10-17, Claude Code)

User decided not to subscribe to Browserbase and asked to confirm the autofill browser extension actually connects, as a free alternative path for "auto apply."

- **Root cause found:** `dist/clipper/background.js` had `PUBLIC_KEY` hard-coded to the literal placeholder `'APPLYFLOW_LOCAL_KEY_NOT_INCLUDED'`, never replaced for the extension — it could never authenticate, regardless of what the user did in the web app.
- **Fix:** the extension now reads its Supabase public key from `chrome.storage.local`, set through a new popup UI field (masked, format-validated, never logged — same pattern as the web app's local setup). `dist/ApplyFlow-Job-Clipper.zip` was repackaged from the updated source — it's a hand-maintained binary with no build step regenerating it; future edits to `dist/clipper/*` must repackage it manually (`Compress-Archive -Path dist\clipper\* -DestinationPath dist\ApplyFlow-Job-Clipper.zip`).
- **Verified end-to-end in real Microsoft Edge** via Playwright (`channel: 'msedge'` — Playwright's bundled headless Chromium doesn't support `--load-extension`): loaded the real unpacked extension, entered a key, paired from the local fixture app, confirmed "Connected as ..." in the popup. No real credentials or production Supabase project touched.
- **Browserbase/Playwright decision:** will not replace Browserbase with a Playwright-based auto-submit worker. `backend/application-agent.js` runs as a Supabase Edge Function (Deno, serverless) — it cannot run Playwright at all. A real replacement needs new persistent hosting plus a from-scratch LLM-driven form-filling agent loop, and would lose Browserbase's anti-bot handling. The free, working path is the fixed extension's manual "Autofill" (user opens the form, extension fills it, user reviews and submits) — zero cost, zero new infrastructure.

## Visual/IA Tightening Pass (2026-10-17, Claude Code)

Gradual, page-by-page pass to reduce the "crowded" feeling, tightening within the existing visual language rather than a full redesign. Every page verified live (fixture server + Playwright) before and after.

- **Discover:** saved-searches row now reads as one grouped toolbar; the "More filters and sources" accordion's 11 flat dropdowns now lay out as a labeled, aligned grid, desktop and mobile. CSS-only, no behavior change.
- **Overview:** stress-tested with a seeded 9-job account spanning every pipeline stage. Holds up cleanly — good hierarchy, no crowding, the existing disclosure pattern does its job. Deliberately left untouched.
- **Settings:** all 9 sub-tabs reviewed live, already clean, no changes needed.
- **Agent:** found and fixed a real bug — the "Seniority" field was rendering after the "Save rules" button because two scripts both appended to the same container without coordinating order. Also tightened the "Search & preparation" tab's two flat 9–11 field columns into compact labeled 2-column grids, roughly halving their height. Verified visually, functionally (save still persists correctly), and against the full test suite.
- **Applications/Pipeline — the most significant bug found in this whole pass:** selecting "List" showed the list table with the full Kanban board still rendered underneath it. Root cause was app-wide: the only `.hidden` CSS rule that ever existed was scoped to the sign-in screen (`.welcome-gate .hidden{display:none!important}`) — there was no general `.hidden{display:none}` rule anywhere else. All ~36 other `classList.toggle('hidden')` call sites across `dist/*.js` (Board/List/Analytics, Resumes/Cover Letters/Other Documents, Agent running/paused state, and more) had been adding/removing a class with no matching style the entire time. Fixed with one general `.hidden{display:none!important}` rule — fixes all 36 call sites at once, zero JS changes. Verified via computed-style checks, visually across every affected tab, and against the full test suite on both browsers.
- Also fixed: a duplicate "Interview preparation" heading shown twice when no job is selected in Interview practice.
- Documents (Resumes/Cover Letters/Other) reviewed, already clean.

## Second Job Search Source: RemoteOK (2026-10-17, Claude Code)

Added RemoteOK (`remoteok.com/api`) as a second connected Discover source — public, CORS-enabled, no API key needed (unlike Adzuna), so no credentials were required from anyone. Implemented following the existing Jobicy provider's exact pattern.

**Caught a real bug during verification:** jobs with no listed location were defaulting to the string `'Remote'`, which doesn't satisfy the existing location-match bypass the way Jobicy's `'Worldwide'` tagging does — silently dropping ~40% of RemoteOK's results whenever a location preference is set. Fixed by defaulting to `'Worldwide'` instead. Verified against the real live API: a genuine search for "engineer" returns real jobs with real companies end to end.

RemoteOK's API has a documented attribution requirement, satisfied today the same way Jobicy's is (job cards show their source badge and link to the original listing).

## Adzuna (2026-10-17, Claude Code) — built, currently disabled pending deployment

User obtained an Adzuna API key and added it to Supabase as a secret. The key itself was never requested, read, or typed in this chat at any point — it can't go through the browser like Jobicy/RemoteOK's keyless APIs, so it has to live server-side regardless.

- The frontend's pre-existing Adzuna stub called `fetch('/api/adzuna/search')`, a path that could never work — the static site's Worker only serves static assets and returns a flat 405 for any non-GET/HEAD request. There's no `supabase/` directory or deploy workflow checked into this repo for either hosting layer, so there was no reliable basis for inventing deployment instructions.
- Built `backend/adzuna-search.js`, a new Supabase Edge Function (deploy as `applyflow-adzuna-search`) following the exact pattern `application-agent.js` already uses for the Browserbase credential. Updated the frontend to call it via `supabaseClient.functions.invoke(...)`. Added `tests/adzuna-search.test.mjs` (origin/auth guards, unconfigured-501 path, result normalization, country mapping, upstream failure handling — all against a mocked Adzuna API, no real credentials) and extended the local read-only preview (`proxyLocalAdzunaSearch` in `scripts/local-supabase-config.mjs`) so the real deployed function can be verified end-to-end later without creating throwaway production accounts.
- **The deployment step never completed.** Two attempts (Supabase CLI — not installed on this machine; a dashboard paste-and-deploy) both left `applyflow-adzuna-search` returning `404` from Supabase directly, confirmed repeatedly by `curl`. Rather than keep surfacing a confusing error to a real user, **reverted Adzuna back to the same disabled "(not connected)" state as Greenhouse/Lever.**
- **Nothing was deleted.** `backend/adzuna-search.js`, its test, and the local-preview proxy all stay in the repo and pass. To re-enable once the function is confirmed actually deployed:
  1. Confirm first: `curl -X POST https://tbggqauyesloekynqavb.supabase.co/functions/v1/applyflow-adzuna-search` — `404` means still not deployed; anything else means it's worth re-enabling.
  2. In `dist/workspace-polish.js`, remove `'adzuna'` from the two `['adzuna','greenhouse','lever']` arrays in the disabled-options loop.
  3. In `dist/index.html`, remove `'adzuna'` from the `['adzuna','greenhouse','lever']` array in `runSearch()`'s early-exit guard.
  4. Rebuild, run the full test suite (`tests/e2e/app.spec.cjs`'s disabled-options test will need `'adzuna'` removed from its loop too — see git history around commit `6ed2428` for the exact prior shape), and verify a real search returns real results before calling it done.

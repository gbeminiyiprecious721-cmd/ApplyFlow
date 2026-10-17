# ApplyFlow Handoff

Last updated: 2026-10-17 (Claude Code continuation)

## Project

- Directory: `C:\Users\Microsoft Surface 2\Applyflow\ApplyFlow`
- Repository: `https://github.com/gbeminiyiprecious721-cmd/ApplyFlow`
- Branch: `main`
- Remote: `origin` points to the public repository above.
- The implementation commits on local `main` are `e078c87` (Claude Code workspace), `c3793e2` (safe local Supabase preview), and `a7d3e7b` (dashboard usability). The repository base is `29d1558` (initial source import). This handoff is committed separately after those implementation commits; run `git log -5 --oneline` for the exact current HEAD chain and handoff commit hash. Do not push without an explicit request.

## Completed

- Improved dashboard Overview hierarchy; pipeline and activity/follow-up details are progressive disclosures.
- Fixed sidebar hover/focus contrast and added a visible keyboard focus state.
- Local read-only mode now explains that changes are not saved and hides the futile Retry button.
- Local preview validates the existing project's public key in a masked browser form. The value is held only in server memory, is not written to disk, and must be entered again after a server restart.
- Local preview blocks database/storage writes, agent mutations, and unrelated external requests. It permits auth/session requests, reads, and a local proxy for the Agent `STATUS` action only.
- Added regression tests for hover contrast, read-only save status, Overview disclosures, project/key validation, and the local Agent action allowlist.
- Copied all 20 project skills byte-for-byte from `.agents/skills` to Claude Code's supported `.claude/skills`; all 303 files (including licenses and bundled resources) hash-match. The originals remain in place.
- Added root `CLAUDE.md` and endpoint-only `.mcp.json`. No auth tokens or keys were copied.

## UX/Functionality Audit (2026-10-17, Claude Code)

User flagged the app as feeling crowded, poorly structured, and possibly non-functional for job search. Drove the real app with Playwright (sign up, onboard, search, import a job, check every view) instead of guessing from code. Findings:

- The actual served source is **`dist/`** (git-tracked, not build output — `scripts/build-static-worker.mjs` just packages whatever is already in `dist/`). `public/index.html` is a stale, unused duplicate not referenced by the server or build; it was left untouched here but is worth removing or clearly labeling in a future session to avoid confusion.
- `dist/index.html` (5,232 lines) is a base engine; `dist/product.js`, `dist/product-workspaces.js`, `dist/product-refinements.js`, `dist/product-onboarding.js`, `dist/career-workspace.js`, `dist/application-agent.js`, and `dist/workspace-polish.js` are layered "Phase N" overlay scripts that physically relocate (`move()`) the base engine's DOM nodes to build the actual presented UI (Overview/Discover/Applications/Agent/Settings). This is fragile — editing an element's id/structure in one file without checking the others can silently break the rendered page. Future UI work should grep all of `dist/*.js`, not just `index.html`, before assuming something is missing.
- "Find Jobs" genuinely calls the live Jobicy API (confirmed via network log + direct `curl`) — it's not a dead button. It returns "No matching listings" for most specific searches because Jobicy's `tag` parameter isn't real free-text search (confirmed: `tag=Data+Analyst` and no tag return the same generic results), so the app's own client-side relevance filter correctly discards almost everything.
- Already implemented and tested before this session (found via `tests/e2e/app.spec.cjs:175`, don't re-add): Adzuna/Greenhouse/Lever and "Daily discovery" options are already `disabled` with "(not connected)" labels (`dist/workspace-polish.js`), and Settings → Connections already has an honest "Your connected workspace" summary.
- Per `QA.md`, the Browserbase auto-apply provider's billing/credits are inactive in production, so the circuit breaker is open for every real user right now — the flagship "auto-apply" feature doesn't currently work for anyone, independent of any UI issue.
- Fixed this session (user approved "fix functionality honesty first, messaging only" scope): (1) the Jobicy zero-results message now explains its narrow remote-only scope instead of implying user error (`dist/index.html`, `runSearch()`); (2) the Agent's "Automatic filling is temporarily unavailable…" status now renders as a visible warning banner (`data-tone=warning`) instead of a plain grey line easy to miss (`dist/application-agent.js` + `dist/workspace-polish.css`).
- **Correction (2026-10-17, later same session):** the "mobile bottom tab bar overlaps content" finding reported earlier in this doc was a false positive — a `fullPage: true` Playwright screenshot artifact, not a real bug. Re-verified with real per-scroll-position viewport screenshots and live DOM geometry: `.mobile-nav` is `position:fixed` (defined in an inline `<style>` block in `dist/index.html`, not the external CSS files — easy to miss), `main`'s reserved `padding-bottom` (100px at ≤600px width) comfortably clears the nav bar's actual height (~65px), and no content overlap occurs at any scroll position. No fix was needed or made. Do not re-open this without first checking with non-fullPage, per-scroll screenshots.
- Also checked in passing: the mobile `.mobile-nav` "More" button has no `data-view` attribute in the live DOM, unlike the other four nav buttons — confirmed intentional, not a bug. `dist/product-workspaces.js` deliberately deletes it and wires the button to open a dialog (`#moreNavigation`) with secondary destinations (Documents, Notifications, Help, Settings, Profile) instead of navigating directly, a standard mobile "More" pattern.
- Not yet addressed (deferred, user chose not to scope in this pass): the broader IA/visual redesign; adding a second, broader job source.

## Browser Extension Connection Fix + Browserbase Decision (2026-10-17, Claude Code)

User decided not to subscribe to Browserbase for now and asked to confirm the autofill browser extension actually connects, as a free alternative path for "auto apply."

- **Root cause found:** `dist/clipper/background.js` had `PUBLIC_KEY` hard-coded to the literal placeholder `'APPLYFLOW_LOCAL_KEY_NOT_INCLUDED'`. Since nothing ever replaced it for the extension (unlike `dist/index.html`, which `scripts/local-supabase-config.mjs` patches at serve time), every Supabase call the extension made was sent with an invalid key — the extension could never actually authenticate, regardless of what the user did in the web app.
- **Fix:** the extension now reads its Supabase public key from `chrome.storage.local` (`projectKey`), with a new popup UI (`dist/clipper/popup.html`/`popup.js`) to enter it — same masked, format-validated, never-logged pattern already used for the web app's local preview setup. New `SET_KEY` message in `background.js`; `STATUS` now reports `hasKey`. Falls back to the hard-coded constant only if it's ever set to something other than the placeholder (future-proofing, unused today).
- `dist/ApplyFlow-Job-Clipper.zip` was **repackaged** from the updated `dist/clipper/*` — it was a hand-maintained binary with no build step regenerating it from source; future edits to `dist/clipper/*` must repackage the ZIP manually (`Compress-Archive -Path dist\clipper\* -DestinationPath dist\ApplyFlow-Job-Clipper.zip`) or the download button will keep serving stale code.
- `tests/extension.test.cjs` updated with real coverage (format validation, popup-only sender check, `hasKey` status, and the pairing flow now requiring a key first).
- **Verified end-to-end in a real browser**, not just unit tests: loaded the actual unpacked extension in real Microsoft Edge via Playwright (`channel: 'msedge'` — Playwright's own bundled headless Chromium does not support `--load-extension`), entered a key through the popup, triggered pairing from the local fixture web app, and confirmed the popup showed "Connected as ...". No real credentials or real Supabase project were touched (production domain was routed/mocked for the test).
- **Browserbase/Playwright decision:** explicitly will not be replacing Browserbase with a Playwright-based auto-submit worker right now. `backend/application-agent.js` runs as a Supabase Edge Function (Deno, serverless) — it cannot run Playwright at all (no persistent process, no Chromium binary support), so this isn't a drop-in swap. It would need a new persistently-hosted service, plus a from-scratch LLM-driven form-filling agent loop (Playwright alone has no "understand this form" intelligence — that's what Browserbase's task API was providing), and would lose Browserbase's anti-bot/stealth handling, which real ATS platforms actively defend against. The free, working path for now is the fixed browser extension's manual "Autofill" (user opens the form themselves, extension fills it, user reviews and submits) — zero cost, zero new infrastructure, zero ToS risk.

## Visual/IA Tightening Pass (2026-10-17, Claude Code)

User asked for a gradual, page-by-page pass to reduce the "crowded, not well organized" feeling, tightening within the current visual language rather than a full redesign. Each page verified live (fixture server + Playwright) before and after, not just reasoned about statically.

- **Discover page — done.** The saved-searches row (Clear filters/Save search/Saved searches/Remove) now reads as one grouped toolbar (`#view-search .search-tools`, new CSS). The "More filters and sources" accordion's 11 flat, same-looking dropdowns now lay out as a labeled, aligned grid (`#view-search .filter-details:first-of-type .filters`), desktop and mobile. CSS-only in `dist/workspace-polish.css`, no structural/behavioral change. Commit `10ec5e9`.
- **Overview page — checked, no changes made.** Stress-tested with a seeded 9-job account spanning every pipeline stage (Saved/Preparing/Applied/Interview/Offer), both collapsed and with the "Application pipeline" and "Recent activity & follow-ups" disclosures expanded. It holds up cleanly at real data volume — good hierarchy, no crowding, the disclosure pattern (already built in an earlier session) does its job. Deliberately left untouched rather than making cosmetic changes to a page that already works, per "don't add complexity beyond what's needed."
- **Settings — checked, no changes needed.** Reviewed all 9 sub-tabs live (Profile, Job Preferences, Application Answers, Notifications, Connections, Privacy & Data). All already clean and appropriately minimal.
- **Agent — fixed.** Found and fixed a real bug: the "Seniority" field (`dist/product-refinements.js`) was being appended after the "Save rules" button because two separate scripts both appended to `#applicationRules` without coordinating order, making it look disconnected from the form it belongs to. Also tightened the "Search & preparation" tab's two flat 9–11 field columns into compact labeled 2-column grids (same `.filter-field` pattern as Discover), roughly halving their height; collapses to single column under 600px. Verified visually (desktop + mobile), functionally (save still persists `seniority`/`excluded_locations` correctly after the DOM change), and against the full unit + Playwright E2E suite. Commit `4582224`. The "Application queue" and "Submission rules" Agent sub-tabs were already clean, untouched.
- **Applications/Pipeline and Documents views — not yet reviewed.** Next up if continuing this pass.
- Reminder for whoever continues this: the real served source is `dist/`, not `public/index.html` (stale, unused — see the earlier UX audit section above), and UI behavior is assembled at runtime by `dist/product.js`, `dist/product-workspaces.js`, `dist/product-refinements.js`, `dist/workspace-polish.js`, `dist/career-workspace.js`, `dist/application-agent.js` relocating/wrapping the base `dist/index.html` markup — grep all of `dist/*.js`, not just `index.html`, before concluding something is missing or broken.

## Exact Next Action

1. The local preview server (`scripts\Start-ApplyFlow-Local.ps1`, i.e. `node tests/e2e/server.mjs` with `APPLYFLOW_LOCAL_SETUP=1`) was started by Claude Code on 2026-10-17 and confirmed serving `http://127.0.0.1:4173` (HTTP 200). If it is no longer running, restart it with that script.
2. Open `http://127.0.0.1:4173` and enter the existing project's public publishable/anon key in the masked setup form yourself — Claude will not request, read, or type this key. Confirm the project ref `tbggqauyesloekynqavb` in Supabase first. Never use a service-role or secret key; never paste keys into chat.
3. Choose **Open my workspace** if the welcome gate appears. Open **Agent** and verify that its read-only status loads without CORS or `Origin not allowed` errors. Do not queue work or change settings.
4. If Agent STATUS still fails, inspect only the local server's generic status/error response; do not log request headers, tokens, or key values. The proxy (`proxyLocalAgentStatus` in `scripts/local-supabase-config.mjs`) forwards only `{ action: "STATUS" }` server-side with `Origin: https://applyflow-review.gbeminiyiprecious721.chatgpt.site` (matching `APPLYFLOW_APP_ORIGIN` in `backend/application-agent.js`). This is unit-tested (`tests/local-supabase-config.test.mjs`, passing) but the live call still needs a human to confirm it against the real Supabase project.

## Known Limits And Unverified Work

- Live Agent STATUS against the real Supabase project still needs a human to enter the public key in the browser (see Exact Next Action). The Origin-forwarding fix is unit-tested and the proxy code was re-read and confirmed correct on 2026-10-17; the browser-side live confirmation is the only remaining step.
- Local preview is intentionally read-only. The save warning is now accurate; actual database writes were not enabled or tested here.
- Live Supabase RLS, private storage isolation, write persistence, staging isolation, and multi-account isolation remain unverified. Use a separate staging Supabase project and disposable accounts before testing writes.
- The two staging-isolation Playwright cases were skipped because no staging target was configured.
- External employer, job-provider, Browserbase, email, and AI operations were not run. Do not contact employers or submit applications.
- The Agent backend/provider may still be unavailable; no provider operation was attempted.
- The current branch is still 5 commits ahead of `origin/main` (unpushed) as of 2026-10-17; `gh run list` shows no Actions runs for these commits yet because they haven't reached GitHub. `gh auth status` confirms the CLI is authenticated as `gbeminiyiprecious721-cmd`. Push only with explicit user approval.
- MCP status re-checked 2026-10-17 via `claude mcp list` (this is now a Claude Code session, not Codex): project-scoped `openaiDeveloperDocs` and `context7` (from `.mcp.json`) are **Connected** and usable. Project-scoped `figma` and `vercel` still need authentication — run `claude mcp login figma` / `claude mcp login vercel` to use them for this project. Separate account-level claude.ai connectors (Vercel, Figma, Slack, Notion, Google Drive, Gmail) are already connected; claude.ai Canva and Firecrawl need authentication. No credentials were requested, read, or copied to check this.
- On this machine, the `pdftotext` resolved by a plain Bash/mingw64 shell is an old Xpdf-derived build (`Copyright 1996-2017 Glyph & Cog, LLC`) that mangles Unicode/diacritics and fails `tests/pdf.test.cjs`. A real Poppler 26.02.0 build exists earlier in the user's PowerShell `PATH` and is what `npm test` should use — run tests from PowerShell, not the Bash tool, on this machine, or otherwise ensure the Poppler `pdftotext` resolves first. This is an environment PATH-ordering issue, not an application bug.

## Commands And Prerequisites

Requires Node.js 22+, npm, and Poppler (`pdftotext`) on PATH for the PDF suite. Playwright Chromium and Microsoft Edge were installed on this machine.

```powershell
npm ci
npm test
npm run build
$env:E2E_BASE_URL = "http://127.0.0.1:4174"
npm run test:e2e
```

The normal local preview binds to 127.0.0.1:4173:

```powershell
scripts\Start-ApplyFlow-Local.ps1
```

The local preview's key is memory-only. Restarting the script requires re-entering it in the masked browser form. Playwright runs use an isolated fixture adapter; they do not prove live Supabase behavior.

## Process State

As of this 2026-10-17 Claude Code session, the local preview server (`node tests/e2e/server.mjs`, `APPLYFLOW_LOCAL_SETUP=1`) is running in the background on `http://127.0.0.1:4173`, confirmed with an HTTP 200 response. Stop it with Ctrl+C in its terminal (or end the background task) before running `npm run test:e2e`, which starts/stops its own fixture server and would otherwise conflict on the same port.

## Verification Record

Latest complete local verification: 2026-10-17 (Claude Code, independent re-run of the 2026-10-16 record).

- **Passed:** `npm test` — all 12 suites, run from PowerShell (see Poppler PATH note above; the same run failed under a plain Bash shell on this machine solely due to PATH order, not a code defect).
- **Passed:** `npm run build` (33 static assets).
- **Passed:** `npm run test:e2e` on Chromium and Edge: 22 passed, 0 failed.
- **Skipped:** 2 staging isolation cases, once per browser project, because staging variables were absent (expected).
- **Passed:** local preview server starts cleanly and serves HTTP 200 on `127.0.0.1:4173`.
- **Confirmed by code review:** `proxyLocalAgentStatus` sets the `Origin` header required by `backend/application-agent.js`; its unit test passes.
- **Unverified:** live Agent STATUS against the real Supabase project (needs a human to enter the key in the browser); live RLS/storage/write checks; staging isolation; hosted GitHub Actions for the current 5 unpushed commits.
- **Failed:** none in this session's runs.

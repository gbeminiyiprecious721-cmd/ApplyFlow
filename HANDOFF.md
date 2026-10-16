# ApplyFlow Handoff

Last updated: 2026-10-17

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

## Exact Next Action

1. In PowerShell from this directory, run `scripts\Start-ApplyFlow-Local.ps1`.
2. Open `http://127.0.0.1:4173` and enter the existing project's public publishable/anon key in the masked setup form. Confirm the project ref `tbggqauyesloekynqavb` in Supabase first. Never use a service-role or secret key; never paste keys into chat.
3. Choose **Open my workspace** if the welcome gate appears. Open **Agent** and verify that its read-only status loads without CORS or `Origin not allowed` errors. Do not queue work or change settings.
4. If Agent STATUS still fails, inspect only the local server's generic status/error response; do not log request headers, tokens, or key values. The latest code proxies only `{ action: "STATUS" }` server-side with the existing app Origin. This live path was not verified after the final Origin-header change.

## Known Limits And Unverified Work

- The last interactive Agent check, before restarting the server, showed `Origin not allowed`. The Origin-forwarding fix is unit-tested, but live Agent STATUS remains unverified. The server was stopped for this handoff, so no stale key remains in its memory.
- Local preview is intentionally read-only. The save warning is now accurate; actual database writes were not enabled or tested here.
- Live Supabase RLS, private storage isolation, write persistence, staging isolation, and multi-account isolation remain unverified. Use a separate staging Supabase project and disposable accounts before testing writes.
- The two staging-isolation Playwright cases were skipped because no staging target was configured.
- External employer, job-provider, Browserbase, email, and AI operations were not run. Do not contact employers or submit applications.
- The Agent backend/provider may still be unavailable; no provider operation was attempted.
- GitHub Actions workflow registration was previously confirmed, but a fresh hosted CI result for the latest local commits was not checked. The current branch has not been pushed after these commits.
- `claude mcp list` recognizes all four `.mcp.json` endpoints, but reports each as **Pending approval**. No Claude MCP call or sign-in has been tested. Start Claude Code in this project and approve the listed servers; complete any Claude-specific OAuth prompts. Do not copy Codex tokens. The MCP file contains only HTTPS URLs and no authentication values.

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

At handoff, no ApplyFlow listener is running. The prior fixture server (PID 42348) on port 4173 was stopped. Port 4174 was the temporary Playwright fixture port and is also stopped. Restart the local preview with `scripts\Start-ApplyFlow-Local.ps1`; the Playwright test runner starts/stops its own fixture server.

## Verification Record

Latest complete local verification: 2026-10-16.

- **Passed:** `npm test` (all unit/regression suites, including local-config and backend mocks).
- **Passed:** `npm run build` (33 static assets).
- **Passed:** `npm run test:e2e` on Chromium and Edge: 22 passed.
- **Skipped:** 2 staging isolation cases, once per browser project, because staging variables were absent.
- **Passed:** focused local key/proxy unit test; project ref validation and non-STATUS action denial.
- **Passed:** `git diff --check`; Git emitted only expected LF/CRLF conversion warnings.
- **Unverified:** live Agent STATUS after the final Origin change; live RLS/storage/write checks; staging isolation; hosted GitHub Actions for the latest commits; Claude-specific MCP sign-in.
- **Failed:** no unresolved failures in the latest complete test runs. Earlier red tests were expected regression-test checks or debugging failures and were fixed before the final runs.

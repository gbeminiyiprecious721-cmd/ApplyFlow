# Continue ApplyFlow in Windows VS Code

Source snapshot: b3b5d45113e972d3388ba477b288065f812216b2. Packaged 2026-10-16. Live review: https://applyflow-review.gbeminiyiprecious721.chatgpt.site

## Open the project

Extract the whole ZIP first, preferably into a new Projects folder with room for dependencies. Do not overwrite an older project. Open the inner ApplyFlow folder containing package.json and AGENTS.md. Double-click Open-ApplyFlow.cmd, or use VS Code > File > Open Folder.

The Work cloud directory is not a path on your laptop. Your local path depends on where you extract this download. Git history, node_modules, credentials and host-specific deployment metadata are not bundled.

## Codex skills and connections

20 project-local skills are in .agents/skills, including Web Design Guidelines, which could not be saved to Work's remote Skills collection. Start a new Codex task in this folder; use /skills or type $ to check the list. If necessary reload VS Code. These skills apply in this project; your global skills and configuration are untouched.

.codex/config.toml declares OpenAI Docs, Context7, Figma and Vercel MCP endpoints. Codex must trust the project to load project configuration. These endpoints have NOT been authenticated or exercised from your laptop. Complete Figma/Vercel/Context7 sign-in locally when requested. If the Codex CLI is installed, run codex mcp list, then codex mcp login figma and codex mcp login vercel; Context7 can require its own login/account limits. No API keys are included or needed for this handoff. Do not paste credentials into chat.

Product Design is a ChatGPT plugin and is not bundled as a Windows MCP server. Its design guidance can be used here through frontend-design and ui-ux-pro-max; use the official plugin listing if Product Design is offered in your Codex installation. The selected Superpowers testing/debugging skills are bundled; the entire plugin is not claimed installed locally.

## Run locally in the VS Code PowerShell terminal

Requires Node.js 22+ and npm. The full PDF test suite also requires Poppler's pdftotext available on PATH; install it using your trusted Windows package source.

```powershell
node --version
npm --version
npm ci
npx playwright install chromium
npm test
npm run build
$env:E2E_BASE_URL = "http://127.0.0.1:4173"
npm run test:e2e
```

The Edge project requires Microsoft Edge installed locally. If unavailable, install Edge through Microsoft's official installer. Browser dependencies and Poppler were not installed on your laptop by this download.

For a static local preview:

```powershell
node tests/e2e/server.mjs
```

Open http://127.0.0.1:4173. This manual preview has no working live login because credentials are omitted. The Playwright suite injects its isolated authentication/data adapter separately; merely starting this server does not enable that adapter in a manual browser. Read TESTING.md for the exact test setup.

## Scope and outstanding verification

Existing testing records describe the earlier Work run: eleven unit/regression suites and eight local Chromium checks passed; Edge, staging signup/RLS/private storage, real extension operation and GitHub Actions remained unverified. This packaging task did not rerun those tests or verify Windows behavior. Verify fresh results locally before claiming completion.

The exported source omits existing browser API credential values to respect the no-key-transfer rule; live authentication/integrations must not be claimed ready. The original cloud project is unchanged. Configuration placeholders are intentional. Do not deploy this snapshot over the live site until local configuration and backend state are independently checked.

Suggested first Codex prompt:

> Read AGENTS.md, WORKSPACE-HANDOFF.md and TESTING.md. Confirm the project path, enumerate available project skills and MCP connections, and run the local checks that prerequisites allow. Report passed, failed and unverified results. Preserve the existing architecture. Do not contact employers, submit applications, deploy changes or create/expose API keys.

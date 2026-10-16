# Claude Code Instructions

Before editing, read these project files in order:

1. `AGENTS.md`
2. `HANDOFF.md`
3. `WORKSPACE-HANDOFF.md`
4. `TESTING.md`

Preserve the existing HTML/JavaScript architecture and onboarding behavior. Check `git status` before editing and preserve all pre-existing changes. Use the project skills in `.claude/skills` when relevant; `.agents/skills` remains the original source collection.

Safety and validation:

- Never contact real employers, submit applications, or run provider operations during testing.
- Do not deploy, alter production, or change the production Supabase project.
- Never create, rotate, print, request in chat, or commit credentials. Do not access service-role or secret keys.
- The local Supabase preview accepts only the existing project's public key through its masked browser form. It keeps that key in process memory and must be restarted/reconfigured after a server restart.
- The local preview is read-only: database/storage writes and agent mutations are blocked. Agent `STATUS` is the only proxied function action. Do not treat local mocked E2E auth as proof of live RLS or storage isolation.
- Use local fixtures or an explicitly designated staging environment. Keep staging tests isolated from production.
- Run `npm test`, `npm run build`, and appropriate Playwright checks after changes. Report passed, failed, skipped, and unverified results separately; never claim complete verification when staging or external integration checks were not run.

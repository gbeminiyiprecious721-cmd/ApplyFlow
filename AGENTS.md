# ApplyFlow development handoff

Read WORKSPACE-HANDOFF.md, TESTING.md and QA.md before changing behavior. Use the relevant project skills in .agents/skills; resolve helper paths from their actual skill directories. Keep the current HTML/JavaScript architecture unless explicitly asked to migrate. Preserve onboarding and existing behavior.

Work in small commits and avoid unrelated refactors. Do not contact real employers or submit applications while testing. Use local fixtures or an explicitly designated staging environment. Do not create, move, print or request API keys. The exported browser credential was intentionally omitted; do not claim live integrations work.

Use npm test, npm run build and appropriate rendered Playwright checks. Report passed, failed, skipped and unverified results separately. Mocked authentication is not proof of live database or storage isolation. Confirm actual tool availability and OAuth before using external connections.

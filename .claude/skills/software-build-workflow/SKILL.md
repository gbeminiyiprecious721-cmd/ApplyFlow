---
name: software-build-workflow
description: Coordinate product design, implementation, debugging and evidence-based verification for software and MVP web apps. Use when building or improving an application, organizing a dashboard or onboarding flow, or carrying a product change through design, implementation and testing.
---

# Software Build Workflow

## Establish the change

Inspect the existing repository, architecture, brand, instructions and current behavior. Identify the user goal, critical flow and observable acceptance criteria. Reuse context; ask only for missing information that materially affects the result. Scale the process to the change. Preserve working behavior and avoid unrelated refactors or framework migrations.

## Select focused skills

Read only the skills relevant to the task; respect their triggering conditions. Use the installed catalog in [references/skill-catalog.md](references/skill-catalog.md) for exact names and source revisions.

| Need | Skills to consider |
| --- | --- |
| Visual direction, layout, typography, interactions | frontend-design, ui-ux-pro-max |
| Interface review and inclusive use | web-design-guidelines, accessibility |
| React or Next.js implementation and reusable APIs | vercel-react-best-practices, vercel-composition-patterns; only for existing React/Next.js code |
| Bug investigation | systematic-debugging |
| Meaningful behavioral regression coverage | test-driven-development, webapp-testing; follow platform guidance on proportional testing |
| Completion claims | verification-before-completion |
| Requested security review or threat model | security-best-practices, security-threat-model, differential-review, according to their scopes |
| Performance or broader quality audit | performance, core-web-vitals, best-practices, web-quality-audit |
| Public-page discoverability | seo; avoid applying public indexing advice to private dashboards |
| Failing GitHub Actions checks | gh-fix-ci |

Use connected Product Design for journey audits and design exploration, Figma for design files and implementation references, and Context7 for current library documentation when relevant. Reuse Sites, Supabase, browser and provider-specific capabilities where appropriate. Check the current available tools and authentication; skill installation does not authenticate or provision services. Keep the current hosting unless the task calls for a change.

Resolve bundled resources relative to each installed skill's actual directory. Adapt upstream tool names and example paths to the environment; do not install another agent runtime just because an example mentions it. Follow user and platform instructions when they differ from an upstream workflow.

## Implement and verify

1. Organize each screen around one primary task, clear navigation and understandable form sections. Cover loading, empty, error and success states. Preserve established visual language unless a redesign is requested.
2. Check keyboard access, focus, labels, contrast, responsive layout, dark mode where supported, and reduced-motion preferences. Use animation to clarify state changes without blocking tasks.
3. Keep changes reviewable and commits small. For application behavior, inspect server authorization and ownership boundaries, private storage, validation, Unicode handling and retry limits where affected. Never create, move or expose keys unless explicitly authorized.
4. Reproduce bugs before fixing them. Run appropriate existing checks and add meaningful regression coverage for risky behavior. Use a rendered browser for interactions and visual assertions; distinguish it from DOM emulation, mocks and static checks. Do not write tests that merely repeat implementation details.
5. For ApplyFlow, use local/staging fixtures and disposable test accounts. Do not contact real employers or submit applications during testing without explicit authorization. Verify provider failures without incurring live requests where practical.
6. Run relevant checks after the final change and inspect results. Verify deployment separately from local behavior. Report passed, failed, skipped and unverified behavior accurately; do not imply exhaustive coverage or claim certainty from installation, mocks or unexecuted tests.

Finish with what changed, the observed verification results, and material limits. Complete authorized work without inventing new approval gates.

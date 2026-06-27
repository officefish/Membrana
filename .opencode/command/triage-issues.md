---
description: Triage GitHub issues via the audit manifest (yarn issues:audit)
agent: build
---

Triage open GitHub issues for Membrana.

1. Generate/update the manifest `docs/issues/manifests/github-issues-audit-<YYYY-MM-DD>.json` per `docs/prompts/GITHUB_ISSUES_AUDIT_PROMPT.md`.
2. Run read-only audit: `yarn issues:audit --manifest <path>` and review the proposed actions.
3. Preview applying: `yarn issues:audit:apply --manifest <path> --dry-run`.
4. Apply (requires authenticated `gh`): `yarn issues:audit:apply --manifest <path>`.
5. Each close must have a reason recorded in the manifest.

Skill: `membrana-issue-triage`. Do NOT use this to close a registry task — use `/close-task`.

$ARGUMENTS

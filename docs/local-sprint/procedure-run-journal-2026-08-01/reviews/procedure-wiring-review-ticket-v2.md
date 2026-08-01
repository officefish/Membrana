# Vesnin Review Brief: procedure-wiring-review

Persona: vesnin
Block: procedure-wiring-review
Plan: `docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json`
Ratified v2: `2026-08-01T09:53:55+03:00`

## Task

Review whether the procedure wiring is real and single-home:

- `membrana-local-sprint` is the only active local sprint skill/procedure name.
- Old `honest-sprint` wording is normalized as a historical route only.
- Cross-agent skill mirrors delegate to the `.cursor` canon instead of duplicating
  procedure logic.
- `docs/procedures/membrana-local-sprint/MANIFEST.json` lists concrete engines.
- The task registry accepts `sprintKind: "membrana-local-sprint"`.

## Files Seen

- `docs/procedures/membrana-local-sprint/README.md`
- `docs/procedures/membrana-local-sprint/MANIFEST.json`
- `.cursor/skills/membrana-local-sprint/SKILL.md`
- `.agents/skills/membrana-local-sprint/SKILL.md`
- `.claude/skills/membrana-local-sprint/SKILL.md`
- `.opencode/skills/membrana-local-sprint/SKILL.md`
- `.cursor/skills/README.md`
- `docs/LOCAL_SPRINT_ACTIVE.md`
- `docs/LOCAL_SPRINT_LOG.md`
- `docs/local-sprint/procedure-run-journal-2026-08-01/OPEN.md`
- `docs/local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md`
- `scripts/task-start.mjs`
- `scripts/task-register.mjs`
- `scripts/archive-task.mjs`
- `scripts/task-close-github-issues.mjs`
- `scripts/sprint-cut-check.mjs`
- `scripts/execution-gate.mjs`
- `scripts/sprint-experience.mjs`
- `scripts/procedure-run-journal.mjs`
- `scripts/lib/task-registry.mjs`

## Expected Verdict

Return `LGTM` only if the files above are enough to prove wiring, not just prose.
Return `BLOCK` with exact missing carriers otherwise.

# Ozhegov Review Brief: registry-terminology-review

Persona: ozhegov
Block: registry-terminology-review
Plan: `docs/sprint/cut/procedure-run-journal-2026-08-01-code-review.json`

## Task

Review terminology and registry wiring:

- The active sprint kind is `membrana-local-sprint`.
- `honest-sprint` is not left as a competing active sprint.
- `procedure-run:journal` is registered in `package.json`.
- Task registry entries and generated `docs/tasks/README.md` agree.
- `tasks-decompose` places procedure-run work in the procedure/container bucket.
- Kit manifests were updated for the changed registry helper.

## Files Seen

- `scripts/lib/task-registry.mjs`
- `scripts/tasks-decompose.config.json`
- `docs/tasks/registry.json`
- `docs/tasks/README.md`
- `package.json`
- `docs/prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`
- `docs/prompts/PROCEDURE_RUN_JOURNAL_F1_LOCAL_TRAIL_PROMPT.md`
- `kits/angelina-morning/MANIFEST.json`
- `kits/containerization-master/MANIFEST.json`
- `kits/tasks-master/MANIFEST.json`

## Expected Verdict

Return `LGTM` only if terminology is single-canon and generated projections are
fresh. Return `BLOCK` with exact stale or competing names otherwise.

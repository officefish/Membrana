## Summary

Ввести слой `docs/actions/` для долгоживущих процессов (регламенты, smoke, lessons, cookbooks, LGTM) и вынести MD из `docs/device-board-scripts/`. JSON/fixtures остаются на месте.

## Task prompt

- `docs/prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md`
- Registry: `docs-actions-phase-a-2026-06-26` (phases `da-a0` … `da-a6`)
- Tracker: `docs/day-sprint/docs-actions-phase-a-2026-06-26/OPEN.md`

## Acceptance criteria

1. `docs/actions/device-board/` содержит 13 MD-процессов по матрице переноса.
2. JSON/fixtures остаются в `docs/device-board-scripts/`; `node scripts/usercase.mjs verify-paths` green.
3. Redirect-stubs на старых MD-путях (удаление не раньше 2026-07-26).
4. Skills, `.cursorrules`, `AGENTS.md` указывают на новые пути.
5. RAG incremental index выполнен или defer documented в archive card.

## Out of scope

- Rename fixtures root (фаза B)
- Runtime / core / vesnin changes

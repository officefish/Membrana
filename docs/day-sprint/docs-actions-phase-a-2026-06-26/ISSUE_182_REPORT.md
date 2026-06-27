# Issue #182 — closing report (paste into GitHub)

**Phase A complete.** MD-процессы device-board вынесены в `docs/actions/device-board/`; JSON/fixtures и CI не тронуты.

## Acceptance criteria

- [x] **AC1** — `docs/actions/device-board/` содержит 13 MD-процессов по матрице переноса.
- [x] **AC2** — JSON/fixtures остаются в `docs/device-board-scripts/`; `node scripts/usercase.mjs verify-paths` → green (55 paths).
- [x] **AC3** — 13 redirect-stubs на старых MD-путях (удаление не раньше 2026-07-26).
- [x] **AC4** — `.cursorrules` #11, `AGENTS.md`, skills (`membrana-usercase-generation`, `membrana-client-logs-parsing`) указывают на новые пути.
- [x] **AC5** — RAG incremental index **deferred** (post-merge local step, D-ACT-7) — documented в A5 archive card + CLOSURE.md.

## Verification

```
verify-paths        → OK (55 paths)
verify-competition  → green
13 MD in actions     · 13 stubs · grep audit clean (только README hub + migration script)
```

## Closure

- Phases `da-a0` … `da-a6` + parent archived (`docs/tasks/registry.json`, карточки в `docs/tasks/archive/`).
- Tracker: `docs/day-sprint/docs-actions-phase-a-2026-06-26/CLOSURE.md` (Teamlead LGTM).

## Post-merge TODO

- `yarn rag:index` + `yarn rag:query "USERCASE_GENERATION_REGULATION"` (A5).
- Удалить redirect-stubs не раньше **2026-07-26**.

Prompt: `docs/prompts/DOCS_ACTIONS_PHASE_A_SPRINT_PROMPT.md`

Closes #182

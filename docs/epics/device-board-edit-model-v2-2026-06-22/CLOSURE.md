# Epic closure — device-board-edit-model-v2-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `device-board-edit-model-v2-2026-06-22` |
| **Kind** | L epic |
| **Opened** | 2026-06-22 |
| **Closed** | 2026-06-22 |
| **Verdict** | **shipped** — PR [#140](https://github.com/officefish/Membrana/pull/140) (Teamlead review) |

## Phases

| Phase | Task id | Status | Deliverable |
|-------|---------|--------|-------------|
| E1 | `db-edit-v2-nav-contract` | **done** | `branch-navigation.ts`, `navigateScenarioBranch`, `ScenarioRevertPolicy` |
| E2 | `db-edit-v2-extract-modules` | **done** | `edit-undo-controller.ts`, `useEditUndoController` |
| E3 | `db-edit-v2-nav-integration-tests` | **done** | `device-board-nav.integration.test.tsx` (5 scenarios) |

**Package:** `@membrana/device-board` · **422 tests** green.

## Shipped highlights

- Единый API навигации веток с явной политикой F7-revert vs keep-dirty.
- Undo depth=1 вынесен из god-context; публичный API контекста сохранён.
- Integration tests на матрицу dirty/fn/collapse/undo forget.

## Follow-up

| Topic | Sprint |
|-------|--------|
| Документация board UX | `device-board-docs-post-140-sprint-2026-06-22` |
| Scoped undo (D2), drag undo (D3) | backlog |

## Prompt

[`DEVICE_BOARD_EDIT_MODEL_V2_EPIC_PROMPT.md`](../../prompts/DEVICE_BOARD_EDIT_MODEL_V2_EPIC_PROMPT.md) — **closed**.

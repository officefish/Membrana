# Epic open — device-board-edit-model-v2-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `device-board-edit-model-v2-2026-06-22` |
| **Kind** | L epic (не day-sprint) |
| **Opened** | 2026-06-22 |
| **Status** | **open** |
| **Predecessor** | PR #140 · `device-board-ui-followup-sprint-2026-06-22` |

## Goal

Стабилизировать модель edit/navigation после follow-up sprint: единый контракт навигации, декомпозиция god-context, integration tests.

## Phases

| Phase | Task id | Size | Focus |
|-------|---------|------|-------|
| E1 | `db-edit-v2-nav-contract` | M | `RevertPolicy` + `navigateScenarioBranch` — **done** |
| E2 | `db-edit-v2-extract-modules` | L | `edit-undo-controller.ts`, context slim — **done** |
| E3 | `db-edit-v2-nav-integration-tests` | M | RTL matrix dirty/fn/collapse — **done** |

**Prompt:** [`DEVICE_BOARD_EDIT_MODEL_V2_EPIC_PROMPT.md`](../../prompts/DEVICE_BOARD_EDIT_MODEL_V2_EPIC_PROMPT.md)

## Out of scope

Scoped undo (D2), drag undo (D3), GetServer (D6) — отдельные эпики.

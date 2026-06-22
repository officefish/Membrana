# CURRENT_TASK — device-board edit model v2

> **Epic:** `device-board-edit-model-v2-2026-06-22` (E1–E3 code complete — archive pending)  
> **Open brief:** [`epics/device-board-edit-model-v2-2026-06-22/OPEN.md`](./epics/device-board-edit-model-v2-2026-06-22/OPEN.md)  
> **Промпт:** [`DEVICE_BOARD_EDIT_MODEL_V2_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_EDIT_MODEL_V2_EPIC_PROMPT.md)  
> **Предшественник:** PR [#140](https://github.com/officefish/Membrana/pull/140) (follow-up F1–F7)

## Статус

Все фазы E1–E3 реализованы локально. Следующий шаг: `yarn task:archive` по фазам + PR.

## Завершено

| Phase | Id | Deliverable |
|-------|-----|-------------|
| E1 | `db-edit-v2-nav-contract` | `branch-navigation.ts`, `navigateScenarioBranch` |
| E2 | `db-edit-v2-extract-modules` | `edit-undo-controller.ts`, `useEditUndoController` |
| E3 | `db-edit-v2-nav-integration-tests` | `device-board-nav.integration.test.tsx` (5 сценариев) |

## Out of scope эпика

Scoped undo (D2), drag undo (D3), GetServer (D6), dirty confirm modal (D9).

## Закрытый спринт

`device-board-ui-followup-sprint-2026-06-22` — PR #140.

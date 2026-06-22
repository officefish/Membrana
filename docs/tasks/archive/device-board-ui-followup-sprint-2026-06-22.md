# Архив: Day sprint: device-board UX follow-up (consilium backlog)

| Поле | Значение |
|------|----------|
| **ID** | `device-board-ui-followup-sprint-2026-06-22` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-22 |
| **Архивирована** | 2026-06-22 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md) |

## Заметки при закрытии

F1-F7 local; 410 tests; PR pending

## Отчёт о выполнении

- **F6:** `device-global-node.ts`, `event-node.ts` — GetDevice deletable, Event locked.
- **F7:** `device-board-graph-context.tsx` — `savedDocumentRef`, `revertToSavedDocumentIfDirty`.
- **F3:** `edit-undo-snapshot.ts`, `edit-step-log.ts`, `board-edit-undo-control.tsx`, shell keydown + forget on branch/function nav.
- **F1:** `board-canvas-breadcrumb.tsx`, shell header.
- **F2:** `handleUserFunctionListClick` direct path on `function` branch.
- **F4:** `board-function-pin-inspector.tsx` — `n/9` meter.
- **F5:** `runtime-exec-highlight.ts`, `board-flow-canvas` overlay.
- **CI:** `yarn workspace @membrana/device-board test` — 410 passed.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

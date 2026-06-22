# Day sprint closure — device-board-function-modal-sprint-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `device-board-function-modal-sprint-2026-06-22` |
| **Kind** | day-sprint |
| **Opened** | 2026-06-22 |
| **Closed** | 2026-06-22 |
| **Verdict** | **shipped** |

## Phases

| Phase | Task id | Status | Deliverable |
|-------|---------|--------|-------------|
| S1 | `db-fn-modal-s1-ui` | **done** | PR [#139](https://github.com/officefish/Membrana/pull/139) squash-merged to `main` |

## Shipped (S1)

- `BoardFunctionActionModal` — edit / insert subgraph on scenario branches
- Delete user function (sidebar + inspector)
- Sidebar «Пользовательские функции» always visible; removed «Конструктор функций» tab
- Pin inspector for `function-input` / `function-output`; exec pins protected; `+ data` only
- `socketTypeIndicatorClass` on pin rows; runtime interface indicators on left sidebar
- `viewportFitKey` + auto-fit on branch/function switch
- MiniMap bottom-center; pane click / empty marquee deselects nodes

**Package:** `@membrana/device-board` only (21 files).

## Consilium follow-up (deferred)

Перенесено в эпик **`device-board-ui-followup-sprint-2026-06-22`** — см. [`DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md).

| Role | Proposal | Next phase |
|------|----------|------------|
| Vesnin | Breadcrumbs в header canvas (`Сценарий › main` / `Функция › Name`) | F1 |
| Rodchenko | Прямое редактирование по клику в списке функций (без modal, если уже на `function`) | F2 |
| Ozhegov | Undo удаления функции/pin (toast + 5s) | F3 |
| Dynin | Индикатор лимита pins `3/8` | F4 |
| Musician | Runtime exec-chain visual emphasis | F5 |

## Notes

- Sprint tooling (`yarn sprint:*`) не был на `main` на момент закрытия; closure зафиксирован документами + реестром.
- Промпт S1: [`DEVICE_BOARD_FUNCTION_MODAL_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_FUNCTION_MODAL_SPRINT_PROMPT.md) (ретроспектива).

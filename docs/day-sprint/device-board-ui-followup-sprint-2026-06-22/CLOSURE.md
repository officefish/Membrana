# Day sprint closure — device-board-ui-followup-sprint-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `device-board-ui-followup-sprint-2026-06-22` |
| **Kind** | day-sprint |
| **Opened** | 2026-06-22 |
| **Closed** | 2026-06-22 |
| **Verdict** | **shipped (local)** — PR pending |

## Phases

| Phase | Task id | Status | Deliverable |
|-------|---------|--------|-------------|
| F6 | `db-ui-f6-global-getter-deletable` | **done** | GetDevice deletable; Event locked |
| F7 | `db-ui-f7-branch-snapshot-restore` | **done** | `savedDocumentRef` + revert on branch switch when dirty |
| F3 | `db-ui-f3-undo-ctrl-z` | **done** | Depth-1 undo: Ctrl+Z, canvas button, INFO edit logs |
| F1 | `db-ui-f1-context-breadcrumbs` | **done** | Header breadcrumbs (`BoardCanvasBreadcrumb`) |
| F2 | `db-ui-f2-direct-function-edit` | **done** | Function list → editor без modal на `function` branch |
| F4 | `db-ui-f4-pin-limit-meter` | **done** | `n/9` progress per Input/Output |
| F5 | `db-ui-f5-runtime-exec-highlight` | **done** | Exec path highlight при Run |

**Package:** `@membrana/device-board` · **410 tests** green.

## Shipped highlights

### F6 — Global getters
- `device-global` / palette: `deletable` не блокируется; Event остаётся в `isLockedBoardNode`.

### F7 — Branch snapshot
- `savedDocumentRef` + `revertToSavedDocumentIfDirty()` на `setScenarioBranch` и Signal layer.

### F3 — Undo (расширено в сессии)
- Снимок перед delete / pins / collapse / align / clear branch.
- Кнопка ↶ в левом нижнем углу видимого канваса; **Ctrl+Z** / **Cmd+Z**.
- INFO-логи: `device-board edit: capture|undo|clear` (`edit-step-log.ts`).
- **Сброс pending undo** при смене обработчика (`switch-handler-branch`), функции (`switch-function`), выходе из тела функции / слоя Signal.
- **Не в scope:** откат свободного drag узла (осознанный v1).

### F1 / F2 / F4 / F5 — UI polish
- Breadcrumbs в header; direct function edit; pin meter; runtime exec overlay.

## Deferred / follow-up

| Topic | Notes |
|-------|--------|
| PR merge | Код локально; нужен PR в `main` |
| Undo drag | По решению Teamlead — отдельная фаза |
| GetServer `server-global` | Контракт как F6; может потребовать `vesnin` |
| Full undo/redo stack | Out of scope эпика |

## Prompt

[`DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md) — **closed** (ретроспектива).

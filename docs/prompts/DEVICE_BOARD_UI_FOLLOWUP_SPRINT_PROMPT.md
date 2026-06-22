# Промпт (day sprint · closed): Device-Board — UX follow-up после user functions

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** эпик **`device-board-ui-followup-sprint-2026-06-22`** (archived 2026-06-22)  
> **Предшественник:** PR [#139](https://github.com/officefish/Membrana/pull/139) · closed sprint [`DEVICE_BOARD_FUNCTION_MODAL_SPRINT_PROMPT.md`](./DEVICE_BOARD_FUNCTION_MODAL_SPRINT_PROMPT.md)  
> **Статус:** **closed** — closure [`CLOSURE.md`](../day-sprint/device-board-ui-followup-sprint-2026-06-22/CLOSURE.md) · PR pending  
> **Пакет:** `@membrana/device-board` only (без `core` / `vesnin`, кроме будущего `server-global`)

---

## Контекст

S1 sprint доставил modal, pins, viewport, minimap. Дальше — полировка UX и **модель отката** редактирования сценария без полноценного undo/redo стека.

---

## Product decisions

### Consilium follow-up (UI)

| ID | Роль | Решение |
|----|------|---------|
| **F1-CTX** | Vesnin | Breadcrumbs в header canvas: `Сценарий › {branch}` / `Функция › {name}` |
| **F2-EDIT** | Rodchenko | Клик по функции в списке → сразу editor, **без** modal, если уже на ветке `function` |
| **F4-LIMIT** | Dynin | Индикатор лимита pins: `{n}/9` рядом с Input/Output |
| **F5-EXEC** | Musician | При Run — визуальный accent на активной exec-цепочке (runtime overlay) |

### Дополнения Teamlead (модель графа и отката)

| ID | Решение |
|----|---------|
| **D-GLOBAL-GETTER** | **GetDevice** (`device-global`) и **GetServer** (`server-global`, когда появится) — **удаляемые** узлы сценария. Это экземпляры ссылок на те же runtime-объекты, что и выходы Event-узлов; удаление узла **не уничтожает** DeviceRef/ServerRef в рантайме. **Event-узлы** остаются locked (`deletable:false`). |
| **D-UNDO-1** | Откат **на один шаг** назад по последнему graph/edit действию; горячая клавиша **`Ctrl+Z`** (Win/Linux) / **`Cmd+Z`** (macOS). Не полный redo stack. |
| **D-BRANCH-SNAPSHOT** | Пока сценарий **не сохранён** (`isDirty`): переключение на другой обработчик и возврат **восстанавливает весь document** до последнего сохранённого снимка (`save` / load baseline). Навигация между вкладками = «мягкий сброс» на несколько шагов без многократного Ctrl+Z. |

**Текущий код (as-is):** `device-global` помечен `deletable:false`, `system:true`, блокируется `isLockedBoardNode` / `rejectSystemNodeRemovals`. `savedSnapshotRef` хранит только fingerprint — для D-BRANCH-SNAPSHOT нужен полный `DeviceScenarioDocument` baseline.

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **F6** | `db-ui-f6-global-getter-deletable` | S | GetDevice удаляем с canvas; runtime resolve без узла (как сейчас из loop context); Event locked; GetServer — тот же контракт при появлении `server-global` |
| **F7** | `db-ui-f7-branch-snapshot-restore` | M | `savedDocumentRef` + при `setScenarioBranch` / возврате на ветку: если dirty → `hydrateBoardFromDocument(saved)`; `isDirty=false`; optional confirm если были несохранённые правки |
| **F3** | `db-ui-f3-undo-ctrl-z` | M | Стек глубины 1: snapshot перед mutating op; `Ctrl+Z`/`Cmd+Z` restore; не перехватывать фокус в input/textarea |
| **F1** | `db-ui-f1-context-breadcrumbs` | S | Header: branch + optional function name |
| **F2** | `db-ui-f2-direct-function-edit` | S | List click → editor без modal на `function` branch |
| **F4** | `db-ui-f4-pin-limit-meter` | S | Badge `n/9` per Input/Output side |
| **F5** | `db-ui-f5-runtime-exec-highlight` | S | Exec highlight during run |

**Рекомендуемый порядок:** **F6 → F7 → F3 → F1 → F2 → F4 → F5** (сначала модель отката и deletable getters, потом UI polish).

---

## Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Graph | `device-global-node.ts`, `palette-node.ts`, `event-node.ts` | F6: снять lock с global getters; Event остаётся в `isLockedBoardNode` |
| Context | `device-board-graph-context.tsx` | F7: `savedDocumentRef`, `revertToSavedDocument()`; F3: `undoStackDepth1` |
| Shell | `device-board-shell.tsx` | F7: hook `handleSelectBranch`; F3: `keydown` Ctrl+Z; F1 breadcrumbs |
| Sidebars | `board-function-list.tsx` | F2 |
| Canvas | `board-flow-canvas.tsx` | F5 |

### D-GLOBAL-GETTER — детали

- `createDeviceGlobalBoardNode`: `deletable: true` (или omit), `system: true` допустим как маркер palette, но **не** участвует в `isLockedBoardNode` unless `deletable === false`.
- `syncDeviceGlobalNodePins` не форсирует `deletable: false`.
- `rejectSystemNodeRemovals` — только Event / loop-repeat / явный `deletable:false`.
- Runtime: `resolveGlobalDeviceReference(context.deviceHandle)` уже не зависит от наличия узла на графе.
- **GetServer:** аналог `device-global` для `ServerRef` (если node kind ещё нет — подзадача в F6 или отдельный PR в `vesnin`).

### D-UNDO-1 — детали

- Перед: delete node, delete function, add/remove pin, collapse, align batch, clear branch (опционально — только destructive).
- После Ctrl+Z: восстановить предыдущий graph+variables snapshot в памяти; **не** писать на диск; `isDirty` пересчитать.
- Toast «Отменить» после delete — **не нужен**, если есть Ctrl+Z (можно оставить как hint один раз).

### D-BRANCH-SNAPSHOT — детали

- На `saveScenario` / load / UserCase apply: сохранять `structuredClone(document)` в ref.
- На switch branch (initial, onConnect, main, alarm, onStop, onDisconnect, function): если fingerprint ≠ saved → revert document, затем switch.
- Signal layer — отдельно (out of scope v1 или тот же dirty flag на весь board).
- Не путать с F3: branch restore = baseline save; Ctrl+Z = один шаг внутри текущей сессии редактирования **до** следующего save.

---

## Out of scope

- Полноценный undo/redo stack (depth > 1, redo Ctrl+Y)
- Nested functions, expand inline
- Изменение лимита 9 pins (только отображение F4)
- Persist undo в document / server

---

## Definition of Done (эпик)

- [ ] F1–F7 archived в реестре
- [ ] `yarn workspace @membrana/device-board test` green
- [ ] Ручная проверка: delete GetDevice, Ctrl+Z после delete, branch switch без save → restore
- [ ] `DAY_SPRINT_ACTIVE.md` → closed; запись в `DAY_SPRINT_LOG.md`

---

## Virtual team (кратко)

```text
[Vesnin]: F6 — Event locked, getters deletable; D-BRANCH-SNAPSHOT в setScenarioBranch.
[Структурщик]: F7 — savedDocumentRef рядом с fingerprint; hydrateBoardFromDocument на revert.
[Ozhegov]: F3 — depth-1 stack; guard input/textarea; Ctrl+Z в shell.
[Rodchenko]: F2 — modal guard по activeBranch.
[Dynin]: F4 — n/9 from pins array length.
[Musician]: F5 — exec-only highlight at runtime.
```

# Промпт (эпик): Device-board W0 hotfixes — polish из редактирования

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`device-board-w0-hotfix`** · размер **M** (3 подзадачи)  
> **GitHub Issue:** [#151](https://github.com/officefish/Membrana/issues/151)  
> **Волна:** **W0** (до MVP UserCase W1)  
> **Статус:** **active** · intake 2026-06-23

---

## Контекст

Оператор редактирует сценарий на device-board; в процессе W0-polish обнаружены **блокирующие UX-дефекты** в редакторе пользовательских функций и workflow copy/paste. Эпик — зонтик для **S/M hotfix PR**, без расширения DBR v0.4 или UCV2.

**Пакеты:** `@membrana/device-board` only (без `apps/cabinet`, без `@membrana/core` без ветки `vesnin`).

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Marquee, undo, function branch |
| [`DESIGN.md`](../DESIGN.md) | DaisyUI modal/sidebar |
| [`USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md`](./USERCASE_MVP_V2_GROUPS_ASYNC_EPIC_PROMPT.md) | W1 next — не блокировать |

**Ветка:** `rodchenko` · **Lead:** Rodchenko · **Support:** Ozhegov

---

## Подзадачи (порядок merge)

| ID | Реестр | Issue | Содержание | Size | Lead |
|----|--------|-------|------------|------|------|
| **W0-H3** | `db-w0-h3-selection-modal-keep` | [#153](https://github.com/officefish/Membrana/issues/153) | Закрытие модалки marquee-selection **без** сброса выделения | S | Rodchenko |
| **W0-H1** | `db-w0-h1-function-palette` | [#146](https://github.com/officefish/Membrana/issues/146) | Палитра нод в редакторе пользовательских функций | S | Rodchenko |
| **W0-H2** | `db-w0-h2-copy-paste-hotkeys` | [#152](https://github.com/officefish/Membrana/issues/152) | **Ctrl+C / Ctrl+V** copy-paste узлов | M | Rodchenko |

**Зависимости:** H3 перед H2 (copy workflow после dismiss модалки). H1 независим от H3.

---

## W0-H3 — Selection modal dismiss keeps selection

### Проблема

`dismissSelectionAction` в `device-board-shell.tsx` вызывает `clearCanvasNodeSelection()` и `setMarqueeSelectedIds([])`. Backdrop / «Отмена» / Escape снимают выделение.

### Целевое

- Dismiss без действия → `closeSelectionActionModal` (modal закрыт, selection сохранён).
- Collapse / align → текущий сброс selection допустим.

### DoD

- [ ] Backdrop, «Отмена», Escape — nodes still selected.
- [ ] Collapse function/group без регрессии.
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/device-board` green.

---

## W0-H1 — Function branch node palette

### Проблема

На ветке `function` при `selectedNodeId === null` правый сайдбар показывает `BoardFunctionPinInspector` вместо палитры — нельзя добавить ноды в тело функции.

### Целевое (`board-right-sidebar.tsx`)

- Нет selection → **палитра нод** (как на `initial` / `main`).
- Selection `function-input` / `function-output` → pin inspector.
- Обычный узел → node inspector.

### DoD

- [ ] Drag/add из палитры на ветке `function`.
- [ ] Pin inspector только на function I/O nodes.
- [ ] Tests green.

---

## W0-H2 — Ctrl+C / Ctrl+V

### Проблема

Нет стандартных hotkeys copy/paste для узлов на канвасе (есть только Ctrl+Z depth-1 undo).

### Целевое

- **Ctrl+C** / **Cmd+C**: subgraph выделенных узлов + internal edges → clipboard buffer (in-memory или structured clipboard).
- **Ctrl+V** / **Cmd+V**: вставка со смещением, новые ids, selection на вставленных.
- Не перехватывать в `input` / `textarea`.
- Read-only session: copy OK, paste blocked.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Graph | `graph/copy-paste-nodes.ts` (new) | Serialize/deserialize node subset |
| Context | `device-board-graph-context.tsx` | `copySelection`, `pasteClipboard` |
| Shell | `device-board-shell.tsx` | `keydown` Ctrl+C/V; integrate undo snapshot on paste |

### DoD

- [ ] Single + multi node copy/paste.
- [ ] External edges не дублируются автоматически.
- [ ] Ctrl+Z после paste (depth-1) если snapshot hook уже есть.
- [ ] Tests + manual smoke.

---

## Out of scope

- Full undo/redo stack, undo free drag.
- `apps/cabinet`, `background-*`.
- DBR v0.4 контракты в `core`.

---

## Definition of Done (эпик)

- [ ] #146, #152, #153 closed.
- [ ] `yarn task:archive` для всех четырёх id реестра.
- [ ] W1 UserCase не блокируется оставшимися W0-дефектами редактора.

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Реализуй **W0-H3 → W0-H1 → W0-H2** в `@membrana/device-board`. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md). Каждая подзадача — отдельный PR с `Closes #N`. Не трогай `core` без `vesnin`. После merge — `yarn task:archive <subtask-id>`.

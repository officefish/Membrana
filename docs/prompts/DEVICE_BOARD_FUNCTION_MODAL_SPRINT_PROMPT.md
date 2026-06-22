# Промпт (day sprint · closed): Device-Board — user functions UX S1

> **Task-промпт (ретроспектива)** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** эпик **`device-board-function-modal-sprint-2026-06-22`**, фаза **`db-fn-modal-s1-ui`** — **archived**  
> **Статус:** закрыт 2026-06-22 · PR [#139](https://github.com/officefish/Membrana/pull/139)  
> **Closure:** [`day-sprint/device-board-function-modal-sprint-2026-06-22/CLOSURE.md`](../day-sprint/device-board-function-modal-sprint-2026-06-22/CLOSURE.md)

---

## Контекст

После эпика canvas groups / user functions (PR #134) оператору не хватало: редактора тела функции, pin inspector, удаления функций, авто-fit viewport при смене ветки.

Day-sprint 2026-06-22 — одна фаза S1, scope только `@membrana/device-board`.

---

## Delivered (S1)

1. **Function action modal** — edit / insert subgraph на 6 ветках сценария.
2. **Delete user function** — sidebar + inspector (`removeUserFunction`).
3. **Sidebar** — always-visible список «Пользовательские функции»; убрана вкладка «Конструктор функций».
4. **Pin inspector** — таблицы для `function-input` / `function-output`; exec pins защищены; добавление только `+ data`.
5. **Type indicators** — `socketTypeIndicatorClass` на pin rows; runtime indicators в left sidebar.
6. **Viewport** — `viewportFitKey`, fit при смене branch/function.
7. **MiniMap** — bottom-center CSS.
8. **Selection** — pane click / empty marquee снимает выделение.

---

## Follow-up (→ next sprint)

См. [`DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md`](./DEVICE_BOARD_UI_FOLLOWUP_SPRINT_PROMPT.md).

---

## Definition of Done (выполнено)

- [x] PR merged, CI green
- [x] `yarn workspace @membrana/device-board test` pass on `main`
- [x] Virtual team LGTM on PR #139
- [x] `yarn task:archive` для `db-fn-modal-s1-ui` и эпика

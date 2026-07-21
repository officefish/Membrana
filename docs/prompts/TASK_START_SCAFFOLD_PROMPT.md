# Промпт: yarn task:start — Issue+registry+stub+acceptance

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**.
> Реестр: `id` = `task-start-scaffold` · GitHub Issue: [#722](https://github.com/officefish/Membrana/issues/722).

---

## Контекст

Нет единой команды START: Issue + registry + stub руками. `yarn task:register` уже есть;
нужна обёртка с Windows-safe `--body-file` и acceptance scaffold.

## Промпт целиком

Реализовать `yarn task:start` → Issue (опц.) + `task:register` + prompt stub с Acceptance.
Не ломать `task:register`. Обновить `membrana-task-lifecycle` и TASK_PROMPT_WORKFLOW.

### Definition of Done

- [x] `yarn task:start` в package.json
- [x] Windows: body через tempfile / `--body-file`
- [x] lifecycle / workflow ссылаются на task:start как канон START
- [x] dry-run smoke без порчи чужих карточек
- [x] тесты `scripts/task-start.test.mjs`

### Out of scope

Консилиум-гейт; регистрация «за пользователя» без флагов.

## Как добавить задачу

1. GitHub Issue → [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md).
2. Скопировать [`TASK_PROMPT_TEMPLATE.md`](../prompts/TASK_PROMPT_TEMPLATE.md) в `docs/prompts/<SLUG>_PROMPT.md`.
3. Добавить объект в `registry.json` (`"status": "active"`).
4. `yarn task:sync-readme`.

*Файл собран движком стратегических документов из шаблона `tasks-readme` (контейнер [`strategic-docs`](../containers/strategic-docs/)). Правка руками запрещена: меняй `registry.json` или гранулы шаблона и пересобирай.*

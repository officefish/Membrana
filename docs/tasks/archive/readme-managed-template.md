# Архив: docs/tasks/README.md — собственный Template в движке стратегических документов; снять карантин sync

| Поле | Значение |
|------|----------|
| **ID** | `readme-managed-template` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-25 |
| **Архивирована** | 2026-07-26 |
| **GitHub Issue** | #1201 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/README_MANAGED_TEMPLATE_PROMPT.md`](../../docs/prompts/README_MANAGED_TEMPLATE_PROMPT.md) |

## Заметки при закрытии

README реестра переведён на движок strategic-docs: шаблон tasks-readme (4 слота), гранулы active/archive из registry.json через io-адаптер, syncTasksReadme делегирует в generate(), ad-hoc-генератор renderTasksReadme удалён. Карантин TASKS_README_SYNC_FORCE снят — вместо флага предохранитель по факту: невалидный шаблон уводит сборку в experiment, файл не пишется. Подпись с датой заменена на детерминированную (идемпотентность). PR #1214, merge 1e269b3d. Проверки: test:scripts 1777/1777, turbo lint typecheck 97/97, pre-commit [tasks-readme] проходит без -n.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

# Архив: test:scripts разбить на именованные группы — снять файл-перекрёсток

| Поле | Значение |
|------|----------|
| **ID** | `friction6-test-scripts-groups` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #1263 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/FRICTION6_TEST_SCRIPTS_GROUPS_PROMPT.md`](../../docs/prompts/FRICTION6_TEST_SCRIPTS_GROUPS_PROMPT.md) |

## Заметки при закрытии

Закрыто PR #1285 (7386df0a, доработка PR #1315 / 4354c83a): набор берётся открытием по дереву — scripts/lib/test-scripts-plan.mjs + scripts/test-scripts-run.mjs, в package.json test:scripts без путей и ярлыки групп security/rituals/tasks/repo/domain, гвард test-list-coverage переписан под инвариант «run ∪ skipped = диск».

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

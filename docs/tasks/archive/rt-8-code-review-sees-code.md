# Архив: RT-8: daily-ревью видит код дня, а не остаток рабочего дерева

| Поле | Значение |
|------|----------|
| **ID** | `rt-8-code-review-sees-code` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-16 |
| **Архивирована** | 2026-07-16 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/RT_8_CODE_REVIEW_SEES_CODE_PROMPT.md`](../../docs/prompts/RT_8_CODE_REVIEW_SEES_CODE_PROMPT.md) |

## Заметки при закрытии

Реализация смёржена ec6e4637 (PR #543). LGTM через code-review:pr (closure-review не прошёл по размеру — docs-протоколы >80k, это B3/#539). accepted-branch-only по сути: код в main, тимлид LGTM получен. Живой прогон 16 коммитов, golden-регресс 15.07.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

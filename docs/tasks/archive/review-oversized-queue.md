# Архив: Очередь oversized на точечное ревью считается прибором, а не глазом

| Поле | Значение |
|------|----------|
| **ID** | `review-oversized-queue` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-02 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/REVIEW_OVERSIZED_QUEUE_PROMPT.md`](../../docs/prompts/REVIEW_OVERSIZED_QUEUE_PROMPT.md) |

## Заметки при закрытии

Сделано в PR #1642 (4388f415, 02.08): прибор очереди — scripts/lib/review-oversized-queue.mjs + глагол yarn review:oversized, порог импортируется из day-work-diff, отброшенные docs названы числом и причиной; первое точечное ревью головы #1515 проведено (block-oversized-first-review-ozhegov.md). Доработано PR #1674 (860f30e3, host-local предел) и #1741 (d76b6092, снятие по commit-status review/teamlead), живой прогон 04.08 — PR #1709 (9df6c836, голова #1021).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

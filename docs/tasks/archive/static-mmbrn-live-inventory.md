# Архив: #1305-A2: live read-only sealed inventory Affine

| Поле | Значение |
|------|----------|
| **ID** | `static-mmbrn-live-inventory` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-08-09 |
| **Архивирована** | 2026-08-14 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/STATIC_MMBRN_LIVE_INVENTORY_PROMPT.md`](../../docs/prompts/STATIC_MMBRN_LIVE_INVENTORY_PROMPT.md) |

## Заметки при закрытии

Live INV-1 PASS 14.08 по разрешению владельца (read-only). Вещдок: docs/deploy/AFFINE_LIVE_INV1_EVIDENCE_2026-08-14.md (PR #1934); порядок снятия: docs/deploy/AFFINE_LIVE_CAPTURE_RUNBOOK.md (PR #1933). Две пломбы (база 00000009-0004C972-1, том 6f51b8d5…), точные множества сошлись — 148 объектов (91 документ + 57 вложений), детерминизм доказан двумя прогонами с пломбой 5186c348…. Находки: счётчик 82 занижает корпус на 9 служебных документов; 6 висячих связей; натуральные ключи не проходят SAFE_IDENTIFIER; производителя связки в дереве нет (кандидат в тулинг). Открывает static-mmbrn-disposition-ledger.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

# Архив: Недельная процедура «мёртвые провода»: declared ⇒ файл существует ∨ явный pending

| Поле | Значение |
|------|----------|
| **ID** | `weekly-dead-wire-audit` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-29 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #1447 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/WEEKLY_DEAD_WIRE_AUDIT_PROMPT.md`](../../docs/prompts/WEEKLY_DEAD_WIRE_AUDIT_PROMPT.md) |

## Заметки при закрытии

Процедура доставлена PR #1585 (b1bb89db) + охват каталогов мастерских PR #1588 (4693f480) + поправка такта PR #1676 (8aa5344f): зуб dead-wire:check в ritual:day, ядро scripts/lib/dead-wire.mjs, дом docs/procedures/weekly-dead-wire (владелец ozhegov), перечень docs/tasks/dead-wire-pending.json ратифицирован владельцем 01.08. Иссью #1447 закрыть при task:close-github. Побочный долг: у 6 записей pending истёк until 2026-08-09 — находка аудита 11.08.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

# Архив: Telegram-бот для союзников: дайджесты дневного и вечернего ритуалов в приватную группу (modules/telegram в office, push-ingest)

| Поле | Значение |
|------|----------|
| **ID** | `telegram-ally-reports` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-13 |
| **Архивирована** | 2026-07-13 |
| **GitHub Issue** | #428 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TELEGRAM_ALLY_REPORTS_PROMPT.md`](../../docs/prompts/TELEGRAM_ALLY_REPORTS_PROMPT.md) |

## Заметки при закрытии

PR #431 (squash 3124d6d2 side) + hotfix 0291f954 (proxy-aware client, OFFICE_API_TOKEN). E2E smoke 2026-07-13: day+evening дайджесты доставлены в приватную группу (sent=true), контур ritual→office→telegram живой. Остаток: фаза 2 LLM-пересказ (после владельческих хвостов #424/#425).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

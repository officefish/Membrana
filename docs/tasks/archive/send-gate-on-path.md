# Архив: Гейт отправки на путь отправки: день в предикатах, canSendAlly в swallow, сверка digest

| Поле | Значение |
|------|----------|
| **ID** | `send-gate-on-path` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #1233 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SEND_GATE_ON_PATH_PROMPT.md`](../../docs/prompts/SEND_GATE_ON_PATH_PROMPT.md) |

## Заметки при закрытии

Закрыто PR #1295 (10e13eff): предикаты morning-gates знают день (причина «day: состояние протухло»), telegram:swallow зовёт canSendAlly перед транспортом и падает exit 3 при закрытом гейте, --force обходит только ledger; вечерний контур — evening-gates.mjs. Зубы morning-gates.test.mjs и telegram-swallow.test.mjs.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

# Архив: Ночной полный прогон от пина; фрейм night-report получает носитель и блокирует утро

| Поле | Значение |
|------|----------|
| **ID** | `tc-nightly-frame` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-08-11 |
| **GitHub Issue** | #1293 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TC_NIGHTLY_FRAME_PROMPT.md`](../../docs/prompts/TC_NIGHTLY_FRAME_PROMPT.md) |

## Заметки при закрытии

PR #1851 (squash 83582c19 в main), review LGTM; ночь по cron 03:00 UTC (защита main проверена фактом), blocksMorningWhen исполняется потребителем в morning-care, три блокера различимы, пины кадра под auditPins (дрейф доказан падением), gates.items[night-report] с waitsFor:night; иссью #1293 была закрыта раньше времени — доведено здесь

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

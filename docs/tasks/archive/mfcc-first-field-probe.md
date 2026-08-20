# Архив: Первая проба mfcc через мост на записи узла Firebat (89e428ba, боевой вход request)

| Поле | Значение |
|------|----------|
| **ID** | `mfcc-first-field-probe` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-20 |
| **Архивирована** | 2026-08-20 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/MFCC_FIRST_FIELD_PROBE_PROMPT.md`](../../docs/prompts/MFCC_FIRST_FIELD_PROBE_PROMPT.md) |

## Заметки при закрытии

Проба состоялась 20.08 боевым входом request: два вызова, runId 01a01ede-3eb5…/-4f40…, bridge sent, предикат идемпотентности holds=true; вердикт — ворота первой прикидки на поле не различают (фон detected 116/116), вход разблокировки mfcc-compare пятью пунктами. Гейт 2/2, журнал pass, род hit. PR #2019 (9d12d1a3).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

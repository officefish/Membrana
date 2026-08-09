# Архив: NB4: DATASET_CURATION §Пилот — операторский путь разметки через библиотеку + round-trip

| Поле | Значение |
|------|----------|
| **ID** | `nb-vlr-4-docs` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-03 |
| **Архивирована** | 2026-08-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md`](../../docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

Секция проверена текстом: docs/DATASET_CURATION.md §«Пилот hard-gate» (L84) описывает операторский путь — импорт WAV → разметка → «Экспорт меток (JSON)» → yarn vdr:labels-merge (L108-110) → intra-rater через --labels-only + validate:vdr (L115-119). Влито aaf4d119 (PR #241).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

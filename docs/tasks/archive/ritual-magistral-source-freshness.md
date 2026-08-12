# Архив: Расхождение вещдока дня с гейтом меряется предикатом, а не поручается генератору

| Поле | Значение |
|------|----------|
| **ID** | `ritual-magistral-source-freshness` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-02 |
| **Архивирована** | 2026-08-12 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/RITUAL_MAGISTRAL_SOURCE_FRESHNESS_PROMPT.md`](../../docs/prompts/RITUAL_MAGISTRAL_SOURCE_FRESHNESS_PROMPT.md) |

## Заметки при закрытии

исполнена собственным спринтом 02.08 (вещдок //recut-02-08 в main-day-assertions.json): предикат scripts/lib/main-day-magistral-freshness.mjs с тестами, main-day-probe печатает вердикт ВСЕГДА — живой прогон 12.08 даёт gate_newer с обеими датами по норме У1 (это находка прибора, не незакрытость карточки); перечеканка 02.08 сделана, sources[] append-only цел

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

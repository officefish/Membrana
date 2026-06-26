# Insight: Competition → catalog publish pipeline

| Поле | Значение |
|------|----------|
| **ID** | `insight-competition-catalog-pipeline` |
| **Статус** | adopted |
| **Источник** | packaging-epic |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Два спринта (async-v2 competition + packaging) выработали повторяемые шаги: pack → publish catalog → operator debug → lessons L1–L20. Сейчас знание размазано по CLOSURE, OPERATOR_DEBUG_LOG, skills.

## Гипотеза

Один документированный pipeline (`comp:publish-catalog` + regulation + insight registry) ускорит следующие competition forks.

## Scope

- In scope: regulation, skill `membrana-competition-packaging`, checklist в lessons
- Out of scope: автоматический winner merge, Linear sync

## Связи

- `COMPETITION_PACKAGING_CATALOG_SPRINT_PROMPT.md`
- `membrana-competition-packaging` skill
- `USERCASE_COMPETITION_LESSONS.md`

## Вопросы для research

1. **Landscape:** open-source «design competition» or plugin packaging workflows in devtools products
2. **Fit:** Membrana usercase.mjs + catalog registry.json
3. **Risk:** process weight vs small team velocity

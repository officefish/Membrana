# Review: Competition → catalog publish pipeline

> Virtual team · 2026-06-25

[Teamlead]: Два спринта competition+packaging выработали повторяемые шаги, но знание в CLOSURE/OPERATOR_DEBUG/skills. **Adopted** — консолидация в runbook, не новый процесс. Быстрая победа для следующего fork.

[Структурщик]: `usercase.mjs` + `catalog/registry.json` — правильные anchor points. Один `COMPETITION_PACKAGING_RUNBOOK.md` с фазами pack→publish→operator→lessons. Skill ссылается на runbook, не дублирует.

[Математик]: Lessons registry L1–L20 — machine-readable index (id, fork, phase) в `USERCASE_COMPETITION_LESSONS.md` frontmatter или JSON sidebar. Упростит parse и RAG.

[Музыкант]: Operator debug phase обязательна в runbook — без неё catalog publish преждевременен.

[Верстальщик]: Catalog publish — docs/catalog, не UI client. Проверить promptPath в registry после publish.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | неделя | 8 |
| Структурщик | да | неделя | 8 |
| Математик | частично | месяц | 6 |
| Музыкант | да | неделя | 5 |
| Верстальщик | да | месяц | 6 |

**Средний балл:** 6.6

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **6.6**
- Следующий шаг: `docs/competition-sprint/COMPETITION_PACKAGING_RUNBOOK.md` + обновить skill

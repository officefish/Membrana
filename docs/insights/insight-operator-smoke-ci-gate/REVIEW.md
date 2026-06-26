# Review: Operator smoke как pre-merge CI gate

> Virtual team · 2026-06-25

[Teamlead]: Прямой ответ на боль packaging: L17/L20 прошли pack tests, но operator smoke остался post-merge. **Adopted** — первый приоритет среди пилотов G–I. Не смешивать с loop engineering (deferred J).

[Структурщик]: Архитектурно чисто: ring 1 = `usercase.mjs verify-pack` + unit; ring 2 = `logs:parse` на committed fixtures; ring 3 = Playwright `@smoke` optional. Граница «pack gate passed, audio gate manual» должна быть в `OPERATOR_DEBUG_LOG.md`.

[Математик]: `logs:parse` — детерминированный oracle; добавить golden fixtures из OPERATOR_DEBUG_LOG v20. Pack graph tests уже ловят wiring — расширить на все three forks.

[Музыкант]: PR gate **не** заменит Run ≥60s с mic; честно документировать. Nightly или pre-release smoke на real host — отдельно.

[Верстальщик]: Playwright smoke: load client, open device-board, verify canvas — без проверки звука. data-testid на ключевых элементах если нет.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | неделя | 9 |
| Структурщик | да | неделя | 8 |
| Математик | да | неделя | 7 |
| Музыкант | частично | месяц (audio) | 6 |
| Верстальщик | опционально | месяц | 5 |

**Средний балл:** 7.0

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **7.0** — эпик S «competition pack CI gate»
- Следующий шаг: CI job `usercase-competition-verify` на PR + fixture `logs:parse` PASS

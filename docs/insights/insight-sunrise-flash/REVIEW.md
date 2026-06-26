# Review: Sunrise flashes

> Virtual team · 2026-06-25

[Teamlead]: Закрывает «внешний горизонт» без раздувания утра. **06:00** до `morning-care` — правильный слот. Один запрос в Perplexity/Grok/Gemini — бюджетно. Вероятностный day-sprint — только **proposal** в `CURRENT_TASK.md`, не автозамена `MAIN_DAY_ISSUE`. **Adopted**; обновить `DEVELOPER_RHYTHM` § Sunrise (исключение: ritual component из adopted insight). Не конкурировать с `analyzers:research:week`.

[Структурщик]: `scripts/sunrise-flash.mjs`: topic cloud builder, weighted pick, provider cascade, flash writer, knowledge-tree append. Зависимости: `@membrana/rag-service`, insight registry, task registry. Без background-office для cron — локальный cron или GitHub scheduled workflow. Оценка **7**.

[Математик]: Weighted sampling: prefix-sum O(log n); weights = f(RAG score, insight weight, epic priority, decay). Sprint lottery: `P_sprint = min(P_max, α * weight_normalized)`. Хранить seed по date для reproducibility. Оценка **8**.

[Музыкант]: Слабая связь с audio product; темы могут включать INTEGRATIONS_STRATEGY / detectors — ок. Оценка **4**.

[Верстальщик]: Flash — markdown секция в standup template: «🌅 Sunrise: тема · 3 bullet · ссылка». Knowledge tree UI — позже в cabinet, v0 файл. Оценка **6**.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | месяц | 8 |
| Структурщик | да | месяц | 7 |
| Математик | да | месяц | 8 |
| Музыкант | нет (watch) | — | 4 |
| Верстальщик | частично | месяц | 6 |

**Средний балл:** 6.6

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **6.6**
- Следующий шаг: `SUNRISE_FLASH_REGULATION.md` + `yarn sunrise:flash` MVP + hook в `standup` (read latest flash)

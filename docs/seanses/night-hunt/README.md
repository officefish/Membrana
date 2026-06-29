# Night Hunt — отчёты ночной охоты

Автоматические weekly-отчёты от `background-office` (OpenRouter proxy) попадают сюда **через GitHub PR** с label `night-hunt`.

## Именование

```
docs/seanses/night-hunt/<slug>-YYYY-WW.md
```

Примеры:

- `design-drift-2026-26.md`
- `services-api-drift-2026-26.md`
- `graph-drift-2026-26.md`

## Жизненный цикл

1. **Ночь (UTC):** office cron → LLM → PR
2. **Утро:** `yarn night-hunt:pr-review` → `docs/NIGHT_HUNT_PR_REVIEW.md` → `main-day-issue`
3. **День:** merge PR после ревью
4. **Вечер:** `yarn archive:night-hunt` → `docs/archive/night-hunt/<YYYY-MM-DD>/`

Пропуск job (proxy down, нет кредитов) — **норма**, ритуалы не падают.

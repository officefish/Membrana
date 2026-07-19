# Night Build — активный sprint

> Сгенерировано: `2026-07-19T20:21:54.021Z` (`yarn night:open`)
> Регламент: [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** `night-build-format-v2`
**Старт:** 2026-07-19T20:21:54.021Z
**Ветка:** `night/night-build-format-v2-2026-07-19`
**Base:** `origin/main`
**Промпт:** [`docs/prompts/NIGHT_BUILD_FORMAT_V2_PROMPT.md`](./prompts/NIGHT_BUILD_FORMAT_V2_PROMPT.md)

## Предусловия

- [ ] `yarn ritual:evening` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка `night/night-build-format-v2-2026-07-19` создана от **`origin/main`** — НЕ от локального `main`
      (G3, регламент §Несущие гейты): локальный main залочен/грязен у параллельной
      сессии; ветка от origin/main даёт фиксированную базу и исключает коллизию
- [ ] Scope заморожен — без prod-deploy

## Фазы (чеклист)

- _(подзадачи NB* в registry — см. epic-промпт)_

## Чекпоинты

Append: `yarn night:checkpoint --phase NB<n> --status pass|fail --note "..."`

Лог: [`NIGHT_BUILD_LOG.md`](./NIGHT_BUILD_LOG.md)

## Закрытие

```bash
yarn night:close --id night-build-format-v2
```

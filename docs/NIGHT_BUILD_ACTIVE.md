# Night Build — активный sprint

> Сгенерировано: `2026-07-20T17:32:28.221Z` (`yarn night:open`)
> Регламент: [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** `linear-hygiene-dreams-providers-night`
**Старт:** 2026-07-20T17:32:28.221Z
**Ветка:** `night/linear-hygiene-dreams-providers-night-2026-07-20`
**Base:** `origin/main`
**Промпт:** [`docs/prompts/LINEAR_HYGIENE_DREAMS_PROVIDERS_NIGHT_BUILD_EPIC_PROMPT.md`](./prompts/LINEAR_HYGIENE_DREAMS_PROVIDERS_NIGHT_BUILD_EPIC_PROMPT.md)

## Предусловия

- [ ] `yarn ritual:evening` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка `night/linear-hygiene-dreams-providers-night-2026-07-20` создана от **`origin/main`** — НЕ от локального `main`
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
yarn night:close --id linear-hygiene-dreams-providers-night
```

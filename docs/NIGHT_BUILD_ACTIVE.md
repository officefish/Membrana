# Night Build — активный sprint

> Сгенерировано: `2026-06-21T16:39:47.147Z` (`yarn night:open`)
> Регламент: [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** `device-board-post-comp-debt-night-build`
**Старт:** 2026-06-21T16:39:47.147Z
**Ветка:** `night/device-board-post-comp-debt-night-build-2026-06-21`
**Base:** `techies68`
**Промпт:** [`docs/prompts/DEVICE_BOARD_POST_COMP_DEBT_NIGHT_BUILD_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_POST_COMP_DEBT_NIGHT_BUILD_EPIC_PROMPT.md)

## Предусловия

- [ ] `yarn ritual:evening` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка `night/device-board-post-comp-debt-night-build-2026-06-21` создана от `techies68`
- [ ] Scope заморожен — без prod-deploy

## Фазы (чеклист)

- [ ] `db-pcd-nb0-merge-gate` — NB0: merge gate — lint 0 warnings, untracked tracked, usercase verify
- [ ] `db-pcd-nb1-runtime-dry` — NB1: runtime DRY — exec-successor, function-call-resolve vs function-pin-ops
- [ ] `db-pcd-nb2-concept-docs` — NB2: DEVICE_BOARD_CONCEPT runtime diagram + lessons cross-ref
- [ ] `db-pcd-nb3-a11y-hygiene` — NB3: picker modal a11y, usercase.mjs path hygiene

## Чекпоинты

Append: `yarn night:checkpoint --phase NB<n> --status pass|fail --note "..."`

Лог: [`NIGHT_BUILD_LOG.md`](./NIGHT_BUILD_LOG.md)

## Закрытие

```bash
yarn night:close --id device-board-post-comp-debt-night-build
```

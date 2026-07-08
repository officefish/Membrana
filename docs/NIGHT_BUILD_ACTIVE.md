# Night Build — активный sprint

> Сгенерировано: `2026-07-08T16:57:00.483Z` (`yarn night:open`)
> Регламент: [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** `agent-tooling-night-build`
**Старт:** 2026-07-08T16:57:00.483Z
**Ветка:** `night/agent-tooling-night-build-2026-07-08`
**Base:** `techies68`
**Промпт:** [`docs/prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md`](./prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md)

## Предусловия

- [ ] `yarn ritual:evening` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка `night/agent-tooling-night-build-2026-07-08` создана от `techies68`
- [ ] Scope заморожен — без prod-deploy

## Фазы (чеклист)

- [ ] `nb-at-0-gate` — NB0: gate — scoped CI baseline + заморозка конвенций (кода нет)
- [ ] `nb-at-1-gitignore-review` — NB1: .gitignore ревью-артефакта uncommitted-code-review.md
- [ ] `nb-at-2-pr-ship` — NB2: yarn pr:ship (ветка+commit+PR+merge+sync, dry-run default, synthetic-тест)
- [ ] `nb-at-3-build-affected` — NB3: yarn build:affected (пересборка dist изменённых @membrana, kill stale-dist)
- [ ] `nb-at-4-verify-wire-sync` — NB4: yarn verify:wire-sync (core↔bg-cabinet CJS wire синхрон) + pre-push
- [ ] `nb-at-5-hooks` — NB5: scoped pre-push typecheck + commit-msg хук (трейлер+conventional)
- [ ] `nb-at-6-helpers` — NB6: deploy:when-green (print) + prisma:migration (оффлайн diff)
- [ ] `nb-at-7-bookkeeping-gitctx` — NB7: tasks:archive-closed + lib/git-day-context (общий «работа дня»)
- [ ] `nb-at-8-docs-skills` — NB8: docs AGENTS.md + скиллы membrana-ship / tooling-doctor

## Чекпоинты

Append: `yarn night:checkpoint --phase NB<n> --status pass|fail --note "..."`

Лог: [`NIGHT_BUILD_LOG.md`](./NIGHT_BUILD_LOG.md)

## Закрытие

```bash
yarn night:close --id agent-tooling-night-build
```

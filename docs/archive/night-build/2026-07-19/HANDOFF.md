# Night Build handoff — 2026-07-19

> Epic: `night-build-format-v2`
> Закрыто: `2026-07-19T20:30:14.833Z` (`yarn night:close`)
> Промпт: `docs/prompts/NIGHT_BUILD_FORMAT_V2_PROMPT.md`

## Для утреннего standup

1. Решить: **merge** `night/night-build-format-v2-2026-07-19` → `main` (через PR) | **continue night** | **rollback**.
2. `yarn ritual:day` — учесть блокеры в `MAIN_DAY_ISSUE`.
3. После merge — `yarn task:archive` по закрытым фазам.

## Что смёржить (коммиты ветки vs origin/main)

- `61dc3435 docs(night-build): NB3 morning land-reports + skill`
- `9ab51814 feat(night-build): NB2 yarn night:land-reports cascade`
- `ed05761a docs(night-build): NB1 two genres and land cascade`
- `47c18e56 docs(night-build): open format-v2 — prompt, analysis, ACTIVE`

## Follow-up (из тегов `follow-up:` в коммитах)

- _(follow-up-тегов в коммитах нет)_

## Проверка перед merge

```bash
yarn turbo run lint typecheck test build --continue
```

## Лог ночи

# Night Build log

## Open — 2026-07-19T20:21:54.021Z
- Epic: `night-build-format-v2`
- Branch: `night/night-build-format-v2-2026-07-19`


## Checkpoint NB1 — 2026-07-19T20:23:57.413Z
- Status: **pass**
- Note: two genres + land cascade + draft blocker

## Checkpoint NB2 — 2026-07-19T20:27:44.489Z
- Status: **pass**
- Note: yarn night:land-reports + pure lib + 7 unit tests; dry-run default

## Checkpoint NB3 — 2026-07-19T20:29:56.999Z
- Status: **pass**
- Note: DEVELOPER_RHYTHM morning land-reports + skill always-yes:on before spawn

## Checkpoint NB4 — 2026-07-19T20:29:57.952Z
- Status: **pass**
- Note: analysis linked from regulation v1.3 (already on branch)


---

## Шаблон итога (заполнить вручную или агентом)

| Фаза | Статус | PR / commit |
|------|--------|-------------|
| NB0 | pending / done / deferred | |
| NB1 | pending / done / deferred | |
| NB2 | pending / done / deferred | |
| NB3 | pending / done / deferred | |

**Блокеры:**

- …

**LGTM Vesnin:** pending

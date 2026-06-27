# Night Build — активный sprint

> Сгенерировано: `2026-06-27T18:10:18.857Z` (`yarn night:open`)
> Регламент: [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** `agent-context-optimization-v1`
**Старт:** 2026-06-27T18:10:18.857Z
**Ветка:** `night/agent-context-optimization-v1-2026-06-27`
**Base:** `techies68`
**Промпт:** [`docs/prompts/AGENT_CONTEXT_OPTIMIZATION_V1_EPIC_PROMPT.md`](./prompts/AGENT_CONTEXT_OPTIMIZATION_V1_EPIC_PROMPT.md)

## Предусловия

- [ ] `yarn ritual:evening` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка `night/agent-context-optimization-v1-2026-06-27` создана от `techies68`
- [ ] Scope заморожен — без prod-deploy

## Фазы (чеклист)

- [ ] `aco-nb0-gate` — NB0: baseline, frozen scope, registry and dependency gate
- [ ] `aco-nb1-runtime` — NB1: C1 graph smoke + C2 archive topK + C3 audit-reads hook
- [ ] `aco-nb2-workflow` — NB2: C4 graph-first docs + C5 Headroom exclude + C6 proxy guide
- [ ] `aco-nb3-quality` — NB3: scoped CI, checkpoints and morning handoff

## Чекпоинты

Append: `yarn night:checkpoint --phase NB<n> --status pass|fail --note "..."`

Лог: [`NIGHT_BUILD_LOG.md`](./NIGHT_BUILD_LOG.md)

## Закрытие

```bash
yarn night:close --id agent-context-optimization-v1
```

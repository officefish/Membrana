# Task-промпт: linear-stub-lift-office-graphql

> Размер: **M** · lead: **dynin** · Issue: **#694**  
> Предшественник: #691 / PR #692 (`a82fd5af`) — live `pullOk` media-NL  
> Заседание: `docs/meeting/linear-egress-gear-wiring/` · M4 stub-lift · M1 egress  
> Паспорт: `docs/tasks/LINEAR_TASKS_GEAR.md` · [`MOVEMENT_MODE.md`](../tasks/MOVEMENT_MODE.md)  
> Пилот: `docs/discussions/linear-tasks-gear-pilot-egress-wiring-2026-07-20.md`

## Контекст

Два связанных трека после первого live egress:

**A. К5 stub-lift** — явный переключатель `{movementMode, snapshotRef, switchedAt}`; silent-flip запрещён; после `t₀` печать stub незаконна; старые единицы не переписывать.

**B. Office Linear GraphQL** — issue-view path не ходит в `api.linear.app`; clear `503 LINEAR_OFFICE_EGRESS_DISABLED` / «use media egress».

## Промпт целиком

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и этому промпту.
Центральная задача: GitHub #694 ⟺ registry id linear-stub-lift-office-graphql.
Ответственный: dynin. Исполнитель обезличен.
Трек A: yarn movement:lift после сохранённого pullOk(S); docs/tasks/movement-mode.json;
  lib assert* + status; паспорт/пилот-журнал; старые units не rewrite.
Трек B: background-office LinearService — refuse GraphQL; outbound без Linear probe;
  e2e 503; LINEAR_API_KEY optional на office.
Не silent-flip из capture/producer. Секреты из корневого .env без печати.
Worktree от origin/main. Merge после LGTM (слово владельца «идем»).
Office deploy — только если меняется runtime office (трек B).
```

## Definition of Done

- [ ] Issue #694 + registry (`leadPersona: dynin`, `promptPath`, active)
- [ ] `docs/tasks/movement-mode.json` = `live-snapshot` + `snapshotRef` + `switchedAt` (явный lift)
- [ ] `docs/tasks/snapshots/linear-snapshot-live-ref.json` с `pullOk` / media-NL header
- [ ] `scripts/lib/movement-mode.mjs` + tests; `yarn movement:lift` / `yarn movement:status`
- [ ] `docs/tasks/MOVEMENT_MODE.md` + правки паспорта / snapshot-контракта / пилот-журнала
- [ ] Office `LinearService` без fetch к Linear; 503 + code; outbound/e2e согласованы
- [ ] Тесты office + scripts зелёные без сети
- [ ] PR ready; Teamlead LGTM → merge

## Out of scope

К4b hard closure; полный `yarn task:start` CLI; media redeploy (уже live); Linear webhook rewrite.

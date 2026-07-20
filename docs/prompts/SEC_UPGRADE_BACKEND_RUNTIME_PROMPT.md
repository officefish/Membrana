# Task-промпт: sec-upgrade-backend-runtime

> Размер: **L** · lead: **dynin** · support: **ozhegov** · Issue: **#686**  
> Вердикт: `docs/seanses/security-posture-m2-upgrade-2026-07-19.md`  
> Owner correction 20.07: идентичный Nest/Fastify на office+media+cabinet  
> Пилот движка: `docs/discussions/linear-tasks-gear-pilot-sec-upgrade-backend-runtime-2026-07-20.md`

## Контекст

Апгрейд №1 security-posture: неделимый атом **Nest 10→11 + Fastify 5** на всех background-серверах.

- Nest 10 `@nestjs/platform-fastify` тянул `@fastify/middie` 8.x (critical auth bypass).
- Nest 11 `platform-fastify` идёт на **fastify 5** и **больше не зависит от middie** — critical снимается уходом с Nest 10 adapter.
- **Owner correction (20.07):** `background-office` обязан перейти с Express на Fastify — стек идентичен media/cabinet. Express 5 недостаточно.

### Inventory (канон после correction)

| Пакет | Было | Цель |
|---|---|---|
| `background-office` | Nest 10 + Express | Nest 11 + `@nestjs/platform-fastify` + `@fastify/*` (как media) |
| `background-media` | Nest 10 + Fastify 4 | Nest 11 + Fastify 5 |
| `background-cabinet` | Nest 10 + Fastify 4 | Nest 11 + Fastify 5 |

Не смешивать с `sec-upgrade-dev-tooling` (vite/vitest) в одном PR.

## Промпт целиком

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и этому промпту.
Центральная задача: GitHub #686 ⟺ registry id sec-upgrade-backend-runtime.
Ответственный: dynin. Исполнитель обезличен (LINEAR_TASKS_GEAR §3).
Атом: Nest 11 + Fastify 5 на background-office, background-media, background-cabinet.
Office: снять platform-express/express/swagger-ui-express; main + e2e на FastifyAdapter.
DoD: typecheck/test трёх пакетов; в дереве нет @fastify/middie (или нет critical advisory).
Не поднимай vite/vitest/tar/electron. Веди журнал пилота движка.
```

## Definition of Done

- [ ] `@nestjs/common|core|platform-fastify|testing` → `^11` в office/media/cabinet
- [ ] office: нет `@nestjs/platform-express`, `express`, `swagger-ui-express`, `@types/express`
- [ ] media/cabinet/office: fastify 5 в lockfile; `@fastify/cors` (и др. по нужде) совместимы с fastify 5
- [ ] `@fastify/middie` отсутствует в `yarn why` / нет critical advisory по middie
- [ ] `yarn workspace @membrana/background-{office,media,cabinet} typecheck` зелёный
- [ ] тесты трёх пакетов зелёные
- [ ] PR + отчёт в #686; registry `githubIssue: 686`
- [ ] closure-заготовка `{acceptedBy, headRev}`

## Out of scope

vite 7, vitest 3, tar 7, electron, боевой Linear API, миграция холода.

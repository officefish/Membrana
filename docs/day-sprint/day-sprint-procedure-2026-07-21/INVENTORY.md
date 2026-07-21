# INVENTORY — day-sprint procedure surface (F1 / #850)

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Lead | ozhegov |
| Sprint | `day-sprint-procedure` (#848) |
| Вход | F2 MANIFEST · F3 regulation |

## Canon

| Артефакт | Роль | Заметка |
|----------|------|---------|
| `docs/prompts/TASK_PROMPT_WORKFLOW.md` | START: `yarn task:start` / register | default kind = day work |
| `docs/prompts/TASK_CLOSURE_REGULATION.md` | archive / close DoD | не описывает OPEN/CLOSURE папок |
| `.cursor/skills/membrana-task-lifecycle/SKILL.md` | операционный канон фаз + `parentEpic` + CLOSURE | зеркало `.claude/skills/` |
| `docs/DAY_SPRINT_ACTIVE.md` | указатель на активный(е) спринт(ы) | один файл; параллель возможна |
| `docs/DAY_SPRINT_LOG.md` | хронология эпиков | |
| `docs/tasks/registry.json` | карточки `sprintKind: day-sprint` | |
| `docs/day-sprint/<id>/` | **инстансы** (OPEN/CLOSURE/…) | не мигрируют в procedures/ |
| `docs/procedures/` | дом определений (R1–R5) | жильца `day-sprint` ещё нет |

**Gap канона:** нет `DAY_SPRINT_REGULATION.md`. В `FORMATS.md` day-sprint не в таблице форматов (это ритм задач, не competition/cowork/night) — regulation всё равно нужен как lifecycle.

## Engines (черновик `engines[]`)

Резолвящиеся скрипты — кандидаты в MANIFEST (как у `ritual-evening`: оркестратор + ключевые шаги, не весь `task:review:*`).

| Path | yarn / роль |
|------|-------------|
| `scripts/task-start.mjs` | `yarn task:start` — START Issue+registry+stub |
| `scripts/task-register.mjs` | `yarn task:register` — узкая регистрация |
| `scripts/lib/task-registry.mjs` | схема / render README |
| `scripts/archive-task.mjs` | `yarn task:archive` |
| `scripts/task-close-github-issues.mjs` | `yarn task:close-github` |
| `scripts/task-list.mjs` | `yarn task:sync-readme` / list |
| `scripts/task-closure-review.mjs` | `yarn task:review:*` — post-archive Teamlead |

**Не в engines (осознанно):** нет `day-sprint:open/close` (OPEN/CLOSURE — ручные по skill). Не тащить весь `task:review:ship` / board, пока F2 не решит иначе.

### Рекомендуемый минимальный `engines[]` для F2

```json
[
  "scripts/task-start.mjs",
  "scripts/task-register.mjs",
  "scripts/archive-task.mjs",
  "scripts/task-close-github-issues.mjs",
  "scripts/task-list.mjs",
  "scripts/lib/task-registry.mjs"
]
```

Опционально добавить `scripts/task-closure-review.mjs` во follow-up.

## Precedents (черновик `precedents[]`)

Закрытые day-sprint с CLOSURE (свежие + эталоны):

| Path |
|------|
| `docs/day-sprint/branch-mintlify-engine/CLOSURE.md` |
| `docs/day-sprint/kits-angelina-morning-2026-07-21/CLOSURE.md` |
| `docs/day-sprint/branch-assortment-sprint/CLOSURE.md` |
| `docs/day-sprint/backlog-cleanup-s1-2026-06-30/CLOSURE.md` |
| `docs/day-sprint/db3h-s1-tech-debt-2026-06-26/CLOSURE.md` |
| `docs/day-sprint/cursor-agent-skills-sprint-2026-06-22/CLOSURE.md` |

Плюс OPEN текущего: `docs/day-sprint/day-sprint-procedure-2026-07-21/OPEN.md` (как класс-на-себе после CLOSURE — не класть в MANIFEST до F5).

## Gaps

| Gap | Рекомендация |
|-----|----------------|
| Нет `DAY_SPRINT_REGULATION.md` | **F3: писать regulation** (не README-only) — рядом с NIGHT/MEETING; провод из FORMATS или отдельная секция «ритм задач» |
| Нет `yarn day-sprint:open/close` | **не в этом эпике** — follow-up; skill остаётся оператором OPEN/CLOSURE |
| Нет жильца `docs/procedures/day-sprint/` | **F2** |
| Нет строки в `docs/procedures/registry.json` | **F4** (после home); `day-sprint` отсутствует даже как legacy |
| Параллельные ACTIVE | ACTIVE может держать соседний спринт; наш OPEN/LOG достаточны |

## Рекомендация F3

**Писать `docs/DAY_SPRINT_REGULATION.md`**, не отказ. Содержание минимум — см. `DSP_F3_REGULATION_PROMPT.md`. Указатель из README жильца + строка в FORMATS («ритм day-sprint» / ссылка вне таблицы форматов соревнований).

## Соседство (скоуп)

| Сосед | Правило |
|------|---------|
| `pl-r5-migration` / `fix/pl-r5-registry-completeness` | реестр уже есть; F4 добавляет `day-sprint`, не ломая schema |
| `kits-dream-master` (#855) | параллельный day-sprint; не колонизировать ACTIVE |
| `kits-angelina-morning` | `kitVersion: null` у day-sprint — без кита |
| night / cowork / competition | out of scope |

## Вход F2

- `id`: `day-sprint`
- `leadPersona`: `vesnin`
- `kitVersion`: `null`
- `engines[]` / `precedents[]` — таблицы выше

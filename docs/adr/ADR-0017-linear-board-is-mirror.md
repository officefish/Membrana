# ADR-0017 — Linear-доска = зеркало GitHub; движение = снимок

> **Статус:** DRAFT · 2026-07-23  
> **merge файла ≠ принятие решения** пока статус DRAFT — решения действуют после LGTM владельца.  
> Issue: #1000 / DRU-364 · эпик `frame-rails-2307`

## Контекст

Замер 23.07: среди активных Linear-карточек Done ≫ Started (`startedAt` почти пуст) —
сотни переходов Backlog→Done без «в работе». Интеграция GitHub↔Linear заводит тикет
при Issue и гасит его при закрытии. При этом в каноне уже есть слой движения:
`linear-snapshot@1` + `movementMode: live-snapshot` ([`MOVEMENT_MODE.md`](../tasks/MOVEMENT_MODE.md)).

Развилка Issue #1000: либо сделать колонку «In Progress» обязательной, либо честно
назвать доску зеркалом и не называть её движением.

## Наблюдаемое состояние (подтверждено кодом)

| Факт | Где (файл @ 2026-07-23) |
|------|--------------------------|
| `task:start` пишет `linearId`, **не** двигает состояние Linear | `scripts/task-start.mjs` |
| Снимок `@1` нёс `completedAt`, **не** нёс `startedAt` → прыжок неизмерим офлайн | `packages/background-media/.../linear-snapshot.types.ts`, ref-снимок `docs/tasks/snapshots/linear-snapshot-live-ref.json` |
| Режим движения уже `live-snapshot` (K5 lift) | `docs/tasks/movement-mode.json` |
| Linear R1–R3 неблокирующие; Done не обязателен для archive | `docs/prompts/LINEAR_GITHUB_SYNC_REGULATION.md` |
| Массовые записи в Linear — только по слову владельца | `FRAME_RAILS_2307_PROMPT.md` § гигиена |

## Решение

### Р1 — Доска Linear = зеркало GitHub (не WIP-доска)
- Колонки Backlog/Done отражают жизненный цикл Issue (create / close), а не факт труда.
- Запрещено называть UI-доску «слоем движения» в регламентах и `task:start`.
- **Граница:** не трогаем интеграцию GitHub↔Linear и не делаем mass transition в Started.

### Р2 — Слой движения = снимок + measure (как в LINEAR_TASKS_GEAR §6–7)
- Единственный офлайн-носитель движения — `linear-snapshot@1` (+ холод archive).
- В запись снимка добавляется `startedAt: string | null` — чтобы прыжок
  `completed ∧ ¬started` был измерим без сети.
- Зуб: `yarn linear:movement-audit` (чистая функция от снимка).

### Р3 — Обязательный Started — отдельный follow-up, не этот ADR
- Перевод в In Progress из `task:start` через media/proxy — отдельная карточка после
  ACCEPTED этого ADR и слова владельца на запись в Linear.
- Исторические Done без `startedAt` не переписываются задним числом.

## Definition of Done
- [x] ADR + правка канона «доска ≠ движение»
- [x] `startedAt` в типе/GraphQL/map снимка
- [x] `yarn linear:movement-audit` + тесты
- [ ] LGTM владельца → статус ACCEPTED
- [ ] (follow-up) `task:start` → Started при наличии `linearId`

## Out of scope / открытые задачи
- Mass archive / mass state-update в Linear.
- Смена контракта формата на `@2` (поле аддитивное в `@1`).
- Деплой media-NL (новый pull подхватит `startedAt` на следующем capture).

## Ссылки
- Issue #1000 / DRU-364
- [`LINEAR_TASKS_GEAR.md`](../tasks/LINEAR_TASKS_GEAR.md) §6
- [`MOVEMENT_MODE.md`](../tasks/MOVEMENT_MODE.md)
- Прецедент-вещдок: `FRAME_RAILS_2307_PROMPT.md` таблица «Linear не слой движения»

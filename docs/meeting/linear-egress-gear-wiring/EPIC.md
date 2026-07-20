# Эпик: egress Linear + боевая подводка движка задач

> Сборка вердиктов заседания `linear-egress-gear-wiring` (2026-07-20).
> Задание: [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) · контейнер: [`MEETING_ACTIVE.md`](./MEETING_ACTIVE.md)
> Вход: паспорт [`LINEAR_TASKS_GEAR`](../../tasks/LINEAR_TASKS_GEAR.md), шторм
> [`storm-engine-onboarding`](../../storm/storm-engine-onboarding-2026-07-19/THESES.md),
> пилот [`sec-upgrade journal`](../../discussions/linear-tasks-gear-pilot-sec-upgrade-backend-runtime-2026-07-20.md).

---

## Вердикты

| Фаза | Вопрос | Вердикт | Протокол |
|---|---|---|---|
| M0 | порядок зависимостей (`E1`) | `К1 ∥ К4a → К2 → К3 → {К5, К4b}` — **ратифицирован владельцем 2026-07-20** | [m0-order](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) |
| M1 | форма egress-пути (`E2`, К1) | media-NL держит клиент Linear и делает pull; office получает только `linear-snapshot@1` | [m1-egress-path](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| (∥) | каркас процедур (`К4a`) | можно параллельно; не созван | — |
| M2.. | К2 → К3 → {К5, К4b} | К2 разблокирован после M1 | — |

---

## Работы

### Р0 — порядок (закон после ратификации 2026-07-20)

**DAG (ратифицирован, дословно):** `К1 ∥ К4a → К2 → К3 → {К5, К4b}`

### Р1 — форма egress (К1) — CLOSED 2026-07-20

- Единственное внешнее ребро: `media-NL → api.linear.app`.
- Office (MSK) в Linear **не ходит**; видит только артефакт снимка по внутреннему тракту.
- Инициатор pull — media (cron / webhook на media), не office.
- Паспортное «office-батч»: сохранить `mode=batch-full-pull` + «вебхук = триггер»;
  **producer** проецируется на media-NL (смысловое переименование, не отмена аксиомы снимка).
- Секреты → К2; контракт/DoD снимка (в т.ч. `producedBy`, `egressRegion`) → К3.

---

## Порядок исполнения

```
К1 ✓ (форма egress)     К4a (каркас спринта)   ← слой 0; К4a ещё открыт
 │
 ▼
К2 (trust / секреты)   ← следующий по цепочке
 │
 ▼
К3 (снимок + DoD pull)
 │
 ├→ К5 (снятие stub)
 └→ К4b (гейт closure)
```

---

## Гейты владельца

| Что | Статус |
|---|---|
| Порядок фаз (вердикт M0) | **ратифицирован 2026-07-20** (владелец: «ратифицирую») |
| Поднятие туннеля / секреты в прод | вне заседания; только планирование |

---

## Открытые хвосты

| Что | Куда |
|---|---|
| Inventory секретов на media-VPS | **К2** (разблокирован) |
| Живой ответ Linear с media-NL + DoD снимка | К3 |
| Каркас процедур T2 / `task:start` | **К4a** (параллельный прогон) |
| Аудит процедуры отдельным агентом | `yarn meeting:audit --id linear-egress-gear-wiring` |

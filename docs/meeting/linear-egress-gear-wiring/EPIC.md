# Эпик: egress Linear + боевая подводка движка задач

> Сборка вердиктов заседания `linear-egress-gear-wiring` (2026-07-20).
> Задание: [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) · контейнер: [`MEETING_ACTIVE.md`](./MEETING_ACTIVE.md)

---

## Вердикты

| Фаза | Вопрос | Вердикт | Протокол |
|---|---|---|---|
| M0 | порядок (`E1`) | `К1 ∥ К4a → К2 → К3 → {К5, К4b}` — ratified 2026-07-20 | [m0-order](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) |
| M1 | форма egress (`E2`, К1) | media-NL = клиент+pull; office = потребитель снимка | [m1-egress-path](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| M1b | каркас процедур (`E3`, К4a) | `task:start` + посев паспорта + Issue/registry/Linear roles | [m1b-sprint-scaffold](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) |
| след. | секреты / trust (К2) | *не созван* | — |

---

## Работы

### Р0 — порядок (ratified 2026-07-20)

`К1 ∥ К4a → К2 → К3 → {К5, К4b}`

### Р1 — форма egress (К1) — CLOSED

media-NL → Linear; office ← snapshot only; producer = media-NL (`mode=batch-full-pull`).

### Р1b — каркас процедур (К4a) — CLOSED

- `yarn task:start` до кода: Issue ∧ биекция registry↔Issue ∧ acceptance-шаблон ∧ stub движения ∧ `leadPersona`.
- `task:register` = содержание; `task:start` = старт движения.
- Гейт: active без Issue → reject.
- Посев: AGENTS/lifecycle → паспорт §2–§4 + словарь + `task:start` (не registry-only).
- Роли: Issue = счёт · registry = содержание · Linear parent = контейнер (stub до egress).
- Вне MAIN_DAY — только с `override` + Issue владельца.

### Р2 — секреты / trust (К2) — следующий

*(ожидает прогона)*

---

## Порядок исполнения

```
К1 ✓                    К4a ✓
 │
 ▼
К2 (trust / секреты)   ← СЛЕДУЮЩИЙ
 │
 ▼
К3 → {К5, К4b}
```

---

## Гейты владельца

| Что | Статус |
|---|---|
| Порядок M0 | **ратифицирован 2026-07-20** |
| Туннель / секреты в прод | вне заседания |

---

## Открытые хвосты

| Что | Куда |
|---|---|
| Inventory секретов на media-VPS | **К2** |
| DoD снимка + живой pull | К3 |
| Снятие stub / гейт closure | К5 / К4b |
| Аудит отдельным агентом | `yarn meeting:audit --id linear-egress-gear-wiring` |

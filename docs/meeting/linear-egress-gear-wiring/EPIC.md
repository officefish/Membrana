# Эпик: egress Linear + боевая подводка движка задач

> Заседание `linear-egress-gear-wiring` (2026-07-20).
> [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) · [`MEETING_ACTIVE.md`](./MEETING_ACTIVE.md)

---

## Вердикты

| Фаза | Вопрос | Вердикт | Протокол |
|---|---|---|---|
| M0 | порядок (`E1`) | `К1 ∥ К4a → К2 → К3 → {К5, К4b}` ratified | [m0](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) |
| M1 | egress (`E2`) | media-NL client+pull; office = snapshot consumer | [m1](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| M1b | каркас (`E3`) | `task:start` + passport seed + three carriers | [m1b](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) |
| M2 | секреты (`E4`) | LINEAR key only media; trigger via X-Membrana-Token | [m2](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md) |
| след. | снимок DoD (К3) | *не созван* | — |

---

## Работы

### Р0 — порядок (ratified)

`К1 ∥ К4a → К2 → К3 → {К5, К4b}`

### Р1 — egress (CLOSED)

media-NL → Linear; office ← `linear-snapshot@1`; producer = media-NL.

### Р1b — каркас (CLOSED)

`yarn task:start` · Issue/registry/Linear roles · AGENTS → passport.

### Р2 — секреты / trust (CLOSED)

- `LINEAR_API_KEY` (+ egress webhook secret) — **только media-NL** (политика размещения).
- Egress к `api.linear.app` — только процесс media (cron / локальный webhook).
- Office и агент РФ **не держат** Linear key и не ходят в GraphQL Linear.
- Trigger office→media (заказ/забор снимка): существующий `X-Membrana-Token` /
  `API_INTERNAL_TOKEN`; Linear key в вызове не передаётся.
- Пересмотр: узкий egress-secret при k≥2; cold-only pull при on-demand+изоляции.
- В К3: `producedBy: media-NL` + регион egress (контракт).

### Р3 — контракт снимка / DoD pull (К3) — следующий

*(ожидает прогона)*

---

## Порядок исполнения

```
К1 ✓    К4a ✓
 │
 ▼
К2 ✓
 │
 ▼
К3   ← СЛЕДУЮЩИЙ
 │
 ├→ К5
 └→ К4b
```

---

## Гейты владельца

| Что | Статус |
|---|---|
| Порядок M0 | ratified 2026-07-20 |
| Раскладка секретов / туннель в прод | вне заседания |

---

## Открытые хвосты

| Что | Куда |
|---|---|
| Контракт `linear-snapshot@1` + DoD первого боевого pull | **К3** |
| Снятие stub / гейт closure | К5 / К4b |
| Снятие `LinearService`+key из env-модели office | след реализации политики M2 (не вердикт К3) |
| Аудит | `yarn meeting:audit --id linear-egress-gear-wiring` |

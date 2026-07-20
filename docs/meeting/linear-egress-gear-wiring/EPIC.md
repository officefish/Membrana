# Эпик: egress Linear + боевая подводка движка задач

> [`MEETING_BRIEF.md`](./MEETING_BRIEF.md) · [`MEETING_ACTIVE.md`](./MEETING_ACTIVE.md)
> PR: https://github.com/officefish/Membrana/pull/690

---

## Вердикты

| Фаза | Вопрос | Вердикт | Протокол |
|---|---|---|---|
| M0 | порядок | `К1 ∥ К4a → К2 → К3 → {К5, К4b}` ratified | [m0](../../seanses/linear-egress-gear-wiring-m0-order-2026-07-20.md) |
| M1 | egress | media-NL client+pull | [m1](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| M1b | каркас | `task:start` + three carriers | [m1b](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) |
| M2 | секреты | key only media; X-Membrana-Token trigger | [m2](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md) |
| M3 | снимок DoD | honest-шапка + `pullOk(S)` offline | [m3](../../seanses/linear-egress-gear-wiring-m3-snapshot-dod-2026-07-20.md) |
| след. | К5 ∥ К4b | *не созваны* | — |

---

## Работы

### Р3 — контракт снимка (CLOSED)

- Обязательная шапка `@1`: `format`, `capturedAt`, `sourceRevision`, `producedBy=media-NL`,
  `egressRegion=NL`, `mode=batch-full-pull`, `trigger`, `recordCount`.
- Литерал `source: office-batch` **удалён** → `producedBy` + `mode`.
- `pullOk(S)` — булева функция только от файла снимка.
- Гейт в теле: офлайн, без `api.linear.app`. Freshness — вне тела гейта.
- `contentDigest` / `keyFingerprint` — опциональны в `@1`.

### Р4a / Р4b — следующие (после К3)

- **К5**: снятие stub, когда есть первый артефакт с `pullOk` не-stub путём.
- **К4b**: гейт closure над `pullOk` (возможно обязательный digest).

---

## Порядок исполнения

```
К1 ✓  К4a ✓ → К2 ✓ → К3 ✓ → { К5 , К4b }  ← СЛЕДУЮЩИЕ (независимы)
```

---

## Открытые хвосты

| Что | Куда |
|---|---|
| Снятие stub | **К5** |
| Гейт closure | **К4b** |
| Миграция типа `LinearSnapshotHeader` в коде | реализация после заседания |
| Аудит | `yarn meeting:audit --id linear-egress-gear-wiring` |

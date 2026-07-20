# MEETING ACTIVE — `linear-egress-gear-wiring`

> Протокол **контейнера**, отдельный от протоколов консилиумов.
> Открыто: 2026-07-20 · Ветка: `meeting/linear-egress-gear-wiring`
> PR: https://github.com/officefish/Membrana/pull/690

---

## СТАТУС: M0–M3 CLOSED · следующий слой — К5 ∥ К4b

Цепочка до снимка закрыта. По ратифицированному DAG после К3 независимы:
**К5** (снятие stub) и **К4b** (гейт closure) — оба опираются на `pullOk`.

Аудитор (S-M5) — **отдельный** агент; председатель не играет.

## Задание

См. [`MEETING_BRIEF.md`](./MEETING_BRIEF.md). Поправка — только `BRIEF_AMENDMENT.md` + LGTM.

## Порядок (M0 — **РАТИФИЦИРОВАН 2026-07-20**)

```
К1 ∥ К4a → К2 → К3 → {К5, К4b}
```

## Вердикты

| Фаза | Узел | Суть | Протокол |
|---|---|---|---|
| M1 | К1 | media-NL = client+pull; office = snapshot consumer | [m1](../../seanses/linear-egress-gear-wiring-m1-egress-path-2026-07-20.md) |
| M1b | К4a | `task:start` + passport seed + three carriers | [m1b](../../seanses/linear-egress-gear-wiring-m1b-sprint-scaffold-2026-07-20.md) |
| M2 | К2 | LINEAR key only media; trigger via X-Membrana-Token | [m2](../../seanses/linear-egress-gear-wiring-m2-secrets-trust-2026-07-20.md) |
| M3 | К3 | honest-шапка + `pullOk` от файла; гейт офлайн | [m3](../../seanses/linear-egress-gear-wiring-m3-snapshot-dod-2026-07-20.md) |

### M3 (К3) — деталь

| Вопрос | Решение |
|---|---|
| Honest-шапка | `format`, `capturedAt`, `sourceRevision`, `producedBy=media-NL`, `egressRegion=NL`, `mode=batch-full-pull`, `trigger`, `recordCount` |
| `source: office-batch` | **заменён** парой `producedBy` + `mode` |
| `pullOk(S)` | полная шапка ∧ producedBy ∧ region ∧ revision≠∅ ∧ mode ∧ recordCount=\|body\| — **только от файла** |
| Гейт офлайн | читает байты снимка; ноль GraphQL Linear в теле |
| Freshness | вне тела гейта (не в `pullOk`) |
| digest/fingerprint | опциональны в `@1` |

На выход: К5 ← первый артефакт с `pullOk` не-stub путём · К4b ← надстройка над `pullOk`.

## Статус вопросов

| Фаза | Вопрос | Статус | Повестка |
|---|---|---|---|
| M0 | порядок (`E1`) | CLOSED / ratified | [M0-topic](./M0-topic.md) |
| M1 | egress (`E2`) | CLOSED | [M1-topic](./M1-topic.md) |
| M1b | каркас (`E3`) | CLOSED | [M1b-topic](./M1b-topic.md) |
| M2 | секреты (`E4`) | CLOSED | [M2-topic](./M2-topic.md) |
| M3 | снимок DoD (`E5`) | CLOSED | [M3-topic](./M3-topic.md) |
| след. | stub / closure (`К5` ∥ `К4b`) | **следующие** | — |

## Аудитор

```bash
yarn meeting:audit --id linear-egress-gear-wiring
```

## Журнал

| Когда | Что |
|---|---|
| 2026-07-20 | M0…M2 closed |
| 2026-07-20 | M3: `pullOk` + honest-шапка с producedBy/egressRegion. Дальше К5∥К4b. |

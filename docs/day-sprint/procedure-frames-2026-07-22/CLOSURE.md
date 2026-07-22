# CLOSURE — procedure-frames

| Field | Value |
|-------|-------|
| Epic | `procedure-frames` · [#900](https://github.com/officefish/Membrana/issues/900) |
| Date | 2026-07-22 |
| Sprint OPEN | [`OPEN.md`](./OPEN.md) |
| Status | **CLOSED** |
| Meeting | [`docs/meeting/procedure-frames/`](../../meeting/procedure-frames/) · EPIC ратифицирован |
| Consumer | [`docs/meeting/ritual-day-frames/`](../../meeting/ritual-day-frames/) · [#939](https://github.com/officefish/Membrana/pull/939) |
| ADR | [`ADR-0015`](../../adr/ADR-0015-frame-pins-array-shape.md) · **ACCEPTED** |

## Delivered

| Фаза | Issue | PR | Артефакт |
|------|------:|----:|----------|
| F0 | #926 | [#942](https://github.com/officefish/Membrana/pull/942) | ACTIVE · ADR-0015 `pins[]` · cold-start precedent |
| F1 | #927 | [#944](https://github.com/officefish/Membrana/pull/944) | `preflight`/`frames`/`post` + `pins[]` в `validateProcedure` |
| F2 | #928 | [#953](https://github.com/officefish/Membrana/pull/953) | `auditPins` + `resolveSegment`; кит на том же ядре |
| F3 | #929 | [#955](https://github.com/officefish/Membrana/pull/955) | `morning-wiring` в **preflight** · 3 двери · гейт в `morning-care` |
| F4 | #930 | [#960](https://github.com/officefish/Membrana/pull/960) | PINNED_/GROUP_ `copies=1` · домены кит/фрейм |
| F5 | #931 | *(этот PR)* | CLOSURE + archive эпика · ACTIVE «Also open» снят |

## Acceptance (#900)

- [x] `morning-wiring` / holder `ozhegov` читаются из `docs/procedures/ritual-day/MANIFEST.json` (`preflight`)
- [x] Дрейф/пропажа ловятся `auditPins` (таблица + глагол); missing → STOP на старте утра
- [x] Delivery в main F0–F4; F5 — archive
- [x] Зубы: `validateProcedure` · `auditPins` · `morning-wiring` · `kits:audit` (не сломан)
- [x] Фазы архивированы; этот CLOSURE

## Binding (не переоткрывать)

- Очередь: `preflight ≺ frames ≺ post(manual)`.
- Дом wiring — **preflight**, не `frames[0]` (шов с Ф3 procedure-frames meeting).
- Полуживой MANIFEST запрещён (M5): `D_live` после F1–F3 в main.

## Deferred

| Хвост | Владелец | Куда |
|-------|----------|------|
| CI-зуб анти-дубль оговорки GROUP_CONTAINERIZATION | **dynin** | вне критического пути; не блокер #900 |

## Handoff

- Новый фрейм: кадр в `preflight`/`frames`/`post` + `pins[]` (ADR-0015); аудит только через `auditPins`.
- Двери утра: маркеры `morning-wiring-*` + `segmentHash`; ремонт — holder ozhegov.
- Паттерн: единая оговорка в [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md); GROUP — ссылка (`copies=1`).
- Полная раскладка утра на фреймы — потребитель ritual-day-frames; этот спринт дал контракт + первый живой кадр.

## Archive

`yarn task:archive` · `pf-f4-pattern` · `pf-f5-closure` · эпик `procedure-frames` · notes: PR F5 + этот CLOSURE.

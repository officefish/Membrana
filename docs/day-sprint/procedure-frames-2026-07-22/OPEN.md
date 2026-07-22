# OPEN: procedure-frames — исполнение заседания (фреймы)

| Поле | Значение |
|------|----------|
| **Sprint** | `procedure-frames-2026-07-22` |
| **Registry epic** | `procedure-frames` · [#900](https://github.com/officefish/Membrana/issues/900) |
| **Kind** | day-sprint (исполнение заседания) |
| **Status** | **open** · в фокусе (`DAY_SPRINT_ACTIVE`) |
| **Started** | 2026-07-22 |
| **Meeting (контракт)** | [`docs/meeting/procedure-frames/`](../../meeting/procedure-frames/) · EPIC ратифицирован |
| **Meeting (раскладка утра)** | [`docs/meeting/ritual-day-frames/`](../../meeting/ritual-day-frames/) · EPIC ратифицирован · [#939](https://github.com/officefish/Membrana/pull/939) |
| **Lead** | ozhegov · support dynin |
| **Промпт** | [`PROCEDURE_FRAMES_PROMPT.md`](../../prompts/PROCEDURE_FRAMES_PROMPT.md) |
| **Фаза сейчас** | **F2** · ветка `feat/pf-f2-segment-pin` · lead dynin |

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **F0** | `pf-f0-brief` | [#926](https://github.com/officefish/Membrana/issues/926) | ozhegov | **done** · [#942](https://github.com/officefish/Membrana/pull/942) |
| **F1** | `pf-f1-frames-contract` | [#927](https://github.com/officefish/Membrana/issues/927) | ozhegov | **done** · [#944](https://github.com/officefish/Membrana/pull/944) |
| **F2** | `pf-f2-segment-pin` | [#928](https://github.com/officefish/Membrana/issues/928) | dynin | **in progress** |
| **F3** | `pf-f3-morning-wiring` | [#929](https://github.com/officefish/Membrana/issues/929) | ozhegov | open |
| **F4** | `pf-f4-pattern` | [#930](https://github.com/officefish/Membrana/issues/930) | ozhegov | open |
| **F5** | `pf-f5-closure` | [#931](https://github.com/officefish/Membrana/issues/931) | vesnin | open |

## Gate (к F5)

- [x] ADR шов `pin?` / `pins[]` (F0 → ADR-0015 **ACCEPTED** 22.07)
- [x] `preflight`/`frames`/`post` + `pins[]` в validateProcedure; живущие зелёные без очереди (F1)
- [ ] `auditPins` + тесты 4 исходов; кит на том же ядре
- [ ] `morning-wiring` в ritual-day + 3 двери + зов на старте ритуала (**носитель preflight** — вердикт ritual-day-frames M2)
- [ ] Паттерны PINNED_* / GROUP_* уточнены (`copies=1`)
- [ ] Приёмка #900 · LGTM · archive

## Binding из ritual-day-frames (не переоткрывать)

- Очередь: `preflight ≺ frames ≺ post(manual)`.
- `D_live` только после #927–#929 в main; полуживой MANIFEST запрещён (M5).
- Шов с Ф3: дом wiring — **preflight**, не `frames[0]` (двери и holder ozhegov без изменений).

## Хвост №2 (вне критического пути)

CI анти-дубль оговорки GROUP_CONTAINERIZATION → отдельная карточка **dynin** или deferred в CLOSURE.

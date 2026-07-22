# OPEN: procedure-frames — исполнение заседания (фреймы)

| Поле | Значение |
|------|----------|
| **Sprint** | `procedure-frames-2026-07-22` |
| **Registry epic** | `procedure-frames` · [#900](https://github.com/officefish/Membrana/issues/900) |
| **Kind** | day-sprint (исполнение заседания) |
| **Status** | **open** |
| **Started** | 2026-07-22 |
| **Meeting** | [`docs/meeting/procedure-frames/`](../../meeting/procedure-frames/) · закрыто / EPIC ратифицирован |
| **Lead** | ozhegov · support dynin |
| **Промпт** | [`PROCEDURE_FRAMES_PROMPT.md`](../../prompts/PROCEDURE_FRAMES_PROMPT.md) |
| **Параллель** | `DAY_SPRINT_ACTIVE` сейчас указывает на `bestiary-container` (B4) — не перезаписываем; этот спринт открыт рядом |

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **F0** | `pf-f0-brief` | [#926](https://github.com/officefish/Membrana/issues/926) | ozhegov | open |
| **F1** | `pf-f1-frames-contract` | [#927](https://github.com/officefish/Membrana/issues/927) | ozhegov | open |
| **F2** | `pf-f2-segment-pin` | [#928](https://github.com/officefish/Membrana/issues/928) | dynin | open |
| **F3** | `pf-f3-morning-wiring` | [#929](https://github.com/officefish/Membrana/issues/929) | ozhegov | open |
| **F4** | `pf-f4-pattern` | [#930](https://github.com/officefish/Membrana/issues/930) | ozhegov | open |
| **F5** | `pf-f5-closure` | [#931](https://github.com/officefish/Membrana/issues/931) | vesnin | open |

## Gate (к F5)

- [ ] ADR шов `pin?` / `pins[]`
- [ ] `frames[]` в validateProcedure; живущие процедуры зелёные без frames
- [ ] `auditPins` + тесты 4 исходов; кит на том же ядре
- [ ] `morning-wiring` в ritual-day + 3 двери + зов на старте ритуала
- [ ] Паттерны PINNED_* / GROUP_* уточнены (`copies=1`)
- [ ] Приёмка #900 · LGTM · archive

## Хвост №2 (вне критического пути)

CI анти-дубль оговорки GROUP_CONTAINERIZATION → отдельная карточка **dynin** или deferred в CLOSURE.

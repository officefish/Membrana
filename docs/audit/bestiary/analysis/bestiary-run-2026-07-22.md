# bestiary-run-2026-07-22

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Head SHA | c582fd97 |
| Source | yarn bestiary:weekly |
| Engines | `scripts/lib/lens-bestiary.mjs` |
| Lens status | ran |
| Objects scanned | 5 |
| Objects readable | 5 |
| Findings total | 5 |
| Previous snapshot | — (нет предыдущего снимка) |

## Summary

**Вердикт:** ran — прогнано 5 объектов, findings=5.

> Контракт аудитора: видимый Summary всегда; `not-run` ≠ `clean`; нет silent-green пустого отчёта.

| defectClass | Label | Hits | Δ vs prev | Coverage |
|-------------|-------|:----:|:---------:|----------|
| `silent` | Молчун | 1 | — | ✅ |
| `unwired` | Половина без провода | 1 | — | ✅ |
| `ornament` | Украшение | 1 | — | ✅ |
| `jargon-out` | Жаргон наружу | 1 | — | ✅ |
| `echo` | Эхо-камера | 1 | — | ✅ |

**Покрытие specimens:** 5/5.

## Trend

Предыдущего снимка нет — базовая линия этой недели.

## Findings

- [`silent`] docs/audit/bestiary/specimens/silent/swallow.mjs:9 — пустой catch — ошибка съедена без следа
- [`unwired`] docs/audit/bestiary/specimens/unwired/orphan-export.mjs:6 — export bestiarySpecimenUnwiredOrphanExport — потребителей 0 (провод не кинут)
- [`ornament`] docs/audit/bestiary/specimens/ornament/unread-write.mjs:7 — пишет docs/NEVER_READ_BESTIARY_ORNAMENT_SPECIMEN.md — читателей 0 (украшение)
- [`jargon-out`] docs/audit/bestiary/specimens/jargon-out/external-jargon.mjs:7 — внутреннее имя «MAIN_DAY_ISSUE» рядом с внешним запросом
- [`echo`] docs/audit/bestiary/specimens/echo/triple-reflection.mjs:7 — origin-hash fa419d2 ×3 без dedupeByOrigin (эхо = n=1, не 3)

## Anti-silent

| Check | Result |
|-------|--------|
| Summary section present | ✅ |
| Lens status | `ran` |
| not-run conflated with clean | ✅ no |
| Silent-hunter (0 findings on live specimens) | ✅ no |


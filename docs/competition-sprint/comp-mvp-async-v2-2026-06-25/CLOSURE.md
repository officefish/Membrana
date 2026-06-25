# Competition Sprint — Closure

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-async-v2-2026-06-25` |
| **closed** | 2026-06-25 |
| **winner** | Team **Beta** (203.5 weighted) |
| **outcome** | Packaging validated on `v2.0-async` runtime; **bundled MVP unchanged** |

---

## Решение

Sprint закрыт после Phase 5 polish на winner fork. Три async-v2 fork **архивированы** (не в picker); winner polish: gamma ⑤⑥ titles + alpha RU copy на beta async groups.

| id | Codename | Functions | Polish |
|----|----------|-----------|--------|
| `usercase-mvp-microphone-beta-async-v2` | beta (**winner**) | 3 | ✅ Phase 5 cherry-pick |
| `usercase-mvp-microphone-alpha-async-v2` | alpha | 4 | archived |
| `usercase-mvp-microphone-gamma-async-v2` | gamma | 3 | archived |

Bundled production: **`usercase-mvp-microphone`** (`bundledGraphVersion: v2.0-async`).

---

## Что доказано

1. `packMvpUserCaseForTeamAsyncV2` + team-specific `TEAM_ASYNC_V2_PRE_COLLAPSES`
2. `yarn usercase:verify-competition-async-v2` — layout + prerun ×3
3. C7 Async clarity в scorecard; Beta wins modularity (+1.0 over Alpha)
4. Embedded export names fixed (`*_ASYNC_V2_DOCUMENT`)

---

## Артефакты

| Artifact | Path |
|----------|------|
| Brief | [`COMPETITION_SPRINT_BRIEF.md`](./COMPETITION_SPRINT_BRIEF.md) |
| Consilium | [`docs/discussions/competition-sprint-comp-mvp-async-v2-2026-06-25-consilium.md`](../../discussions/competition-sprint-comp-mvp-async-v2-2026-06-25-consilium.md) |
| Scorecard | [`SCORECARD.md`](./SCORECARD.md) |
| Winner | [`WINNER.md`](./WINNER.md) |
| Archive README | [`docs/archive/competition-sprint/comp-mvp-async-v2-2026-06-25/README.md`](../../archive/competition-sprint/comp-mvp-async-v2-2026-06-25/README.md) |
| Loaders | `archived-competition-user-case-entries.ts` → `ARCHIVED_COMPETITION_ASYNC_V2_*` |

---

## Deferred

| ID | Task |
|----|------|
| F7-AV2 | Live operator smoke on winner fork (`smoke v2.0-async: PASS`) |
| MERGE-AV2 | Merge winner ideas into bundled MVP — product decision |
| CAT-AV2 | **done** — [`comp-packaging-catalog-2026-06-25`](../comp-packaging-catalog-2026-06-25/COMPETITION_PACKAGING_SPRINT_BRIEF.md) |

F7 не блокирует closure: bundled v2.0-async smoke baseline + verify-prerun green (см. [`PHASE_2B_GATE.md`](./PHASE_2B_GATE.md)).

---

## Rebuild

```bash
yarn usercase:build-competition-async-v2-all
yarn usercase:verify-competition-async-v2
```

*Sprint comp-mvp-async-v2-2026-06-25 — closed.*

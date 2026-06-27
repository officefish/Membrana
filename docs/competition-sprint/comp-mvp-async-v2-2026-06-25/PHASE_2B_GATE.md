# Phase 2β Gate — comp-mvp-async-v2-2026-06-25

| Поле | Значение |
|------|----------|
| **Gate** | Phase 2β → **3** (consilium) |
| **Reviewer** | Vesnin (Teamlead) |
| **Date** | 2026-06-25 |
| **Verdict** | **LGTM** |

## Checklist

- [x] `packMvpUserCaseForTeamAsyncV2` + `TEAM_ASYNC_V2_PRE_COLLAPSES` (alpha / beta / gamma)
- [x] `yarn usercase:build-competition-async-v2-all`
- [x] `yarn usercase:verify-competition-async-v2` — layout + prerun green ×3
- [x] `usercase-competition-async-v2-pack.test.ts` — 5/5 pass
- [x] CI `usercase-competition.yml` — async-v2 verify path
- [x] `CONCEPT.md` §Implementation 2β (все команды)
- [ ] **F7 operator smoke** — *deferred* (см. ниже)

## F7 deferral (binding for Phase 3–4)

Соревнование — **packaging** поверх bundled **v2.0-async** (`competitionBase`). Runtime topology не менялась.

| Evidence | Status |
|----------|--------|
| Bundled MVP operator smoke | PASS — [`DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md`](../../actions/device-board/sign-offs/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md) |
| Competition forks `verify-prerun` | PASS ×3 |
| Live browser Run ≥60s per fork | **Deferred** — не блокирует consilium (прецедент v1: RUN-01) |

**Follow-up:** после выбора победителя — один operator smoke на winner fork + `yarn logs:parse` → `smoke v2.0-async: PASS`.

**Closed @** `914d3f0` (pack `316660a`)

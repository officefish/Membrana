# OPEN: device-board async pipeline v1 sprint

**Epic:** `device-board-async-pipeline-v1`  
**Промпт:** [`DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md`](../../prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md)  
**Product umbrella:** `usercase-mvp-v2-groups-async` (W1)  
**Дата открытия:** 2026-06-25  
**Статус:** **closed** (R12 docs/signoff 2026-06-25)

---

## Цель

Ввести **production-grade async orchestration** для device-board: Promise nodes, latent Sequence, `AsyncJobStore`, non-blocking main tick. Закрыть гонку `drone-skip: track-not-in-journal` на bundled MVP microphone **без** потери trends publish parity.

**Выбранный вариант:** максимальное качество (Sequence latent + Promise nodes + core contracts + agenda hub) — не minimal bridge shim.

---

## Baseline (до спринта)

| Run | Gate | Trends publish | upload-ok | drone-skip |
|-----|------|----------------|-----------|------------|
| `7e8a289c` | 10 | 10 | 3 | 9 |

Parse: `yarn logs:parse -- --run-id 7e8a289c`

**Проблема:** sync exec path на gate ждёт report/publish; upload async, track-report sync → race.

---

## Блокер P0 — Operator / Teamlead

- [x] **P0.1** LGTM на ADR AD1–AD7 — Teamlead Vesnin 2026-06-25
- [x] **P0.2** GitHub Issue **#176** в `registry.json`
- [x] **P0.3** Ветка `vesnin` на remote — checkout для R1–R2
- [x] **P0.4** Trends sync на gate — **keep** (AD3, operator default)

---

## Фазы (registry)

| Phase | id | Статус | PR / branch |
|-------|-----|--------|-------------|
| R0 Consilium + spec | `db-ap-r0-consilium-spec` | **done** | #176 |
| R1 Core contracts | `db-ap-r1-core-contracts` | **done** | `db-ap-r1-core-contracts` |
| R2 Sequence latent config | `db-ap-r2-core-sequence-latent` | **done** | `db-ap-r1-core-contracts` |
| R3 AsyncJobStore | `db-ap-r3-async-job-store` | **done** | `db-ap-r1-core-contracts` |
| R4 Latent runtime | `db-ap-r4-sequence-latent-runtime` | **done** | `db-ap-r1-core-contracts` |
| R5 Promise nodes editor | `db-ap-r5-promise-nodes-editor` | **done** | `db-ap-r1-core-contracts` |
| R6 Promise executor | `db-ap-r6-promise-nodes-executor` | **done** | `db-ap-r1-core-contracts` |
| R7 Host bridge | `db-ap-r7-host-bridge-jobs` | **done** | `db-ap-r1-core-contracts` |
| R8 Detached events | `db-ap-r8-detached-event-dispatch` | **done** | `db-ap-r1-core-contracts` |
| R9 MVP graph v2 | `db-ap-r9-mvp-graph-v2` | **done** | `db-ap-r1-core-contracts` |
| R10 Agenda hub | `db-ap-r10-agenda-async-hub` | **done** | `db-ap-r1-core-contracts` |
| R11 Observability | `db-ap-r11-observability-tests` | **done** | `db-ap-r1-core-contracts` |
| R12 Docs + signoff | `db-ap-r12-docs-signoff` | **done** | LGTM + docs |

---

## Operator acceptance (closure)

| # | Критерий | Target | Статус |
|---|----------|--------|--------|
| A1 | gate windows ≥ 2 @ 60s | PASS | fixture PASS |
| A2 | trends publish = gate | PASS | design + golden |
| A3 | drone-skip happy path | **0** | fixture PASS; **live run pending** |
| A4 | main-tick без upload wait | PASS | unit PASS |
| A5 | upload-ok ≥ 2 | PASS | **live run pending** |
| A6 | async-job chain-log | present | fixture PASS |
| A7 | CI turbo green | PASS | local test matrix green |

---

## Superseded

| id | Причина |
|----|---------|
| `ucv2-2-freeze-async-tracks` | Заменён полным эпиком `device-board-async-pipeline-v1` |
| `ucv2-3-pack-verify` | → `db-ap-r11` + `db-ap-r12` |
| `ucv2-4-operator-signoff` | → `db-ap-r12` |

---

## Команды

```bash
yarn usercase:build-mvp-microphone
yarn logs:parse -- --run-id <new-after-smoke>
node --test scripts/client-logs-parser.test.mjs
yarn workspace @membrana/device-board test -- src/runtime/async-pipeline-observability.test.ts
```

---

## CLOSURE

**Дата:** 2026-06-25  
**LGTM:** [`DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md`](../../device-board-scripts/DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md)  
**Docs:** CONCEPT §16.5.2 · `SCENARIO_RUNTIME.md` §10 · catalog `device-board.md` · `CLIENT_LOGS_PARSING.md`

**Осталось operator (post-merge):**

1. Browser Run ≥60s на bundled v2.0-async
2. `yarn logs:parse -- --run-id <id>` → `smoke v2.0-async: PASS`, `drone-skip: 0`
3. PR merge → `yarn task:archive device-board-async-pipeline-v1` (по запросу)
4. Close Issue #176

**Baseline → target:** `7e8a289c` drone-skip **9** → v2.0 happy path **0**.

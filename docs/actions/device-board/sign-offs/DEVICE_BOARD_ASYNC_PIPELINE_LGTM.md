# Device-board async pipeline v1 — LGTM

> **Date:** 2026-06-25  
> **Epic:** `device-board-async-pipeline-v1` · GitHub Issue [#176](https://github.com/officefish/Membrana/issues/176)  
> **Branch:** `db-ap-r1-core-contracts` (core on `vesnin` policy AD5)  
> **Канон:** CONCEPT §16.5.2 · [`SCENARIO_RUNTIME.md`](../SCENARIO_RUNTIME.md) §10 · bundled golden [`usercase-mvp-microphone-v20-async.document.json`](./golden/usercase-mvp-microphone-v20-async.document.json)

## Вердикт

**Async pipeline AP v1 реализован end-to-end:** core contracts, `AsyncJobStore`, latent Sequence, Promise nodes (editor + runtime), detached `on-async-resolved`, host bridge (`startAsyncJob`), bundled MVP graph **v2.0-async**, agenda `ScenarioAsyncJobHub`, observability (`yarn logs:parse` smoke v2.0-async).

**Цель эпика:** снять гонку `drone-skip: track-not-in-journal` на bundled microphone **без** потери trends publish parity (ADR AD3).

---

## ADR (Teamlead LGTM 2026-06-25)

| ID | Решение |
|----|---------|
| AD1 | `latentThen` — канон non-blocking orchestration; `parallelAsync` только для pure branches |
| AD2 | Drone report только после `track-upload` resolved (detached `on-async-resolved`) |
| AD3 | Trends publish sync на gate |
| AD4 | `maxPendingTrackUploads = 3` |
| AD5 | Core contracts — ветка `vesnin` |
| AD6 | Node names: Start Async Job, Await Promise, On Async Resolved, Cancel Async Jobs |
| AD7 | Bundled graph meta `bundledGraphVersion: v2.0-async` |

---

## Фазы R0–R12 (code)

| Phase | Статус | Пакет / область |
|-------|--------|-----------------|
| R0 Consilium + spec | **PASS** | docs, Issue #176 |
| R1 Core contracts | **PASS** | `@membrana/core` |
| R2 `latentThen` config | **PASS** | `@membrana/core` |
| R3 AsyncJobStore | **PASS** | `@membrana/device-board` |
| R4 Latent runtime | **PASS** | `exec-sequence.ts` |
| R5 Promise nodes editor | **PASS** | graph + validators |
| R6 Promise executor | **PASS** | `block-executor`, runtime |
| R7 Host bridge | **PASS** | `apps/client` `scenarioMicJournalBridge.ts` |
| R8 Detached dispatch | **PASS** | `event-dispatch.ts` |
| R9 MVP graph v2.0-async | **PASS** | golden + migrate + codegen |
| R10 Agenda hub | **PASS** | `@membrana/agenda` |
| R11 Observability | **PASS** | `client-logs-parser.mjs`, unit tests |
| R12 Docs + signoff | **PASS** | этот файл + CONCEPT + SCENARIO_RUNTIME |

---

## Operator acceptance (A1–A7)

| # | Критерий | Статус | Доказательство |
|---|----------|--------|----------------|
| A1 | Run ≥60s, ≥2 gate windows | **PASS** (unit/fixture) | `client-logs-parser.test.mjs` v20 fixture · `async-pipeline-observability.test.ts` |
| A2 | Trends publish = gate | **PASS** (design + tests) | AD3; gate Then-2 sync path в v20 golden |
| A3 | `drone-skip: 0` happy path | **PASS** (fixture) | `smokeV20Async.passV20HappyPath` · `drone-skip-regression-v20` |
| A4 | Main tick без upload wait | **PASS** (unit) | `main-tick-blocked-ms` / latent Then tests |
| A5 | `upload-ok ≥ 2` | **pending operator** | требует browser run ≥60s post-deploy |
| A6 | Async chain-log markers | **PASS** (fixture) | `async-job-start`, `resolved`, `sequence-latent-then-start` |
| A7 | CI turbo green | **PASS** (local) | core + device-board + agenda tests listed in sprint OPEN |

> **Operator smoke (live browser):** после merge — Run ≥60s, `yarn logs:parse -- --run-id <new>` → секция `smoke v2.0-async: PASS`, `drone-skip: 0`. Baseline до cutover: `7e8a289c` (drone-skip: 9).

---

## Bundled topology v2.0-async (summary)

```text
gate-true → Sequence [latentThen]
  Then 0: StopRecording
  Then 1: MakeTrack → StartAsyncJob(track-upload)
  Then 2: Flush → trends → PublishReport (sync)
  Then 3: fn-3 → fn-1 (loop)
Detached: on-async-resolved → MakeReportFromTrack → PublishReport (drone)
```

**Migrate:** `needsBundledV20AsyncMigration` при load v0.9 → v2.0.  
**Build:** `yarn usercase:build-mvp-microphone`.

---

## Не входит в LGTM

- Formal Playwright E2E на реальном mic (headless ограничения)
- `yarn task:archive` / Issue close — по запросу operator после live smoke
- PR merge на `main` / `vesnin`

---

## Связанные документы

- [`USERCASE_MVP_MICROPHONE.md`](./USERCASE_MVP_MICROPHONE.md) — bundled usercase (v2.0-async)
- [`USERCASE_MVP_MICROPHONE_LGTM.md`](./USERCASE_MVP_MICROPHONE_LGTM.md) — v0.8 / v0.9 addenda (история)
- [`CLIENT_LOGS_PARSING.md`](./CLIENT_LOGS_PARSING.md) — `smoke v2.0-async`
- Consilium: [`device-board-async-pipeline-consilium-2026-06-25.md`](../discussions/device-board-async-pipeline-consilium-2026-06-25.md)

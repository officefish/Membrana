# Промпт (эпик): Device-Board — async pipeline (Promise nodes, latent Sequence, non-blocking runtime)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`device-board-async-pipeline-v1`** · дочерние `db-ap-r0` … `db-ap-r12`  
> **Родитель (product wave W1):** `usercase-mvp-v2-groups-async`  
> **Статус:** **active** — day sprint открыт 2026-06-25  
> **Ветка (core/contracts):** **`vesnin`** — обязательна для публичных типов `@membrana/core`  
> **Пакеты:** `@membrana/core`, `@membrana/device-board`, `@membrana/agenda` (тонкий hub), `apps/client`, `docs/device-board-scripts`

---

## Контекст

Bundled **v0.9-functions** прошёл operator smoke (`runId 7e8a289c`): 10 recording windows, 10 trends `publish-done`, async `upload-ok` отстаёт, **9× `drone-skip: track-not-in-journal`**.

**Корневая причина:** exec hot path на gate-true **синхронно** проходит `MakeTrack → … → MakeReportFromTrack → PublishReport`, хотя upload уже fire-and-forget. `parallelAsync` Sequence ждёт `Promise.all` — **не** освобождает main tick. Bridge-hotfix (callback на `upload-ok`) — костыль без canvas-контракта.

**Цель эпика (максимальное качество):** production-grade **async orchestration** для track → analysis → report → publish:

1. Main loop (~60 Hz) **не блокируется** на I/O (media upload, journal publish, drone analysis).
2. Зависимости выражены **на графе** (Promise nodes + latent Sequence), не только в bridge.
3. Event-driven continuations с backpressure, abort и chain-log correlation.
4. MVP microphone graph v2 — groups + async topology + operator sign-off.

**Предшественники (не дублировать):**

| Артефакт | Статус |
|----------|--------|
| [`DEVICE_BOARD_BUNDLED_MVP_V09_SPRINT_PROMPT.md`](./DEVICE_BOARD_BUNDLED_MVP_V09_SPRINT_PROMPT.md) | closed — cutover v0.9 |
| [`DEVICE_BOARD_EXEC_SEQUENCE_EPIC_PROMPT.md`](./DEVICE_BOARD_EXEC_SEQUENCE_EPIC_PROMPT.md) | closed PR #168 — sync + `parallelAsync` |
| `ucv2-2-freeze-async-tracks` | **superseded** этим эпиком |

**Baseline log:** `runId 7e8a289c` · [`CLIENT_LOGS_PARSING.md`](../actions/device-board/CLIENT_LOGS_PARSING.md)

**Consilium + Perplexity:** [`docs/discussions/device-board-async-pipeline-consilium-2026-06-25.md`](../discussions/device-board-async-pipeline-consilium-2026-06-25.md)

**Day sprint:** [`docs/day-sprint/device-board-async-pipeline-v1-sprint-2026-06-25/OPEN.md`](../day-sprint/device-board-async-pipeline-v1-sprint-2026-06-25/OPEN.md)

**GitHub Issue:** [#176](https://github.com/officefish/Membrana/issues/176)

---

## Product / tech scope

### In scope

#### AP1 — Core async contracts (`vesnin`)

Новые **value/reference types** и runtime-agnostic контракты в `@membrana/core`:

| Тип | Назначение |
|-----|------------|
| `ScenarioPromiseRef` | Handle на in-flight async job (`promiseId`, `kind`, `correlation`) |
| `ScenarioAsyncJobState` | `pending` \| `resolved` \| `rejected` \| `cancelled` |
| `ScenarioAsyncJobKind` | `track-upload` \| `report-build` \| `journal-publish` \| `custom` |
| `ScenarioAsyncJobCorrelation` | `{ runId, tick?, branch, nodeId, startedAtMs }` |
| `ScenarioSequenceLatentMode` | Расширение `ScenarioSequenceConfig`: `latentThen: boolean` (Then стартует, **не блокирует** следующий Then) |

Новые **`nodeKind`** (палитра + runtime):

| nodeKind | Exec | Data in | Data out | Семантика |
|----------|------|---------|----------|-----------|
| `start-async-job` | exec-in → exec-out (immediate) | impure inputs per `jobKind` config | `PromiseRef` | Старт job в `AsyncJobStore`; **не await** |
| `await-promise` | exec-in → exec-out (latent) | `PromiseRef` | optional result ref | Блокирует **только эту** exec-цепочку до resolve/reject/timeout |
| `on-async-resolved` | — | `PromiseRef` | `event-out` (square) | Multicast при resolve (event edge) |
| `cancel-async-jobs` | exec-in → exec-out | optional filter (`jobKind`, `nodeId`) | — | Abort pending jobs (onStop / gate overflow) |

**Impure nodes — явный `supportsAsync: true`** для:

- `make-track`, `make-report-from-track`, `make-report-from-analysis`, `publish-report`
- user-function subgraph blocks (если тело помечено async-capable)

Pure / orchestration nodes — по `resolveScenarioGraphNodeSupportsAsync` (уже есть).

#### AP2 — Runtime `AsyncJobStore` (`device-board`)

| Модуль | Ответственность |
|--------|----------------|
| `runtime/async-job-store.ts` | Регистрация, resolve/reject, cancel, max depth, coalescing |
| `runtime/async-job-dispatch.ts` | Bridge host I/O → job lifecycle |
| `runtime/exec-sequence.ts` | **Latent Then** mode (отдельно от `parallelAsync`) |
| `runtime/event-dispatch.ts` | `detach: true` для fire-and-forget event branches |
| `runtime/block-executor.ts` | `start-async-job`, `await-promise`, fire-and-continue для `supportsAsync` |

**Инварианты:**

- Main tick gate path: **StopRecording → FFT trends publish → StartRecording** — sync budget **&lt; 50 ms** (без upload/drone).
- Upload / track-report / второй publish — **только** через async jobs + event/`await-promise`.
- Abort: `signal.aborted` отменяет pending jobs с тем же `runId`.
- Backpressure: `maxPendingJobsPerKind` (default 3 track-upload); overflow → `async-job-dropped` chain-log.

#### AP3 — Host bridge (`apps/client`)

`scenarioMicJournalBridge.ts`:

- `createTrackFromRecordingSliceRef` → регистрирует `track-upload` job; `uploadTrackAsync` resolve/reject job.
- `makeReportFromTrack` / `publishReport` — job kinds `report-build`, `journal-publish`.
- Убрать sync `MakeReportFromTrack` с hot path в bundled graph (перенос на `on-async-resolved`).

#### AP4 — Graph editor

- Палитра, pins, inspector (`jobKind`, timeoutMs, `latentThen` на Sequence).
- Pre-run validators: `await-promise` без upstream `PromiseRef`; latent + impure без `supportsAsync`.
- Optional pin `?` на `PromiseRef` где nullable.

#### AP5 — MVP graph v2 (`usercase-mvp-microphone`)

Целевая топология gate-true:

```text
is-recording-window-full [true]
  → Sequence [sync, latentThen on track branch]
      Then 0: StopRecording
      Then 1: StartAsyncJob(track-upload) → PromiseRef P1
      Then 2: FlushSpectralAnalyser → MakeFftTrendsAnalysis
              → MakeReportFromAnalysis → PublishReport (trends)
      Then 3: StartRecording (fn-1)
  → loop-repeat

Parallel event branch (detached):
  on-async-resolved(P1) → MakeReportFromTrack → PublishReport (drone)
```

Groups/collapse: `fn-UploadPipeline`, `fn-TrendsPublish` (ucv2-1).

#### AP6 — Observability

Новые chain-log маркеры:

| Маркер | Когда |
|--------|-------|
| `async-job-start` | job зарегистрирован |
| `async-job-resolved` / `async-job-rejected` | terminal state |
| `async-job-cancelled` | abort / overflow |
| `promise-await-start` / `promise-await-done` | await-promise node |
| `sequence-latent-then-start` | latent Then dispatched |

Расширить `scripts/lib/client-logs-parser.mjs`: поля `asyncJobs`, `drone-skip` regression, `main-tick-blocked-ms`.

#### AP7 — `@membrana/agenda` (тонкий слой)

`ScenarioAsyncJobHub` — **не** общий event bus продукта; тонкий publish/subscribe для:

- runtime → client UI (pending jobs badge, optional)
- future: remote runtime MP7b WS `runtime.asyncJob`

Зависит только от `@membrana/core` types. **Не** тянуть device-board в agenda.

### Out of scope

- Полный порт UE Delay/Timeline nodes.
- Cabinet `live-records` 500 (infra follow-up).
- `referencedFunctions[]` export schema (отдельный PR).
- Web Worker для drone DSP (future; v1 — main thread с detached exec).
- Изменение audio-engine / worklet path.
- Night Build автономный прогон без operator smoke.

---

## Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Core contracts | `packages/core/src/contracts/device-board/` | `PromiseRef`, job types, node kinds, sequence latent |
| Core tests | `packages/core/src/contracts/device-board/*.test.ts` | Serialization, validators |
| Async store | `packages/device-board/src/runtime/async-job-*` | Job lifecycle, no DOM |
| Sequence latent | `packages/device-board/src/runtime/exec-sequence.ts` | Then dispatch modes |
| Event detach | `packages/device-board/src/runtime/event-dispatch.ts` | Non-blocking branches |
| Nodes editor | `packages/device-board/src/graph/*-async-*.ts` | Palette, pins, inspector |
| Block executor | `packages/device-board/src/runtime/block-executor.ts` | Node dispatch |
| Host | `apps/client/.../scenarioMicJournalBridge.ts` | I/O jobs |
| Agenda hub | `packages/agenda/src/scenario-async-job-hub.ts` | UI subscription facade |
| UserCase | `docs/device-board-scripts/golden/`, `default-usercase-*.generated.ts` | v2 graph |
| Docs | `DEVICE_BOARD_CONCEPT.md` §16.5.2, `SCENARIO_RUNTIME.md` §12 | Canon |

**Запрещено:**

- Web Audio / `new AudioContext()` вне audio-engine.
- Прямые `useMembranaStore.registerModule` — только `MembranaRegistry`.
- Bridge-only async без graph nodes (кроме interim shim с TTL ≤ 1 PR).
- Блокировать main tick на `await` upload/publish/drone.
- Смешивать `parallelAsync` (Promise.all) и `latentThen` без документации в inspector.

**Perplexity / engine semantics (R0 frozen):**

- Fire-and-forget = start job + immediate exec-out.
- Latent await = suspend **ветку**, не весь runtime.
- Completion = event-out (`on-async-resolved`) preferred для fan-out.
- Backpressure + cancel обязательны.

---

## Фазы спринта (registry)

| Фаза | Task id | Размер | Ответственный | Артефакт | PR target |
|------|---------|--------|---------------|----------|-----------|
| **R0** | `db-ap-r0-consilium-spec` | S | **Vesnin** | Consilium doc + ADR table + Issue | `vesnin` |
| **R1** | `db-ap-r1-core-contracts` | L | **Vesnin** + Dynin | core: PromiseRef, job types, node kinds | `vesnin` |
| **R2** | `db-ap-r2-core-sequence-latent` | M | **Dynin** | `sequenceConfig.latentThen`, tests | `vesnin` |
| **R3** | `db-ap-r3-async-job-store` | L | **Ozhegov** | `AsyncJobStore`, cancel, backpressure | `ozhegov` |
| **R4** | `db-ap-r4-sequence-latent-runtime` | M | **Ozhegov** | `exec-sequence` latent mode | `ozhegov` |
| **R5** | `db-ap-r5-promise-nodes-editor` | L | **Rodchenko** + Ozhegov | palette, pins, inspector, validators | `rodchenko` |
| **R6** | `db-ap-r6-promise-nodes-executor` | L | **Ozhegov** | block-executor + pre-run | `ozhegov` |
| **R7** | `db-ap-r7-host-bridge-jobs` | M | **Ozhegov** + Kuryokhin | scenarioMicJournalBridge job wiring | `ozhegov` |
| **R8** | `db-ap-r8-detached-event-dispatch` | M | **Ozhegov** | detach event branches, abort | `ozhegov` |
| **R9** | `db-ap-r9-mvp-graph-v2` | L | **Ozhegov** + Rodchenko | golden + codegen + groups | `ozhegov` |
| **R10** | `db-ap-r10-agenda-async-hub` | M | **Ozhegov** | `ScenarioAsyncJobHub` in agenda | `ozhegov` |
| **R11** | `db-ap-r11-observability-tests` | M | **Dynin** | chain-log, logs:parse, vitest matrix | `dynin` |
| **R12** | `db-ap-r12-docs-signoff` | S | **Vesnin** | CONCEPT, LGTM, `yarn task:archive` | `vesnin` |

**Порядок PR (default):**

```text
R0 → R1 ‖ R2 → R3 → R4 → R5 → R6 → R7 ‖ R8 → R9 → R10 → R11 → R12
```

**Merge gate:** каждый PR — `yarn turbo run lint typecheck test build --filter=@membrana/core --filter=@membrana/device-board --filter=@membrana/agenda --filter=@membrana/client --continue`

---

## R0 — Consilium & spec (обязательно до кода)

| # | Действие | Артефакт |
|---|----------|----------|
| R0.1 | Прочитать baseline log `7e8a289c` через `yarn logs:parse` | JSON snapshot в sprint OPEN |
| R0.2 | Consilium (≥20 реплик) или approve [`consilium-2026-06-25.md`](../discussions/device-board-async-pipeline-consilium-2026-06-25.md) | `docs/discussions/` |
| R0.3 | Зафиксировать ADR: latent vs parallelAsync, node names, max pending jobs | § Product decisions ниже |
| R0.4 | GitHub Issue + `githubIssue` в registry | Issue #TBD |
| R0.5 | Teamlead LGTM на ADR | комментарий в Issue |

### Product decisions (R0 — draft для LGTM)

| ID | Решение |
|----|---------|
| **AD1** | **Latent Sequence** (`latentThen: true`) — канон для «start async, continue graph». `parallelAsync` — только для truly parallel **pure** branches. |
| **AD2** | Track drone report — **только** после `async-job-resolved(track-upload)`; убрать sync `MakeReportFromTrack` с gate hot path. |
| **AD3** | Trends publish остаётся **sync на gate** (LGTM L4 v0.9 сохраняем). |
| **AD4** | `maxPendingTrackUploads = 3`; overflow → drop oldest + `async-job-cancelled`. |
| **AD5** | Core changes → ветка **`vesnin`**; device-board/client → `ozhegov` / `techies68` после merge vesnin. |
| **AD6** | Promise node names в палитре: **Start Async Job**, **Await Promise**, **On Async Resolved**. |
| **AD7** | Bundled graph version bump: `usercase-mvp-microphone` **v2.0-async** (meta field). |

---

## Operator acceptance (P5 / R12)

| # | Критерий | Проверка |
|---|----------|----------|
| A1 | Run ≥ 60 s, ≥ 2 gate windows | `yarn logs:parse` → `gate windows ≥2` |
| A2 | Trends publish = gate count | `publish-done` (trends) = gate ticks |
| A3 | **Нет** stable `drone-skip` на happy path | `drone-skip: 0` после 10 windows |
| A4 | Main tick не ждёт upload | `main-tick-done` elapsed **без** `upload-ok` на том же tick |
| A5 | ≥ 2 `upload-ok` до или после Stop | tracks на server |
| A6 | Async markers в chain-log | `async-job-start` / `resolved` correlated |
| A7 | CI green device-board + core + client | turbo filter |

---

## Definition of Done (эпик)

- [x] Core: `ScenarioPromiseRef`, async job types, 4 new node kinds, `latentThen` — exported + tested.
- [x] Runtime: `AsyncJobStore`, latent Sequence, promise nodes, detached event dispatch.
- [x] Host: track/report/publish как jobs; hot path без sync drone report.
- [x] MVP graph v2 в bundled default; `yarn usercase:build-mvp-microphone` green.
- [ ] `yarn logs:parse` на **новом live runId** → operator smoke **PASS** (A1–A7) — fixture PASS; browser run pending.
- [x] CONCEPT §16.5.2 + `SCENARIO_RUNTIME.md` §10 + catalog device-board абзац.
- [x] `DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md`.
- [ ] Teamlead LGTM live smoke; Issue closed; `yarn task:archive device-board-async-pipeline-v1` — по operator после merge.

---

## Промпт целиком (для агента)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Реализуй эпик **device-board-async-pipeline-v1** по фазам **R0–R12**.
>
> **Шаг 0:** Прочитай `docs/discussions/device-board-async-pipeline-consilium-2026-06-25.md`, `runId 7e8a289c` parse output, `exec-sequence.ts`, `event-dispatch.ts`, `scenarioMicJournalBridge.ts` (upload path), `scenario-node-async.ts`. Подтверди ADR AD1–AD7.
>
> **Шаг 1 (R0):** Issue + LGTM. Без R0.5 не начинать core commits.
>
> **Шаг 2 (R1–R2, vesnin):** Core contracts — `ScenarioPromiseRef`, `ScenarioAsyncJob*`, node kinds `start-async-job` | `await-promise` | `on-async-resolved` | `cancel-async-jobs`; `ScenarioSequenceConfig.latentThen`. Unit tests.
>
> **Шаг 3 (R3–R4):** `AsyncJobStore`; latent `runSequenceThenBranches`; не ломать sync/`parallelAsync`.
>
> **Шаг 4 (R5–R6):** Editor + `block-executor` для promise nodes; pre-run validators.
>
> **Шаг 5 (R7–R8):** Bridge job registration; detached `dispatchCollectEventBranches`.
>
> **Шаг 6 (R9):** MVP graph v2 + groups; golden JSON; codegen.
>
> **Шаг 7 (R10):** `ScenarioAsyncJobHub` в agenda (subscribe only).
>
> **Шаг 8 (R11–R12):** logs:parse, smoke, docs, archive.
>
> **Формат ответа:** virtual team labels + файлы + PR plan. **Не** расширять scope без Issue.
>
> **Ветка:** core → `vesnin`; интеграция → `techies68` после merge.

---

## Порядок работы ролей

1. **Teamlead** — ADR, vesnin gate, operator sign-off.
2. **Математик** — job state machine, backpressure, parse metrics.
3. **Структурщик** — AsyncJobStore, executor, agenda hub, validators.
4. **Музыкант** — gate sync budget, recording restart invariant, smoke mic.
5. **Верстальщик** — promise nodes UI, Sequence latent checkbox, chain-log INFO tooltips.

---

## Заметки для постановщика

1. Создать GitHub Issue (`imperfection`): «Device-board async pipeline: Promise nodes + non-blocking runtime».
2. Реестр: `device-board-async-pipeline-v1` + `db-ap-r0`…`r12` (уже в `registry.json`).
3. Утро: `yarn main-day-issue` → focus `db-ap-r0-consilium-spec` или текущая фаза.
4. Consilium опционально: `yarn consilium "Async pipeline: latent Sequence vs Promise nodes для Membrana device-board"`.
5. После merge: `yarn task:archive device-board-async-pipeline-v1 --notes "PR #…"`.

### Проверка после каждого PR

```bash
yarn workspace @membrana/core test
yarn workspace @membrana/device-board test
yarn usercase:build-mvp-microphone
yarn logs:parse -- --file logs/apps/client/logs.txt
yarn turbo run lint typecheck test build --filter=@membrana/device-board --filter=@membrana/core --continue
```

---

## Связь с дорожной картой

- **W1** `usercase-mvp-v2-groups-async` — product umbrella; этот эпик закрывает async + groups.
- Supersedes: `ucv2-2-freeze-async-tracks` (archived/superseded).
- Depends: `device-board-exec-sequence-ux` (Sequence node shipped).

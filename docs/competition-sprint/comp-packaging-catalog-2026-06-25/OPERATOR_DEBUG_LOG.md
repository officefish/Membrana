# Operator debug log — comp-packaging-catalog-2026-06-25

> Регламент: [`COMPETITION_OPERATOR_DEBUG_REGULATION.md`](../../prompts/COMPETITION_OPERATOR_DEBUG_REGULATION.md)  
> Parent competition: `comp-mvp-async-v2-2026-06-25` · Registry: [`competition-operator-findings-registry.json`](../../device-board-scripts/competition-operator-findings-registry.json)

| Поле | Значение |
|------|----------|
| **opened** | 2026-06-25 |
| **operator** | human + agent |
| **smoke gate** | `smoke v2.0-async: PASS`, Run ≥60s |

---

## Queue (последовательно)

| # | Team | fork id | Status | smoke | notes |
|---|------|---------|--------|-------|-------|
| 1 | Alpha | `usercase-mvp-microphone-alpha-async-v2` | `pass` | PASS | run `9afa0b80` · v20 happy path · #179 |
| 2 | Beta | `usercase-mvp-microphone-beta-async-v2` | `pass` | PASS | run `51448c9b` · 4 gate/upload/trends · v20 happy path · operator OK |
| 3 | Gamma | `usercase-mvp-microphone-gamma-async-v2` | `pass` | PASS | run `6d19b6eb` · 4 gate/upload/trends · v20 happy path · operator OK |

**Правило:** fork N+1 только после `pass` на fork N (или documented `blocked` handoff).

---

## Findings (ODF cards)

### ODF-av2-alpha-001

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` · operator **pass** (`9afa0b80`) |
| **lesson** | `L13` |
| **runId** | `2d906cf2` |
| **symptom** | `gate-true: 0` · `publish-done: 0` · main tick only `main-on-tick` (337×); server journal empty |
| **root cause** | `stripBundledUserFunctionBlocks` удалил `fn-3-block` (GetAudioStream) — нет exec от `main-on-tick`; gate collapse потерял `exec-true-out → sequence` |
| **fix** | `usercase-competition-pack.ts`: preserve `fn-3` + main-tick entry; `repairAsyncV2MainLoopWiring`; rebuild `usercase:build-competition-async-v2-all` |
| **prevention** | Phase 1 CONCEPT: на `v2.0-async` не strip bundled tick entry; verify `main-on-tick → fn-3-block` в pack test |
| **commit** | pending (packaging closure PR) |

**Console noise (не блокер Alpha):** React Flow `#008` на `fn-gamma-*` — артефакт загрузки всех fork в picker, не alpha graph.

### ODF-av2-alpha-002

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` · operator **pass** (`9afa0b80`) |
| **lesson** | `L14` |
| **runId** | `6cdcbfa7` |
| **symptom** | tick=1 crash: `ResolveInputError: fn-alpha-recording-gate-input is not a data source` at collect-samples |
| **root cause** | После collapse `recording-gate-block.recorder → collect-samples.recorder` — collect-samples выполняется **до** gate subgraph; output pin не резолвится без `resolveFunctionInputPin` |
| **fix** | `repairAsyncV2MainLoopWiring`: убрать gate→collect recorder edge; `node-get-recorder-mqs6hyo6-171.recorder → collect-samples` |
| **prevention** | Pack test: collect-samples recorder from main GetRecorder, not gate output |
| **commit** | pending (packaging closure PR) |

### ODF-av2-alpha-004

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` · operator **pass** |
| **lesson** | `L16` |
| **issue** | [#178](https://github.com/officefish/Membrana/issues/178) · PR [#179](https://github.com/officefish/Membrana/pull/179) |
| **runId** | `9afa0b80` (pass) · prior `043ec8d6` (fail) |
| **symptom** | `gate-true: 3` · `publish-done: 3` · `upload-ok: 0` · `async rejected: 3` · `detached: 0` · `v20 happy path: FAIL` |
| **root cause** | (1) **Client race:** `void reconfigureMediaLibraryFromConnection()` at startup — first `importBlob` мог стартовать до `ensureReserved`/`__buffer__`. (2) **Server:** `ensure-reserved` синхронно гонял catalog provision → зависание на advisory lock (диаг до restart: hang; после restart: 0.11s). Квота/диск **не** причина (buffer ~53MB/1GB, upload smoke 201). |
| **fix** | Client: `whenMediaLibraryConfigured()` перед upload; `importBlob` → `ensureReservedCollections`; upload-failed логирует `code`. Server: deferred catalog в `ensure-reserved`; VPS hotfix `yarn media:prod:hotfix-deploy`. |
| **serverDiag** | `yarn media:prod:diag` · upload 201 · ensure-reserved 0.11s post-restart · disk 84% warn |
| **prevention** | `yarn media:diag` в packaging smoke; L16 в lessons; restart runbook при hung ensure-reserved |

### ODF-av2-alpha-003

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` · operator **pass** (`9afa0b80`) |
| **lesson** | `L15` |
| **runId** | `1d779790` |
| **symptom** | 137 ticks alive, `gate-true: 0` · `publish-done: 0` · collect append ok, window never full |
| **root cause** | Pack strip удалил `fn-1-block` (StartRecording) с **initial** — `recordingSessions` не стартуют, `isRecorderWindowFull` всегда false |
| **fix** | preserve `fn-1`+`fn-1-block`; `repairAsyncV2InitialStartRecording`; sequence `then-3 → fn-3-block-2 → fn-1-block` restart |
| **prevention** | Pack test: initial `start-streaming → fn-1-block`; CONCEPT: bundled StartRecording на initial |
| **commit** | pending (packaging closure PR) |

### ODF-av2-beta-001

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-beta-async-v2` |
| **status** | `resolved` · operator **pass** |
| **lesson** | `L17` |
| **runId** | `07222603` |
| **symptom** | 174 ticks · `gate-true: 0` (parser) · `upload-ok: 1` · `publish-report: 0` · `make-track: 2` · window full stuck after tick 49 |
| **root cause** | Два exec-reбра с `gate exec-out`: прямое `→ fn-beta-async-upload-pipeline-block` (collapse) и repair `→ sequence`. Runtime берёт **первое** — sequence/then-2 trends и then-3 restart никогда не выполняются |
| **fix** | `repairAsyncV2MainLoopWiring`: strip direct `gate exec-out → async-upload-pipeline-block`; `sequence then-0 → upload block` (как Alpha `then-0 → start-async-job`) |
| **prevention** | Pack test beta: нет direct gate→upload exec; есть sequence then-0→upload и then-2→trends |
| **commit** | pending (packaging closure PR) |

### ODF-av2-beta-002

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-beta-async-v2` |
| **status** | `resolved` · operator **pass** (`51448c9b`) · L18/L19 non-blocking backlog |
| **lesson** | `L18` · `L19` |
| **runId** | `f73b167b` (partial fail) · `51448c9b` (pass) |
| **symptom** | 1 track · 1 trends report · gate×2 (tick 44, 77) · `v20 happy path: FAIL` · operator: UI freeze ~2300 console lines · Stop на tick 77 |
| **root cause** | **L17 OK:** sequence→upload→trends (publish tick 63). **L18:** 2-й gate (77) `stop-recording-empty` — clip blob пустой при активном session timer. **L19:** `event-dispatch-detached-error` в upload-pipeline on-async-resolved. **Freeze:** не бесконечный loop — 2315 строк лога (~30/tick) + на tick 77 коллизия `upload-ok` / `lib-snapshot` (457ms) с gate в одном main tick при открытом DevTools |
| **fix** | L18: clip recorder restart после then-3 (client). L19: detached dispatch pins в collapsed pipeline. Smoke: DevTools закрыть, ≥60s |
| **prevention** | Operator: не смотреть console во время smoke; parser `main-tick-blocked-on-upload` как WARN |

### ODF-av2-beta-003

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-beta-async-v2` |
| **status** | `resolved` · operator **pass** |
| **lesson** | — |
| **runId** | `51448c9b` |
| **symptom** | ~15 s operator · 4 tracks · 4 reports · чистый звук · реалистичные отчёты |
| **metrics** | gate-true: 4 (ticks 31, 62, 91, 118) · upload-ok: 4 · publish/trends: 4 · async rejected: 0 · v20 happy path: **PASS** |
| **notes** | `detached=2` (drone detached в upload-pipeline) — не блокер; FFT trends = gate |

### ODF-av2-gamma-001

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-gamma-async-v2` |
| **status** | `resolved` · re-smoke **pass** (`6d19b6eb`) |
| **lesson** | `L20` |
| **runId** | `8f3a86c6` |
| **symptom** | 103 ticks · `gate-true: 1` · `upload-ok: 1` · `publish-done: 0` · `latent-then: 0` · ~3030 console lines |
| **root cause** | L17 repair искал только `async-upload-pipeline`; Gamma сворачивает upload в `fn-gamma-async-live-bundle-block` — прямое `gate exec-out → bundle` обходило sequence (как Beta до L17) |
| **fix** | `findCollapsedAsyncExecTarget`: `async-live-bundle` + strip direct gate→bundle; `sequence then-0 → bundle`; gamma pack test; rebuild `.generated.ts` |
| **prevention** | Pack test gamma: нет direct gate→live-bundle exec |

### ODF-av2-gamma-002

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-gamma-async-v2` |
| **status** | `resolved` · operator **pass** |
| **lesson** | — |
| **runId** | `6d19b6eb` |
| **symptom** | ~15 s · 4+ tracks · 4+ reports · чистый звук · реалистичные отчёты |
| **metrics** | gate-true: 4 (ticks 24, 51, 104, 142) · upload-ok: 4 · publish/trends: 4 · v20 happy path: **PASS** |
| **notes** | `detached=3` non-blocking; parser FAIL в UI — stale `logs-parse.txt` (run `8f3a86c6`) |

---

## Session notes

| Date | Fork | Action |
|------|------|--------|
| 2026-06-25 | Alpha | ODF-av2-alpha-001 diagnosed; pack fix + rebuild |
| 2026-06-25 | Alpha | #178 sprint opened; `yarn media:diag` + `importBlob` init fix |
| 2026-06-25 | Alpha | pass `9afa0b80` — 3 gate / 3 upload / 3 trends · v20 happy path PASS |
| 2026-06-25 | Beta | operator smoke started |
| 2026-06-25 | Beta | ODF-av2-beta-001 fail `07222603` · L17 gate bypass sequence · pack fix + rebuild |
| 2026-06-25 | Beta | partial `f73b167b` · L18 stop-empty tick 77 · console freeze |
| 2026-06-25 | Beta | **pass** `51448c9b` — 4 gate / 4 upload / 4 trends · operator sign-off |
| 2026-06-25 | Gamma | fail `8f3a86c6` · L20 live-bundle bypass · pack fix |
| 2026-06-25 | Gamma | **pass** `6d19b6eb` — 4 gate / 4 upload / 4 trends · operator sign-off |

---

## Closure checklist

- [x] Alpha `pass`
- [x] Beta `pass`
- [x] Gamma `pass`
- [x] All ODF → `resolved`
- [x] L13+ updated (L17–L20)
- [x] JSON registry synced
- [x] GATE operator items checked

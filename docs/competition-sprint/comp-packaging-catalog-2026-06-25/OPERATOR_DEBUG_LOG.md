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
| 1 | Alpha | `usercase-mvp-microphone-alpha-async-v2` | `in_progress` | FAIL | #178 upload-ok=0 · L13–L15 resolved |
| 2 | Beta | `usercase-mvp-microphone-beta-async-v2` | `pending` | — | winner |
| 3 | Gamma | `usercase-mvp-microphone-gamma-async-v2` | `pending` | — | |

**Правило:** fork N+1 только после `pass` на fork N (или documented `blocked` handoff).

---

## Findings (ODF cards)

### ODF-av2-alpha-001

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` (L13 + L14 local fix, re-smoke pending) |
| **lesson** | `L13` |
| **runId** | `2d906cf2` |
| **symptom** | `gate-true: 0` · `publish-done: 0` · main tick only `main-on-tick` (337×); server journal empty |
| **root cause** | `stripBundledUserFunctionBlocks` удалил `fn-3-block` (GetAudioStream) — нет exec от `main-on-tick`; gate collapse потерял `exec-true-out → sequence` |
| **fix** | `usercase-competition-pack.ts`: preserve `fn-3` + main-tick entry; `repairAsyncV2MainLoopWiring`; rebuild `usercase:build-competition-async-v2-all` |
| **prevention** | Phase 1 CONCEPT: на `v2.0-async` не strip bundled tick entry; verify `main-on-tick → fn-3-block` в pack test |
| **commit** | pending |

**Console noise (не блокер Alpha):** React Flow `#008` на `fn-gamma-*` — артефакт загрузки всех fork в picker, не alpha graph.

### ODF-av2-alpha-002

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` (local fix, re-smoke pending) |
| **lesson** | `L14` |
| **runId** | `6cdcbfa7` |
| **symptom** | tick=1 crash: `ResolveInputError: fn-alpha-recording-gate-input is not a data source` at collect-samples |
| **root cause** | После collapse `recording-gate-block.recorder → collect-samples.recorder` — collect-samples выполняется **до** gate subgraph; output pin не резолвится без `resolveFunctionInputPin` |
| **fix** | `repairAsyncV2MainLoopWiring`: убрать gate→collect recorder edge; `node-get-recorder-mqs6hyo6-171.recorder → collect-samples` |
| **prevention** | Pack test: collect-samples recorder from main GetRecorder, not gate output |
| **commit** | pending |

### ODF-av2-alpha-004

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` (client + server fix; browser re-smoke pending) |
| **lesson** | `L16` |
| **issue** | [#178](https://github.com/officefish/Membrana/issues/178) |
| **runId** | `043ec8d6` |
| **symptom** | `gate-true: 3` · `publish-done: 3` · `upload-ok: 0` · `async rejected: 3` · `detached: 0` · `v20 happy path: FAIL` |
| **root cause** | (1) **Client race:** `void reconfigureMediaLibraryFromConnection()` at startup — first `importBlob` мог стартовать до `ensureReserved`/`__buffer__`. (2) **Server:** `ensure-reserved` синхронно гонял catalog provision → зависание на advisory lock (диаг до restart: hang; после restart: 0.11s). Квота/диск **не** причина (buffer ~53MB/1GB, upload smoke 201). |
| **fix** | Client: `whenMediaLibraryConfigured()` перед upload; `importBlob` → `ensureReservedCollections`; upload-failed логирует `code`. Server: deferred catalog в `ensure-reserved`; VPS hotfix `yarn media:prod:hotfix-deploy`. |
| **serverDiag** | `yarn media:prod:diag` · upload 201 · ensure-reserved 0.11s post-restart · disk 84% warn |
| **prevention** | `yarn media:diag` в packaging smoke; L16 в lessons; restart runbook при hung ensure-reserved |

### ODF-av2-alpha-003

| Поле | Значение |
|------|----------|
| **fork** | `usercase-mvp-microphone-alpha-async-v2` |
| **status** | `resolved` (local fix, re-smoke pending) |
| **lesson** | `L15` |
| **runId** | `1d779790` |
| **symptom** | 137 ticks alive, `gate-true: 0` · `publish-done: 0` · collect append ok, window never full |
| **root cause** | Pack strip удалил `fn-1-block` (StartRecording) с **initial** — `recordingSessions` не стартуют, `isRecorderWindowFull` всегда false |
| **fix** | preserve `fn-1`+`fn-1-block`; `repairAsyncV2InitialStartRecording`; sequence `then-3 → fn-3-block-2 → fn-1-block` restart |
| **prevention** | Pack test: initial `start-streaming → fn-1-block`; CONCEPT: bundled StartRecording на initial |
| **commit** | pending |

---

## Session notes

| Date | Fork | Action |
|------|------|--------|
| 2026-06-25 | Alpha | ODF-av2-alpha-001 diagnosed; pack fix + rebuild |
| 2026-06-25 | Alpha | #178 sprint opened; `yarn media:diag` + `importBlob` init fix |

---

## Closure checklist

- [ ] Alpha `pass`
- [ ] Beta `pass`
- [ ] Gamma `pass`
- [ ] All ODF → `resolved`
- [ ] L13+ updated (if new classes)
- [ ] JSON registry synced
- [ ] GATE operator items checked

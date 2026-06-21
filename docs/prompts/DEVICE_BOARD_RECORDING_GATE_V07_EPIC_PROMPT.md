# Промпт (эпик): Device-Board Recording Gate v0.7 — узлы StartRecording / observation window

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Эпик** · **Размер:** **L** (фазы R0–R4, один день)
> **Реестр:** `id` = **`db-recording-gate-v07`**
> **Предшественник:** [`DEVICE_BOARD_REALTIME_OBSERVATION_EPIC_PROMPT.md`](./DEVICE_BOARD_REALTIME_OBSERVATION_EPIC_PROMPT.md) (runtime P0–P3 archived)
> **Канон MVP:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §16.5

**GitHub Issue:** [#133](https://github.com/officefish/Membrana/issues/133)

**Ветка:** `vesnin` (контракты `@membrana/core` + node kinds)

---

## Контекст

Interim P0–P3 закрыл **runtime** (async MakeTrack, observation bundle, frame trends), но **граф main loop**
всё ещё на CollectSamples + dual event flush. Целевой MVP (§16.5) требует:

```text
AudioStream → StartRecording(policy)
  → each tick: FFT append + if duration > policy.windowSec:
       StopRecording → MakeTrack → StartRecording
       FlushSpectralAnalyser → MakeFftTrendsAnalysis → MakeReportFromAnalysis → PublishReport
```

**Узлов StartRecording / StopRecording / gate в палитре нет** — граф собрать невозможно.

**Цель дня:** узлы в палитре + executor + эталонный JSON + smoke (~20 obs/min, один publish).

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Эпик — прямое продолжение db-realtime-observation-pipeline. Merge-order R0→R4 на vesnin.
CollectSamples остаётся в core для миграции JSON, но **не** в каноническом main MVP.
DoD дня: пользователь собирает граф на борде без CollectSamples; LGTM + archive.

[Структурщик — Ozhegov]:
R0 в @membrana/core: nodeKind + RecordingPolicy + RecordingSliceRef (или расширение MakeTrack in).
RecorderRecordingState в host (device-board runtime + client bridge), не в device-board→client цикл.
Запрещено: второй AudioContext; логика записи в block-executor — только делегирование host ports.

[Математик — Dynin]:
Gate: recorder.elapsedSec >= policy.windowSec (монотонные часы host, не tick count).
Инвариант: после StopRecording slice.length/sampleRate ≈ windowSec ± один tick jitter.
Flush analyser на том же exec-ветке gate-true — атомарный «observation window».

[Музыкант]:
StartRecording подписывается на AudioStream через audio-engine (LiveSampler path в bridge).
StopRecording → непрерывный PCM slice (crossfade на стыке rolling restart — reuse P0).
Smoke: 60 s mic → ≥15 publish-done, нет щелчков на preview, uploadMode async.

[Верстальщик — Rodchenko]:
Палитра: категория «Запись» — start/stop/window-full/flush-spectral.
Inspector: RecordingPolicy (windowSec default 3) на StartRecording — правый сайдбар.
Suggest modal: stream→start-recording, recorder→stop/make-track/window-full.
```

---

## Фазы (один день)

| Фаза | `id` | PR scope | DoD |
|------|------|----------|-----|
| **R0** | `db-recording-gate-r0-contracts` | `@membrana/core` | `SCENARIO_NODE_KINDS` += `start-recording`, `stop-recording`, `is-recording-window-full`, `flush-spectral-analyser`; `RecordingPolicy`, `DEFAULT_RECORDING_POLICY`; schema doc version bump if needed |
| **R1** | `db-recording-gate-r1-graph-nodes` | `@membrana/device-board` | Pin defs, palette, suggest, factory tests для 4 node kinds |
| **R2** | `db-recording-gate-r2-host-bridge` | `device-board` runtime + `apps/client` bridge | `RecorderRecordingSession`: start/stop/elapsed/slice; host ports; chain-log |
| **R3** | `db-recording-gate-r3-executor` | `block-executor`, `createScenarioRuntimeHost` | Execute 4 nodes; MakeTrack accepts slice ref; gate E2E test |
| **R4** | `db-recording-gate-r4-scenario-smoke` | `docs/device-board-scripts/*.json`, cookbook | `device-scenario-microphone-main-v07.json`; README/cookbook; manual smoke checklist |

**Параллельность:** R1 после R0; R2 может стартовать с stub pins после R0; R3 после R2; R4 после R3.

---

## Контракт узлов (R0)

| nodeKind | Label | Inputs | Outputs |
|----------|-------|--------|---------|
| `start-recording` | StartRecording | exec, `RecorderRef`, `AudioStreamRef`, `RecordingPolicy?` | exec, `RecorderRef` |
| `stop-recording` | StopRecording | exec, `RecorderRef` | exec, `RecordingSliceRef` |
| `is-recording-window-full` | IsRecordingWindowFull | exec, `RecorderRef`, `windowSec?` | exec-false, exec-true |
| `flush-spectral-analyser` | FlushSpectralAnalyser | exec, `SpectralAnalyserRef` | exec, `FftFrameRefList` |

**RecordingPolicy:** `{ windowSec: number }` — default `3` (из `DEFAULT_SCENARIO_COLLECTOR_CONFIG`).

**RecordingSliceRef:** handle `recording-slice:{deviceHandle}:{seq}`; host хранит PCM до MakeTrack.

**MakeTrack (расширение R3):** data-in: `RecorderRef` + (`RecordingSliceRef` | legacy `AudioSampleRefList`).

---

## Host ports (R2)

```typescript
// ScenarioRuntimeHost (client bridge implements)
startRecorderRecording(deviceHandle, streamRef, policy): boolean
stopRecorderRecording(deviceHandle): RecordingSliceMeta | null
getRecorderElapsedSec(deviceHandle): number
isRecorderWindowFull(deviceHandle, windowSec): boolean
// flushSpectralAnalyserSession — уже есть
```

Bridge reuse: `ScenarioContinuousPcmBuffer` → internal buffer при StartRecording; Stop → takeSlice.

---

## Канонический граф (R4 JSON)

```text
onTick → isValid(mic) → GetAudioStream → isValid(stream) → set audiostream1
  → GetRecorder → StartRecording(stream, policy)   [once / idempotent]
  → GetSample → GetFFTFrame → CollectFftFrames.append ONLY (windowSec disabled / flush off)
  → IsRecordingWindowFull(3s)
       false → ∞
       true → StopRecording → MakeTrack(slice) → StartRecording
            → FlushSpectralAnalyser → MakeFftTrendsAnalysis → MakeReportFromAnalysis → PublishReport
            → ∞
```

**Не использовать:** CollectSamples, MakeReportFromTrack, drone publish.

Файл: `docs/device-board-scripts/device-scenario-microphone-main-v07.json`

---

## Тесты

| Область | Минимум |
|---------|---------|
| core R0 | `isScenarioNodeKind`, policy defaults, serialize round-trip |
| device-board R1 | pin resolution tests per node |
| runtime R3 | exec-subgraph: window-full false skips; true runs stop→track→flush→publish |
| client bridge R2 | unit: start→append via stream→elapsed→slice |

---

## Definition of Done (эпик)

- [ ] 4 node kinds в палитре v0.4; suggest modal соединяет stream/recorder/analyser
- [ ] Main MVP JSON v0.7 импортируется и Run без CollectSamples
- [ ] ~3 s → один `observation-wrap-done` + `publish-done`; `uploadMode: async`
- [ ] Journal: Trends FFT renderer; нет `device-board-scenario/v1`
- [ ] `yarn turbo run lint typecheck test --continue` green (core, device-board, client)
- [ ] LGTM Vesnin; `yarn task:archive` R0–R4 + epic

---

## Out of scope (сегодня)

- Server-side encode queue (background-media)
- Удаление CollectSamples из core (deprecated, migrate later)
- SSE journal push
- Alarm loop refactor

---

## Smoke (ручной)

1. Hard refresh client (`vesnin`)
2. Import `device-scenario-microphone-main-v07.json`
3. Run 60 s → console `[device-board]`: `recording-window-full`, `stop-recording`, `uploadMode:async`, `observation-wrap-done`, `publish-done`
4. Cabinet journal: «Анализатор тенденций FFT»

---

## Связь с дорожной картой

- **db-realtime-observation-pipeline** — runtime/interim (archived)
- **db-recording-gate-v07** — graph + nodes (этот эпик) → **центральный MVP device-board**

# Промпт (эпик): Device-Board Realtime Observation Pipeline

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Эпик** · **Размер:** **L** (фазы P0–P3 + целевой MVP v0.7)
> **Реестр:** `id` = **`db-realtime-observation-pipeline`**
> **Канон MVP:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §16.3–§16.5

**GitHub Issue:** _(создать при triage)_

---

## Контекст (проблема legacy)

Main loop v0.5–v0.6 писал треки через **CollectSamples → N×GetSample → concat → sync MakeTrack → upload**,
блокируя tick (~200 ms+), давал щелчки на стыках PCM и публиковал **два** отчёта (drone + trends).
Alarm `write-journal` слал `device-board-scenario/v1` без рендера (+ cabinet 500).

**Центральная цель MVP device-board:** непрерывное наблюдение с микрофона — **~20 observation bundles/min**
(окно **3 s**), в каждом bundle **один отчёт + linked trackId**, loop **не блокируется**,
preview-трек **без артефактов**, trends = **«Анализатор тенденций FFT»**.

**Консенсус:** [`docs/device-board-scripts/logs/info.txt`](../device-board-scripts/logs/info.txt) + team consilium 2026-06-18.

**Ветка:** `vesnin`

---

## Целевой MVP: путь от AudioStream до journal (v0.7)

Единая точка входа — **`AudioStreamRef`** после `GetAudioStream(microphone)`.
Дальше **два параллельных конвейера**, сходящиеся в **одном gate** по длительности записи.

### Конвейер A — PCM / трек (Recorder)

```text
GetRecorder(device)
  → StartRecording(recorder, audioStream, recordingPolicy)
       │  host: непрерывная запись PCM в буфер Recorder (не ref-queue CollectSamples)
       ▼
  [каждый main tick]
       if recorder.elapsedSec >= recordingPolicy.windowSec:
         StopRecording(recorder)           → slice буфера
         MakeTrack(recorder, slice)        → trackId sync; upload async
         StartRecording(recorder, stream)  → rolling window
```

### Конвейер B — спектр / trends (SpectralAnalyser)

```text
GetSpectralAnalyser(device)
  → [каждый main tick]
       GetSample(audioStream) → GetFFTFrame → analyserQueue.append(frame)
       │  queue крутится независимо от PCM; без PCM round-trip для trends (P3)
       ▼
  [на том же gate, что и StopRecording]
       FlushAnalyserQueue → FftFrameRefList (очистка queue)
         → MakeFftTrendsAnalysis(frames)
         → MakeReportFromAnalysis → ReportRef (schema device-board-observation/v1, trackId)
         → PublishReport(journal)
```

### Gate (один `if` на tick)

```text
if (recorder.realDurationSec > recordingPolicy.windowSec):
  ├─ A: StopRecording → MakeTrack → StartRecording
  └─ B: FlushAnalyser → MakeFftTrendsAnalysis → MakeReportFromAnalysis → PublishReport
```

**RecordingPolicy** (на вход `StartRecording`): `{ windowSec: 3, … }` — defaults см. `DEFAULT_SCENARIO_COLLECTOR_CONFIG.windowSec`.

**Не в MVP:** `CollectSamples`, `MakeReportFromTrack`, drone publish, второй `PublishReport`.

### Interim (P0–P3, уже в коде до v0.7-узлов)

Поведение gate и bundle **частично эмулируется** через Collect + host buffer:

| Целевой узел v0.7 | Interim (сейчас) |
|-------------------|------------------|
| `StartRecording(stream, policy)` | `CollectSamples.append` + `ScenarioContinuousPcmBuffer` |
| `StopRecording` + slice | `flushRecorderSession` + `takeSlice()` |
| `MakeTrack(recorder, slice)` | `createTrackFromSampleRefs` (async upload) |
| Gate по duration | `CollectSamples` / `CollectFftFrames` flush по `windowSec` |
| Observation bundle | `makeReportFromAnalysis` → `device-board-observation/v1` |
| Flush analyser queue | `flushSpectralAnalyserSession` на CollectFftFrames event |

Эталонный JSON для сверки топологии: [`device-scenario-microphone-main (3).json`](../device-board-scripts/device-scenario-microphone-main%20(3).json).
Целевой JSON после сборки на борде — заменит interim.

---

## Фазы (выполнено + follow-up)

| Фаза | `id` | Содержание | Статус |
|------|------|------------|--------|
| **P0** | `db-observation-p0-quick-wins` | windowSec=3; crossfade; async MakeTrack; no drone publish; alarm skip | archived |
| **P1** | `db-observation-p1-continuous-buffer` | Host PCM ring; MakeTrack from slice | archived |
| **P2** | `db-observation-p2-bundle` | `device-board-observation/v1`; linked trackId; renderers | archived |
| **P3** | `db-observation-p3-frame-trends` | Trends из FftFrame metrics; stateful flux | archived |
| **v0.7** | _(follow-up)_ | Graph nodes: `start-recording`, `stop-recording`, `is-recording-window-full`; убрать CollectSamples из main | planned |

---

## Definition of Done (целевой MVP)

- [ ] Main loop ≥8 Hz при active monitoring (upload async)
- [ ] Gate каждые ~3 s → **один** observation bundle в journal
- [ ] Trends UI = TrendsFftReportView; нет «нет совместимого рендера»
- [ ] Preview-трек без слышимых щелчков (continuous recorder buffer, не ref-concat)
- [ ] Граф на борде = §16.5 `DEVICE_BOARD_CONCEPT.md` (StartRecording gate, без CollectSamples)
- [ ] `yarn turbo run lint typecheck test --continue` green
- [ ] LGTM Vesnin

---

## Out of scope

- Server-side async encode job (background-media queue) — follow-up
- SSE journal push

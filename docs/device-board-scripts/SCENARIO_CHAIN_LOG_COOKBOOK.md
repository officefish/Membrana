# Expected log chain — microphone MVP scenario

Сценарий: [`device-scenario-microphone-main-mvp.json`](./device-scenario-microphone-main-mvp.json)  
Task: `db-scenario-chain-trace-p0` … `db-scenario-chain-trace-p3`  
Фильтр консоли: `[device-board]`

Включите чекбокс **INFO** на device-board. Сохраняйте вывод в [`logs/info.txt`](./logs/info.txt).

## Correlation fields

Каждая строка chain-log должна содержать (когда применимо):

| Поле | Источник |
|------|----------|
| `runId` | 8-char UUID, один на прогон |
| `tick` | номер main tick |
| `branch` | `main` |
| `nodeId` | активный узел bridge (MakeTrack и т.д.) |

## Server correlation (Phase 2)

`X-Membrana-Trace-Id: {runId}-{tick}` (например `b19f0e03-58`)

На сервере pino логирует поле `traceId` рядом с `reqId`. SSH:

```bash
docker logs background-media 2>&1 | grep 'b19f0e03-58'
```

Клиентский `runId` в консоли и `traceId` на сервере совпадают по префиксу до `-`.

## Export trace (Phase 3)

На шапке device-board (Run controls):

- **INFO** — вкл/выкл запись в буфер и консоль
- **Copy trace (N)** — буфер обмена, формат как в консоли (`[INFO] [device-board]…`)
- **↓** — скачать `device-board-trace-{runId}.txt`

Буфер очищается при каждом `scenario-run-start`. Фильтр DevTools: `[device-board]`.

## Нормальный прогон (один flush по windowSec=5)

### 1. Старт

```
[device-board] scenario-run-start { runId, device, linked: true }
[device-board] main-tick-start { runId, tick: 1, branch: 'main' }
```

### 2. Каждый tick (повторяется)

```
[device-board][capture] start → ok { sampleId, rms, captureWaitMs }
[device-board] get-sample …
[device-board][collect] recorder-append-ok { queueDepth }
[device-board][fft] ok …
[device-board][collect] analyser-append-ok …
[device-board] main-tick-done { tick, detected: false }
```

### 3. Flush tick (~28 samples при windowSec=5)

```
[device-board][collect] recorder-flush { batchSize: N }
[device-board] collect-event-dispatch { targets: [...] }
[device-board] node-enter … make-track …
[device-board][track] start → concat-ok { trackId, durationSec, title via upload-start }
```

### 4. Media upload (критичный участок)

```
[device-board][media] upload-start { title: 'MakeTrack …', wavBytes }
[device-board][media] lib-importBlob-start { skipRefresh: true }
[device-board][media] lib-putSample-start
[device-board][media] lib-putSample-done { sampleId, elapsedMs }
[device-board][media] lib-snapshot-merge-start
[device-board][media] lib-snapshot-merge-done { elapsedMs }
[device-board][media] lib-importBlob-done
[device-board][media] upload-ok { sampleId }
```

При `skipRefresh: true` (scenario runtime) **нет** `lib-refresh-*` / `lib-listSamples-done` по tariff catalog.

Старый путь (UI upload без skipRefresh) по-прежнему делает полный `refresh`.

### 5. Journal + reports

```
[device-board][journal] appendTrack-start → [track] done
[device-board] collect-event-dispatch-done { elapsedMs }
[device-board] event-branch-done { startNodeId, elapsedMs }
[device-board] make-report-from-track …
[device-board][report] drone-analysis-start → drone-analysis-done
[device-board][journal] publish-start → publish-done
[device-board] main-tick-done { tick }
```

## Типичные сбои

| Последняя строка | Причина |
|------------------|---------|
| `[media] upload-start` без `lib-putSample-done` | сеть / CORS / 401 media API |
| `lib-putSample-done` без `lib-snapshot-merge-done` | ошибка mergeImportedSample / getQuota |
| `lib-putSample-done` без `lib-refresh-done` (UI path) | медленный refresh tariff catalog |
| `upload-ok` без `appendTrack-start` | исключение в journal service |
| `drone-skip track-not-in-journal` | appendTrack не вызван или другой trackId |
| `capture timeout` | sampler не успел за 100ms (tick пропускает collect) |

## Команды

```bash
yarn workspace @membrana/media-library-service test
yarn workspace @membrana/device-board test
yarn recording-parity:smoke-matrix
```

---

## v0.8 Recording gate (clipRecorder parity)

Сценарии:

- Legacy policy: [`device-scenario-microphone-main-v07.json`](./device-scenario-microphone-main-v07.json) (`variable-get` RecordingPolicy)
- Constructor: [`device-scenario-microphone-main-v08-policy-constructor.json`](./device-scenario-microphone-main-v08-policy-constructor.json) (`MakeRecordingPolicy → StartRecording`)

Smoke checklist: [`DB_RECORDING_PARITY_SMOKE_MATRIX.md`](./DB_RECORDING_PARITY_SMOKE_MATRIX.md)

### Нормальный цикл gate (один window)

Bundled MVP (`usercase-mvp-microphone`): **первый** `[recording] start-recording` — в ветке **onStart**
(после `StartStreaming`), не на каждом main tick. Main ticks до gate-true идут без повторного
`start-recording` (сессия уже активна).

```
[device-board] scenario-run-start { runId, … }
… onStart branch …
[device-board][recording] start-recording { windowSec, captureFormat, encoder: 'worklet'|'mediarecorder' }
… main ticks: [capture] ok, GetRecorder → gate (exec-false) …
[device-board][recording] recording-window-full { windowSec }
[device-board][recording] stop-recording { handle, durationSec, captureFormat, encoder, blobBytes }
[device-board][track] slice-start { durationSec, captureFormat, mimeType via upload }
[device-board][recording] start-recording { … }   ← restart path only (after StopRecording)
[device-board][media] upload-start { captureFormat, mimeType, durationSec }
[device-board][media] upload-ok
[device-board][track] done
```

### Маркеры `start-recording` vs `start-recording-idempotent`

Источник: `scenarioMicJournalBridge.startRecorderRecording` (client bridge).

| Chain-log маркер | Когда появляется | Интерпретация |
|------------------|------------------|---------------|
| `start-recording` | Сессия записи **не** была активна; открыт новый clip | **Норма:** onStart bootstrap или restart после `stop-recording` |
| `start-recording-idempotent` | Exec `StartRecording`, но `session.isActive()` уже true | **Предохранитель:** host не открывает второй clip. Если видите на **каждом** tick — антипаттерн топологии |
| `start-recording-skip` | `invalid-stream` / `no-stream` | StartStreaming / mic не live — чинить поток, не граф |
| Pre-run `start-recording-unconditional-loop-path` | Lint до Run (warning) | `StartRecording` exec-достижим от `onTick` без `StopRecording` ранее на пути |

**Канон MVP:** один `start-recording` в onStart + редкие `start-recording` на gate-true; **не** `start-recording-idempotent` на каждом tick.

Operator note в инспекторе узла `start-recording` и CONCEPT §15.5.1 согласованы с этой таблицей.

### Типичные сбои (v0.8)

| Последовательность | Причина |
|--------------------|---------|
| `start-recording-idempotent` на каждом main tick | bootstrap на hot path лупа — исправить граф; см. [`USERCASE_MVP_MICROPHONE.md`](./USERCASE_MVP_MICROPHONE.md) § topology |
| `start-recording-skip` reason `no-stream` | StartStreaming / mic module не live |
| `stop-recording-empty` | clipRecorder не успел / stream muted |
| `durationSec` << windowSec | старый tick-chunk path (реgress) |
| preview ускорен | неверный `durationSec`/`sampleRate` в journal vs blob |
| `encoder: worklet` отсутствует на WAV | не задеплоен A1 bridge |

# Промпт (эпик): Device-Board Collectors v0.5 — Recorder, SpectralAnalyser, Collect*, event-порты

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Task-эпик** (7 PR) · **Размер:** **L** (фазы DBC0–DBC6)
> **Ожидаемый артефакт:** последовательные PR; каждый `Closes` подзадачу в GitHub Issue эпика.
> **Реестр:** `id` = **`device-board-collectors-v05`** в [`docs/tasks/registry.json`](../tasks/registry.json)
> **Консенсус:** [`seanses/device-board-collectors-v05-2026-06-20.md`](../seanses/device-board-collectors-v05-2026-06-20.md)
> **Канон streaming v0.4:** [`apps/docs/concepts/streaming-lifecycle.mdx`](../../apps/docs/concepts/streaming-lifecycle.mdx)

**GitHub Issue:** [#130](https://github.com/officefish/Membrana/issues/130).

---

## Контекст продукта

На device-board уже есть цепочка **MicrophoneRef → StartStreaming → AudioStreamRef → GetSample → GetFFTFrame**
(host: `ScenarioMicJournalBridge`). Треки в journal сегодня идут через legacy **`record-chunk`** (WAV blob),
FFT/trends — через chunk + `analyzeChunkTrendsFft`, без явных **очередей** и **event-веток**.

Этот эпик вводит **device-scoped singletons** и **Collect-узлы** с **квадратным event-out**, terminal **NewTrack**
/ **NewFftTrendsAnalysis** (вход — **массив ref’ов**), конфигурацию Collect **только в правом сайдбаре**
(defaults из mic plugins).

**Принятые MVP-решения (2026-06-20):**

| # | Решение |
|---|---------|
| 1 | Policy на singleton **заморожена**; настройки Collect — `node.data.collectorConfig` + правый сайдбар |
| 2 | NewTrack / NewFftTrendsAnalysis: data-in = **`AudioSampleRef[]` / `FftFrameRef[]`** |
| 3 | **GetFFTFrame — отдельный узел**; Sample ≠ Frame; канон: `GetSample → GetFFTFrame → CollectFftFrames` |
| 4 | Multicast event на singleton — в host; MVP QA **одного** Collect |
| 5 | Flush: `queueCapacity` **OR** `windowSec` (что раньше) |

**Что уже есть (опора):**

| Область | Где |
|---------|-----|
| GetSample / GetFFTFrame | `packages/device-board` palette + `block-executor` + bridge |
| LiveSampler defaults | `microphone-stream-viz`: FFT 2048, smoothing 0.75 |
| Window collector | `mic-live-drone-analysis/streamWindowCollector.ts`: `windowSec` |
| Journal track | `telemetry-journal-service` + `writeJournal` / `appendTrack` |
| Trends | `analyzeChunkTrendsFft`, `@membrana/template-match-detector-service` |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | §1b audio-engine; границы пакетов |
| [`SERVICES.md`](../SERVICES.md) | foundation vs analyzer |
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | v0.4 → дополнение v0.5 collectors |
| [`DESIGN.md`](../DESIGN.md) | event-handle UI, сайдбар |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | ветка `vesnin` для core-контрактов |

**Ветка:** контракты `@membrana/core` (DBC0) — **`vesnin`**, LGTM Vesnin. Остальные фазы — feature-ветки от актуального `main` / `vesnin` после merge DBC0.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Singletons принадлежат Device, не Microphone. DBC0 на vesnin — gate. Event-порт — новый pin kind,
не хак exec-true/false. Закрытие эпика только после DBC6 (формальный review + LGTM). Policy на
singleton — явно OOS до v0.6.

[Структурщик — Ozhegov]:
RecorderSession / SpectralAnalyserSession в host; Collect — thin node + collectorConfig в data.
Multicast = Set<subscriberNodeId> per singleton. GetFFTFrame остаётся transform Sample→Frame.
Запрещено: второй AudioContext, policy на singleton в MVP.

[Математик — Dynin]:
Flush invariant документировать: после event-out batch immutable snapshot ref[]. Trends на массиве
FftFrame — явная агрегация N кадров → metric window (не один tick).

[Музыкант]:
NewTrack — concat PCM (StreamWindowCollector.finish pattern). Sidebar defaults = mic plugin constants.
Continuous tap vs discrete append — OOS; MVP discrete через GetSample tick.

[Верстальщик — Rodchenko]:
Квадратный event-out (`board-event-handle`), inspector Collect в правом сайдбаре как GetMicrophone.
Terminal New* без exec-out. DESIGN.md — цвет event-порта.
```

---

## План спринта (фазы DBC0–DBC6)

| Фаза | Реестр `id` | PR | Lead (исполнитель) | Содержание | Зависит от |
|------|-------------|-----|-------------------|------------|------------|
| **DBC0** | `dbc-0-core-contracts` | 0 | **Vesnin** + **Ozhegov** | `@membrana/core` (**`vesnin`**): `RecorderRef`, `SpectralAnalyserRef` в `SocketType`; `BoardPinKind` += `'event'` (контракт device-board re-export); `nodeKind`: `get-recorder`, `get-spectral-analyser`, `collect-samples`, `collect-fft-frames`, `new-track`, `new-fft-trends-analysis`; тип `CollectorConfig`; array input types для terminal nodes; ADR в концепте v0.5 §collectors | — |
| **DBC1** | `dbc-1-getter-nodes` | 1 | **Ozhegov** + **Rodchenko** | Graph: `GetRecorder`, `GetSpectralAnalyser` (device in, ref out); подтвердить/зафиксировать **GetFFTFrame** отдельно; pin catalogs, palette labels, connection validation; system/device method pattern как GetMicrophone | DBC0 |
| **DBC2** | `dbc-2-host-singletons` | 2 | **Ozhegov** + **Музыкант** | Host: `RecorderSession`, `SpectralAnalyserSession` per deviceHandle; multicast registry; append API; **без** policy UI на singleton; unit-тесты host mock | DBC0 |
| **DBC3** | `dbc-3-collect-nodes` | 3 | **Ozhegov** + **Rodchenko** + **Музыкант** | `CollectSamples`, `CollectFftFrames`: exec-in + ref in; **event-out** (square) + data-out batch refs; `collectorConfig` в node.data; **правый сайдбар** (bufferSize, smoothing, windowSec, queueCapacity — defaults mic plugins); flush OR trigger | DBC1, DBC2 |
| **DBC4** | `dbc-4-terminal-nodes` | 4 | **Ozhegov** + **Dynin** + **Музыкант** | `NewTrack(AudioSampleRef[])`, `NewFftTrendsAnalysis(FftFrameRef[])`: terminal exec; host concat → journal track / trends report; интеграция `telemetry-journal`, trends path | DBC3 |
| **DBC5** | `dbc-5-runtime-event-dispatch` | 5 | **Ozhegov** + **Dynin** | Runtime: event-ветка при flush (не exec tick); канон graph `GetSample→GetFFTFrame→CollectFft`; MVP **один** Collect QA; cookbook MDX в `apps/docs`; device-board tests | DBC4 |
| **DBC6** | `dbc-6-teamlead-review` | 6 | **Vesnin** | Формальный code review эпика, CI green, smoke с микрофоном, отчёт в Issue, LGTM, `yarn task:archive` фаз + эпик | DBC0–DBC5 |

**Параллельность:** после DBC0 — DBC1 и DBC2 параллельно. DBC3 после DBC1+DBC2. DBC4→DBC5→DBC6 строго последовательно.

**Оценка (ориентир):** DBC0 2д · DBC1 1–2д · DBC2 2д · DBC3 2–3д · DBC4 2д · DBC5 2д · DBC6 1д.

**Ритм:** `MAIN_DAY_ISSUE` + id фазы; вечер — archive фазы после merge PR.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Координатор виртуальной команды Membrana (**Vesnin**). Merge-order **DBC0 → DBC6**. Контракты core — только DBC0 / **`vesnin`**. Не расширяй scope: policy на singleton, host-internal FFT без GetFFTFrame, multi-collector QA, continuous ring buffer.

---

### Что построить (по фазам)

1. **DBC0 — core contracts.** `RecorderRef`, `SpectralAnalyserRef`; pin kind `event`; node kinds Collect/New*; `CollectorConfig` schema; array ref inputs; обновить `DEVICE_BOARD_CONCEPT.md` §v0.5 collectors; тесты type guards / socket compatibility.
2. **DBC1 — getter nodes.** `GetRecorder`, `GetSpectralAnalyser` на графе; GetFFTFrame — отдельный transform-узел (Sample→Frame); palette + validation.
3. **DBC2 — host singletons.** Session objects, append, flush snapshot, multicast subscriber set; config **не** на singleton.
4. **DBC3 — Collect nodes + sidebar.** Event-out square handle; data-out ref arrays; inspector fields: `bufferSize` (2048), `smoothingTimeConstant` (0.75), `windowSec` (3), `queueCapacity` (10 default); persist in serialize.
5. **DBC4 — NewTrack / NewFftTrendsAnalysis.** Terminal nodes; resolve array inputs; NewTrack → WAV/journal; NewFftTrends → trends detector on frame batch.
6. **DBC5 — runtime event dispatch.** On flush: run downstream from event-out only; wire main loop sample→fft→collect; one collector E2E; docs cookbook.
7. **DBC6 — Teamlead review.** Full repo CI; checklist DoD; Issue report; LGTM; archive.

---

### Архитектура / границы

| Слой | Путь | Ответственность |
|------|------|-----------------|
| core (vesnin) | `packages/core/.../socket-type.ts`, `scenario-node-kind.ts` | Ref types, node kinds, CollectorConfig (DBC0) |
| device-board graph | `packages/device-board/src/graph/*` | Nodes, pins, event handle, sidebar fields (DBC1,3) |
| device-board runtime | `packages/device-board/src/runtime/*` | Event dispatch, block executor (DBC5) |
| client host | `apps/client/.../scenarioMicJournalBridge.ts`, `createScenarioRuntimeHost.ts` | Singleton sessions, append, NewTrack/NewFft (DBC2,4) |
| services | `audio-engine`, `fft-analyzer`, `telemetry-journal`, trends detector | Capture math, FFT, journal, trends (DBC4) |

**Запрещено:**

- Web Audio вне `audio-engine-service`
- Policy API на singleton в MVP
- Удаление GetFFTFrame как отдельного узла
- Exec tick = flush event

---

### Канонический граф (MVP)

```text
GetDevice → GetRecorder(device)
GetDevice → GetSpectralAnalyser(device)
GetMicrophone → StartStreaming → stream

Main exec tick:
  GetSample(stream) → sample
  GetFFTFrame(sample) → frame
  CollectFftFrames(analyser, frame) → [event-out on full] → data-out FftFrameRef[]

Parallel:
  CollectSamples(recorder, sample) → [event-out] → data-out AudioSampleRef[]

Event branches:
  NewTrack(samples[])
  NewFftTrendsAnalysis(frames[])
```

---

### Definition of Done (эпик)

- [ ] DBC0: core on `vesnin`, LGTM Vesnin
- [ ] DBC1–DBC5: PR merged, tests green per phase DoD
- [ ] DBC6: Vesnin review checklist signed, Issue report, epic archived
- [ ] Smoke: один сценарий CollectFft → NewFftTrends + CollectSamples → NewTrack на client с микрофоном
- [ ] `yarn turbo run lint typecheck test build --continue` — green для затронутых пакетов

---

### Out of scope

- Policy на singleton (v0.6)
- Host FFT bypass GetFFTFrame
- Multicast multi-collector QA
- Continuous ring-buffer recorder
- Cabinet remote enumerate changes

---

### Порядок работы ролей

1. **Vesnin** — DBC0 gate, DBC6 closure
2. **Ozhegov** — graph, host, runtime (DBC1–5)
3. **Dynin** — flush invariants, trends aggregation (DBC4–5)
4. **Музыкант** — capture quality, engine integration (DBC2–4)
5. **Rodchenko** — event pin UI, Collect sidebar (DBC1,3)

---

## Заметки для человека-постановщика

1. GitHub Issue `wish` — заголовок: «Device-board v0.5: Recorder/SpectralAnalyser singletons, Collect event-ports, NewTrack/NewFftTrends».
2. Запись эпика + фаз DBC0–DBC6 в `docs/tasks/registry.json`.
3. `yarn task:sync-readme`
4. После каждой фазы: PR → merge → `yarn task:archive dbc-N-...`
5. Эпик закрывает **DBC6** (Vesnin LGTM).

### Проверка после эпика

```bash
yarn turbo run lint typecheck test build --continue --filter=@membrana/device-board --filter=@membrana/core --filter=@membrana/client
```

---

## Связь с дорожной картой

- Продолжение streaming lifecycle v0.4 → v0.5 collectors
- Замена legacy `record-chunk` path для новых сценариев (legacy под флагом)
- Single-Node Detection: trends на batch FFT frames

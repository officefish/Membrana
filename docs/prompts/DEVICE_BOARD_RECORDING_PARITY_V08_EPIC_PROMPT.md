# Промпт (эпик): Device-Board Recording Parity v0.8 — mic-buffer-recorder quality on same v07 graph

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Эпик** · **Размер:** **L** (фазы A0–A5)
> **Реестр:** `id` = **`db-recording-parity-mic-v08`**
> **Предшественник:** [`DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md) (R0–R3 archived); [`DEVICE_BOARD_RECORDING_PARITY_MIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_PARITY_MIC_PROMPT.md) (R5 → fold в A1)
> **Канон графа:** `docs/device-board-scripts/device-scenario-microphone-main-v07.json` — **topology не меняем**

**GitHub Issue:** [#133](https://github.com/officefish/Membrana/issues/133) (не закрывать до A5 LGTM)

**Ветка:** `vesnin`

---

## Контекст

Recording Gate v0.7 **крутится E2E** (StartRecording → gate → StopRecording → MakeTrack → Publish), но **качество записи хуже**, чем у плагина **«Запись в буфер»** (`mic-buffer-recorder`):

- треск на стыках rolling window;
- preview «ускорен» (sample rate / duration mismatch);
- latency выше модульной версии.

**Причина:** device-board пишет через **GetSample tick-chunks** (~100 ms) в `ScenarioContinuousPcmBuffer`; плагин — **continuous AudioWorklet** / **MediaRecorder** (`clipRecorder.ts`).

**Цель эпика:** **behavioral parity** с `mic-buffer-recorder` при **том же наборе нод** v07. Отдельный эпик [`DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md`](./DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md) — FFT trends (позже).

**RecordingPolicy** — ровно **два параметра** (как в UI плагина), оба **enum**:

| Поле | Значения |
|------|----------|
| `windowSec` | `3`, `5`, `7`, `10`, `15`, `30` (сек) |
| `captureFormat` | `wav`, `webm`, `mp4` (WAV / WebM / MP4) |

Эталон presets: `apps/client/src/plugins/mic-buffer-recorder/types.ts` (`MANUAL_DURATION_PRESETS_SEC`, `MediaLibraryCaptureFormat`).

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Не чинить tick-chunk concat GetSample — потолок качества. Эпик = parity capture + enum policy.
A0 формализует **узлы-конструкторы** (§15.7 CONCEPT): MakeRecordingPolicy + MakeFftTrendsPolicy в core/palette.
Граф v07: variable-get RecordingPolicy → **MakeRecordingPolicy** → StartRecording.policy.
Эпик B blocked until A5.

[Структурщик — Ozhegov]:
A0: enum policies + CONSTRUCTOR_SCENARIO_NODE_KINDS; MakeRecordingPolicy pure data-out;
MakeFftTrendsPolicy контракт заранее (runtime wiring — эпик B).
RecordingPolicy убран из sidebar переменных — только конструктор на канвасе.

[Верстальщик — Rodchenko]:
A3: инспектор MakeRecordingPolicy — два <select>; badge «5s · WAV»; категория палитры «Конструкторы».
```

---

## Фазы

| Фаза | `id` | PR scope | DoD |
|------|------|----------|-----|
| **A0** | `db-rec-parity-a0-policy-contract` | `@membrana/core` + graph pins | Enum `RecordingPolicy` + `FftTrendsPolicy`; `CONSTRUCTOR_SCENARIO_NODE_KINDS`; node kinds `make-recording-policy`, `make-fft-trends-policy`; palette + resolveInput; §15.7 CONCEPT; **убрать** RecordingPolicy из variable sidebar |
| **A1** | `db-rec-parity-a1-capture-path` | `apps/client` bridge | StartRecording → continuous capture; GetSample → только FFT |
| **A2** | `db-rec-parity-a2-encode-upload` | bridge + MakeTrack/upload | Slice/blob в `captureFormat`; journal preview parity |
| **A3** | `db-rec-parity-a3-constructor-ui` | `@membrana/device-board` UI | Inspector MakeRecordingPolicy (enum selects); палитра «Конструкторы»; v07 JSON: MakeRecordingPolicy → StartRecording; suggest modal |
| **A4** | `db-rec-parity-a4-smoke-matrix` | docs + manual | Smoke 6×3; A/B mic-plugin |
| **A5** | `db-rec-parity-a5-lgtm` | — | LGTM #133; archive A0–A5 |

**Параллельность:** A1 после A0; A2 после A1; A3 может параллельно с A2 после A0; A4 после A2+A3; A5 после A4.

---

## Узлы-конструкторы (A0) — §15.7 DEVICE_BOARD_CONCEPT

| nodeKind | Label | Inputs | Outputs | Класс |
|----------|-------|--------|---------|-------|
| `make-recording-policy` | MakeRecordingPolicy | exec-in | exec-out, `RecordingPolicy` | policy constructor |
| `make-fft-trends-policy` | MakeFftTrendsPolicy | exec-in | exec-out, `FftTrendsPolicy` | policy constructor (runtime B1) |

**Ref-конструкторы** (уже были de-facto): `make-track`, `make-report-from-*`, `make-fft-trends-analysis`.

**Канон v07 (целевой wiring):**

```text
onTick → … → MakeRecordingPolicy → StartRecording(policy)
                              └→ IsRecordingWindowFull(policy)
```

Legacy `variable-get RecordingPolicy` — миграция JSON, не рекомендуется для новых сценариев.

---

## Контракт RecordingPolicy (A0)

```typescript
/** @membrana/core — packages/core/src/contracts/device-board/recording-policy.ts */
export const RECORDING_WINDOW_SEC_PRESETS = [3, 5, 7, 10, 15, 30] as const;
export type ScenarioRecordingWindowSec = (typeof RECORDING_WINDOW_SEC_PRESETS)[number];

export const SCENARIO_CAPTURE_FORMATS = ['wav', 'webm', 'mp4'] as const;
export type ScenarioCaptureFormat = (typeof SCENARIO_CAPTURE_FORMATS)[number];

export interface ScenarioRecordingPolicy {
  readonly windowSec: ScenarioRecordingWindowSec;
  readonly captureFormat: ScenarioCaptureFormat;
}

export const DEFAULT_RECORDING_POLICY: ScenarioRecordingPolicy = {
  windowSec: 5,
  captureFormat: 'wav',
};
```

**`resolveScenarioRecordingPolicy`:**

- невалидный `windowSec` → ближайший preset или default `5`;
- невалидный `captureFormat` → `'wav'`;
- если формат не поддерживается браузером → `pickFallbackCaptureFormat` semantics (reuse logic from `recordingUtils.ts`, **без** импорта client в core — дублировать minimal check или accept-only in bridge).

**Variable value** (`scenario-variables.ts`):

```typescript
createRecordingPolicyValue(windowSec, captureFormat)
// kind: 'RecordingPolicy', windowSec, captureFormat
```

---

## Capture path (A1)

| Формат | Механизм (эталон) | Файл |
|--------|-------------------|------|
| WAV | AudioWorklet 48 kHz mono | `clipRecorder.startWavRecorder` |
| WebM | MediaRecorder opus | `clipRecorder.startMediaRecorderClip` |
| MP4 | MediaRecorder aac/mp4 | same |

**Bridge** (`scenarioMicJournalBridge.ts`):

- `startRecorderRecording` → `startClipRecorder(stream, policy.captureFormat)`;
- rolling restart on gate: stop clip → upload path → start new clip;
- **не** вызывать `feedActiveRecordingFromCapture` из GetSample для active recorder.

**Host ports** — без изменения сигнатур; policy передаётся целиком.

---

## Encode / upload (A2)

- `RecordingSliceMeta` / handle carries `{ format, durationSec, sampleRate, blob? }`.
- MakeTrack → media-library upload с правильным MIME (как mic-plugin).
- Preview в cabinet без «ускорения».

---

## UI (A3)

- Палитра: категория **«Конструкторы»** — `MakeRecordingPolicy`, `MakeFftTrendsPolicy` (+ ref constructors).
- Inspector **MakeRecordingPolicy**: два select (windowSec preset + captureFormat).
- StartRecording: read-only badge wired policy или data-in от MakeRecordingPolicy.
- **Не** добавляем RecordingPolicy в sidebar переменных.

---

## Тесты

| Область | Минимум |
|---------|---------|
| core A0 | resolve presets; invalid → default; serialize round-trip |
| bridge A1 | mock stream: start/stop slice length ≈ windowSec |
| A2 | format MIME mapping; duration invariant |
| device-board A3 | variable value creation with both fields |
| runtime | existing gate E2E still green |

---

## Definition of Done (эпик)

- [x] `RecordingPolicy` = enum `{ windowSec: 3|5|7|10|15|30, captureFormat: wav|webm|mp4 }` в core + graph variable UI
- [x] Continuous capture = mic-buffer-recorder path (не tick-chunk concat)
- [x] Smoke matrix 5s · WAV sign-off; A/B trace device-board (run `85db5c36`)
- [x] v07 JSON импортируется без изменения topology; v08 bootstrap StartRecording
- [x] `yarn recording-parity:smoke-matrix` green
- [x] LGTM Vesnin; `yarn task:archive` A0–A5 + epic; комментарий #133 (2026-06-21)

---

## Out of scope

- CollectSamples legacy path (deprecated, не расширять)
- **Новые node kinds** (кроме UI variable editor)
- Trends FFT parity → эпик B
- background-media encode queue
- cross-fade concat как целевое решение (только fallback если A1 blocked)

---

## Smoke checklist (A4)

1. Hard refresh client (`vesnin`)
2. Import `device-scenario-microphone-main-v07.json`
3. Variable `RecordingPolicy`: прогнать каждый preset × format (или subset + spot-check)
4. Run 60 s → journal preview: **нет щелчков**, duration ≈ policy
5. A/B: sidebar mic-buffer-recorder same preset/format
6. Log: `{ windowSec, captureFormat, durationSec, sampleRate, encoder }`

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — координатор виртуальной команды Membrana под **Vesnin**. Следуй [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и этому промпту. Работаешь по **одной фазе** (A0…A5) за PR unless Teamlead объединил.

### Что построить

Parity записи device-board с плагином **«Запись в буфер»** на **том же графе** v07:

1. **A0:** enum `RecordingPolicy` (windowSec + captureFormat) в `@membrana/core`.
2. **A1:** continuous capture через `clipRecorder` path; GetSample не кормит recorder.
3. **A2:** upload/preview в формате policy.
4. **A3:** UI variable с двумя select.
5. **A4:** smoke matrix + A/B.
6. **A5:** LGTM + archive.

### Запрещено

- Второй AudioContext
- Импорт mic-plugin React UI в device-board
- Новые node kinds без LGTM Vesnin
- Tick-chunk concat как финальное решение качества

### DoD фазы

См. таблицу фаз выше + CI green для затронутых пакетов.

---

## Связь с дорожной картой

- **#133** — tracking issue (recording gate lineage)
- **db-recording-gate-v07** — nodes/runtime (R0–R3 done)
- **db-trends-fft-parity-mic-v08** — следующий эпик после A5

---

## Future: UserCases (не реализуем сейчас)

> **Backlog UI** · выпадающий список готовых сценариев на device-board.
> **Канон MVP (JSON сейчас):** [`USERCASE_MVP_MICROPHONE.md`](../actions/device-board/specs/USERCASE_MVP_MICROPHONE.md)

### Идея

Раздел **UserCases** в шапке или левом сайдбаре device-board — **dropdown** с предзаполненными наборами subgraph для:

| Слот | branch (сериализация) | Пример MVP |
|------|----------------------|------------|
| On connect | `onConnect` | GetJournal → journal1 |
| On start | `initial` | mic → stream bootstrap |
| On stop | `onStop` | StopStreaming |
| On disconnect | `onDisconnect` | invalidate journal |
| Main loop | `main` | §16.5 recording gate |
| Alarm loop | `alarm` | stub / sound-level (позже) |
| Custom functions | `function[]` | Capture+Detect, … |

Выбор UserCase **заменяет** subgraph активной ветки (с confirm + ref-mapping modal), не трогая signal layer.

### Контракт (draft)

```typescript
interface DeviceBoardUserCase {
  readonly id: string;                    // e.g. 'usercase-mvp-microphone'
  readonly title: string;
  readonly deviceKind: DeviceKind;
  readonly branches: Partial<Record<ScenarioBranchTab, BranchScenarioExport>>;
  readonly functions?: readonly ScenarioFunctionExport[];
}
```

- Источник данных: `docs/device-board-scripts/usercase-<id>/manifest.json` + `0N-*.json` (сборка `yarn usercase:build-*`).
- Первый кейс: **`usercase-mvp-microphone`** (6 веток, см. bundle).
- **Не в scope** эпика A: UI dropdown, persist userCaseId на document, multi-device catalog.

### DoD (когда дойдём до эпика UserCases)

- [ ] Dropdown «UserCases» + preview title/badge
- [ ] Apply branch / apply all handlers с ref-mapping
- [ ] manifest.json + CI verify (node kinds актуальны)
- [ ] Документация в `apps/docs` (Mintlify)

---

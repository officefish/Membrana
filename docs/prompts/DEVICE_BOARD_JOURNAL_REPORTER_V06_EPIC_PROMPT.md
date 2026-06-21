# Промпт (эпик): Device-Board Journal + Reporter v0.6

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Task-эпик** (7 PR) · **Размер:** **L** (фазы DBJ0–DBJ6)
> **Реестр:** `id` = **`device-board-journal-reporter-v06`** в [`docs/tasks/registry.json`](../tasks/registry.json)
> **GitHub Issue:** [#131](https://github.com/officefish/Membrana/issues/131)
> **Предпосылка:** collectors v0.5 (#130) merged; `@membrana/telemetry-journal-service` (TJ1–TJ6)

---

## Контекст продукта

Collectors v0.5 ввели terminal-узлы **NewTrack** / **NewFftTrendsAnalysis**, которые **напрямую** пишут в `LiveJournalService` через host-bridge. v0.6 выносит **Journal** и **Reporter** в явный dataflow:

- **Device** и **Server** отдают **JournalRef** (scope per-device)
- **GetReporter(JournalRef)** → **ReporterRef** (scoped объект с двумя методами)
- **MakeReportFromTrack** / **MakeReportFromAnalysis** — **отдельные node kinds** (палитра + connection-suggest modal)
- **PublishReport** — запись **ReportRef** обратно в породивший journal

### Зафиксированные решения (2026-06-20)

| # | Решение |
|---|---------|
| 1 | Journal scope **per-device** (`deviceId`) — и для device journal, и для server journal |
| 2 | **Reporter** — ссылка на объект; два метода = **два node kind** (`make-report-from-track`, `make-report-from-analysis`) |
| 3 | **Report** — общий контракт `ScenarioReportPayload` + `ReportRef`; schema discriminator |
| 4 | Backend routing — **host**, не graph: device → electron-fs / local; server (per device) → cabinet sync when paired |
| 5 | Legacy **NewTrack** / **NewFftTrendsAnalysis** — deprecated path, не удалять в v0.6 (DBJ5) |

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
DBJ0 на vesnin — gate. JournalRef handle кодирует scope + deviceId. ReporterRef привязан к JournalRef.
Два make-report узла — frozen; не один узел с переключателем. PublishReport требует JournalRef + ReportRef.

[Структурщик — Ozhegov]:
device-board → host ports only; reuse resolveJournalBackend(scope, deviceId). Запрещено: import
telemetry-journal-service из device-board. Report builders — apps/client bridge.

[Математик — Dynin]:
MakeReportFromTrack → analyzeSampleDetectors / orchestrator по sampleId трека.
MakeReportFromAnalysis → trends-fft DTO (buildTrendsFftReport schema). ScenarioReportPayload mirrors TJ1.

[Музыкант]:
TrackRef resolve → sampleId → media blob playback unchanged. Reporter не кодирует WAV.

[Верстальщик — Rodchenko]:
Палитра категория Journal. Connection-suggest modal предлагает make-report узлы от ReporterRef.
GetJournal: data-in DeviceRef | ServerRef → JournalRef out.
```

---

## План спринта (DBJ0–DBJ6)

| Фаза | Реестр `id` | PR | Содержание | Зависит от |
|------|-------------|-----|------------|------------|
| **DBJ0** | `dbj-0-core-contracts` | 0 | `@membrana/core` (**`vesnin`**): `JournalRef`, `ReporterRef`, `TrackRef`, `ReportRef`, `FftTrendAnalysisRef`; `ScenarioReportPayload`; node kinds; `DEVICE_BOARD_CONCEPT` §17 | — |
| **DBJ1** | `dbj-1-get-journal` | 1 | GetJournal: DeviceRef \| ServerRef in → JournalRef out; host resolve; metadata | DBJ0 |
| **DBJ2** | `dbj-2-get-reporter` | 2 | GetReporter: JournalRef in → ReporterRef out; runtime store | DBJ1 |
| **DBJ3** | `dbj-3-make-reports` | 3 | MakeReportFromTrack, MakeReportFromAnalysis; host builders; connection-suggest | DBJ2 |
| **DBJ4** | `dbj-4-publish-report` | 4 | PublishReport → appendReport; E2E test; cookbook MDX | DBJ3 |
| **DBJ5** | `dbj-5-legacy-terminals` | 5 | NewTrack/NewFftTrends → thin wrappers или deprecation docs | DBJ4 |
| **DBJ6** | `dbj-6-teamlead-review` | 6 | CI green, browser smoke, LGTM, archive | DBJ0–DBJ5 |

**Ветка:** DBJ0 — **`vesnin`**. Остальные фазы — feature от `main` после merge DBJ0.

---

## DBJ0 — контракты (`@membrana/core`)

### Socket types (REFERENCE)

| Type | Role |
|------|------|
| `JournalRef` | Handle на journal scope (`journal:device:{deviceId}` \| `journal:server:{deviceId}`) |
| `ReporterRef` | Handle на reporter, scoped к journal (`reporter:{journalHandle}`) |
| `TrackRef` | Ссылка на track row (`track:{trackId}`) |
| `ReportRef` | Ссылка на in-memory report payload (`report:{reportId}`) |
| `FftTrendAnalysisRef` | Результат FFT trends analysis (`analysis:{id}`) |

### Node kinds

| nodeKind | Exec | Data in | Data out |
|----------|------|---------|----------|
| `get-journal` | — | `DeviceRef` \| `ServerRef` | `JournalRef` |
| `get-reporter` | — | `JournalRef` | `ReporterRef` |
| `make-report-from-track` | exec-in | `ReporterRef`, `TrackRef` | `ReportRef` |
| `make-report-from-analysis` | exec-in | `ReporterRef`, `FftTrendAnalysisRef` | `ReportRef` |
| `publish-report` | exec-in | `JournalRef`, `ReportRef` | — |

### ScenarioReportPayload

```ts
interface ScenarioReportPayload {
  readonly schema: string;
  readonly reportId: string;
  readonly trackId: string;
  readonly isDetected: boolean;
  readonly summaryText?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}
```

Known schemas (non-exhaustive): `trends-fft-report/v1`, `drone-detection-report/v1`.

---

## Канонический граф v0.6

```text
GetDevice ──► GetJournal(device) ──► GetReporter ──┐
GetServer ──► GetJournal(server) ──► GetReporter ──┤
                                                    │
NewTrack / CreateTrack ──► TrackRef ────────────────┼──► MakeReportFromTrack → ReportRef
AnalyzeTrends ──► FftTrendAnalysisRef ─────────────┼──► MakeReportFromAnalysis
                                                    │
                                                    └──► PublishReport
```

---

## Definition of Done (эпик)

- [ ] Device + server journals per deviceId; backend via host `resolveJournalBackend`
- [ ] GetReporter → two make-report nodes (palette + suggest modal) → PublishReport E2E
- [ ] Reports render in LiveJournal UI (known schemas)
- [ ] No direct `appendTrendsFftJournalReport` from block-executor after DBJ5
- [ ] Browser smoke: paired + autonomous
- [ ] `yarn task:archive device-board-journal-reporter-v06`

---

## Запрещено

- Import `telemetry-journal-service` из `@membrana/device-board`
- Per-membrane server journal (только per-device)
- Один combined make-report node с mode-switch
- Удаление NewTrack/NewFftTrends до DBJ5

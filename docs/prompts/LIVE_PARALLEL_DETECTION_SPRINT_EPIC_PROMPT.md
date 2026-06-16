# Промпт: параллельный live-анализ и журнал FFT (LP1–LP4)

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (4 PR) · **Размер:** **L** (фазы LP1–LP4)  
> **Ожидаемый артефакт:** 4 последовательных PR.  
> **Реестр:** `id` = **`live-parallel-detection-sprint`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Предпосылка:** эпики JE/JS закрыты; `mic-live-drone-analysis` анализирует **после импорта** 5‑с клипа и **не успевает** за auto-нарезкой.

**GitHub Issue:** `null` (создать `wish` / `imperfection` перед LP1).

### Решения Teamlead (зафиксировано)

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Порядок PR | **LP1 первым** (drone stream), затем LP2→LP3→LP4 |
| 2 | Тайминг stream-auto | **3 с** окно анализа + **2 с** пауза до следующего цикла (**5 с** период); пауза — запас на `appendReport` в журнал |
| 3 | FFT-плагины | **opt-in** (`active: false`); в description — «отчёты → журнал» |
| 4 | Формат отчёта drone live | **Краткий по умолчанию** (`drone-detection-brief/v1`); **подробный DDR** (`drone-detection-report/v1`) — только по запросу на **сервер** (LP1b) |

Константы LP1 (defaults в config):

- `streamWindowSec: 3`
- `streamPauseSec: 2` → `streamCycleMs: 5000` (window + pause)
- SLO: анализ окна завершается ≤ `streamWindowSec + 500 ms`; `appendReport` — в паузе до старта следующего окна

---

## Контекст продукта

### Наблюдение оператора

При auto-записи 5‑с сегментов в буфер (`mic-buffer-recorder`) плагин **«Анализ дрона (live)»** отстаёт: отчёт строится только после `sampleImported` → `analyzeSampleDetectors(sampleId)` (декод blob + 4 DSP + template-match). Пока идёт анализ, уже появляются новые клипы — ощущение «журнал без отчётов» и рассинхрон.

### Целевое поведение

**Плагин `mic-live-drone-analysis`** — **три режима анализа** (не путать с режимами записи буфера):

| Режим UI | Источник | Латентность | Журнал |
|----------|----------|-------------|--------|
| **Ручной** | live audio stream (`micFrameFeed`) | окно **3 с** по кнопке «Старт» | report сразу после окна |
| **Авто** | live stream, параллельно нарезке | цикл **3 с + 2 с пауза** (5 с период) | report каждый цикл |
| **Последний трек** | `sampleImported` | краткий brief быстро | brief в журнал; DDR по кнопке → сервер |

### Два формата отчёта (mic-live-drone)

| Формат | Schema | Когда | Содержание |
|--------|--------|-------|------------|
| **Краткий** (default) | `drone-detection-brief/v1` | каждый цикл stream / import | 3 DSP-вердикта: имя, isDrone, confidence; без таблиц кадров |
| **Подробный** | `drone-detection-report/v1` | запрос оператора → **сервер** | полный DDR: frame tables, template-match (LP1b API) |

**Быстрый путь (клиент):** `includeFrameVerdicts: false`, `Promise.all` по детекторам, без `build*VerdictSection` с кадрами.

**LP1 (сделано):** краткий отчёт в журнал; кнопка «Запросить подробный» — stub `requestDetailedDroneReport`.

**LP1b (сервер — сделано):** общий пакет `@membrana/drone-detection-orchestrator-service` (ядро DDR над `Float32Array`, без Web Audio) переиспользуется клиентом (декод blob в браузере) и сервером. `background-media`: `POST /v1/devices/:deviceId/samples/:sampleId/drone-detection-report` — декод WAV PCM16 в Node + динамический `import()` оркестратора (ESM из CJS) → возвращает `drone-detection-report/v1` (WAV-only; иначе 422). Клиент `requestDetailedDroneReport` → media → `appendLiveJournalReportFromDroneDetection` (синк в cabinet) + `setDetailedReportReady`. Решения: WAV-only v1; журнал пишет клиент; ветка `vesnin`.

**FFT-плагины** (`fft-threshold-test`, `trends-fft-analyzer`) — снова **пишут в live-журнал** (сейчас `log*Telemetry` — no-op после TJ3). Работают **на потоке**, как и раньше; только sink меняется с RAM telemetry на `LiveJournalService.appendReport`. **Включение — opt-in** (не менять `active: false` по умолчанию).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md) | TJ10: mic-live-drone на import |
| [`TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md) | hub, refresh |
| [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) | эшелоны детекторов |
| [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) | сглаживание, статические строки |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | audio-engine, без второго AudioContext |
| [`MODULE_AND_PLUGIN_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | панель / sidebar |

---

## Диагностика (root cause)

| # | Факт | Следствие |
|---|------|-----------|
| RC1 | `mic-live-drone-analysis` слушает только `sampleImported` | анализ стартует после import + journal track |
| RC2 | `analyzeSampleDetectors` → `loadSampleBufferById` + полный offline pipeline | сотни ms–секунды на 5 с WAV |
| RC3 | Auto-нарезка каждые ~6 с (5 с + пауза) | очередь отчётов растёт, UI «залипает» на loading |
| RC4 | `fftThresholdTelemetry` / `trendsFftTelemetry` — **no-op** | FFT-отчёты не попадают в журнал |
| RC5 | Эталон stream-паттерна уже есть | `createMicFrameFeed` + `fft-threshold-test` / `trends-fft-analyzer` |

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Новый спринт LP1→LP4, отдельный от JS. Не ломать mic-buffer-recorder и track-import путь.
Критерий успеха спринта: при auto-нарезке отчёты drone (stream-auto) появляются не реже 1 раза
на интервал окна; FFT-плагины снова видны в журнале. Issue + реестр до первого коммита.

[Структурщик — Ozhegov]:
Два DTO: `drone-detection-brief/v1` (hot path) и `drone-detection-report/v1` (cold path, сервер).
Brief: 3 вердикта DSP, `includeFrameVerdicts: false`, `Promise.all` — без build*VerdictSection с кадрами.
Подробный: только LP1b — `POST …/detail` по `briefReportId` + `sampleId`; сервер гоняет analyzeSampleDetectors.
Stream brief без sampleId в media — подробный только для track-import (клип в библиотеке); stream v2 — upload окна.

[Математик — Dynin]:
SLO brief finalize: ≤ 500 ms после конца окна (3 детектора parallel, no frame tables).
Подробный DDR не влияет на цикл 3+2 с. Consensus brief = majority isDrone по 3 DSP.

[Музыкант]:
Оператор видит краткий вердикт в журнале сразу; «Запросить подробный» — только track-import, когда нужен template-match.
Stream-auto: только brief; paired smoke — отчёт каждые 5 с без «залипания» на finalize.

[Верстальщик — Rodchenko]:
Панель: badge «краткий (drone-detection-brief/v1)»; кнопка «Запросить подробный (сервер)» — track-import;
состояния pending/ready на detailedReportStatus. Подробный DDR — expand после LP1b.
```

---

## Промпт целиком (для вставки агенту)

### Фазы

| Фаза | id | PR | Содержание |
|------|-----|-----|------------|
| **LP1** | `lp1-mic-drone-stream-modes` | **1 (первый)** | Stream modes + **краткий** brief report (client) |
| **LP1b** | `lp1b-drone-detailed-report-server` | 1b | Server API подробного DDR по запросу |
| **LP2** | `lp2-fft-plugins-journal-sink` | 2 | fft-threshold + trends-fft → LiveJournalService |
| **LP3** | `lp3-track-import-backpressure` | 3 | Режим track-import: очередь, UI, regression |
| **LP4** | `lp4-parallel-detection-smoke` | 4 | SLO-тесты, docs, paired smoke |

---

### LP1 — mic-live-drone stream modes

**Пакет:** `apps/client`, опционально `packages/services/detector-stream` (если >100 строк чистой логики).

1. Config: `analysisMode`, `streamWindowSec: 3`, `streamPauseSec: 2` (auto; цикл 5 с).
2. Реализовать `installStreamAnalysis()` по образцу `fftThresholdTestPlugin.ts` (feed, timers, teardown).
   Фазы цикла auto: `collecting` (3 с) → `finalize + appendReport` → `idle` (2 с) → следующий цикл.
3. На завершении окна — **краткий** consensus (`analyzeStreamDetectorsBrief`: parallel, no frame tables) → `appendLiveJournalReportFromDroneBrief`.
4. UI: переключатель режимов; auto — фазы сбор/пауза; кнопка «Запросить подробный» (track-import, LP1b).
5. **Не** вызывать полный `analyzeSampleDetectors` в hot path.

**DoD LP1:** stream-auto: **brief** в журнале каждые 5 с; finalize ≤ паузы между циклами.

---

### LP1b — подробный отчёт на сервере

**Пакеты:** `packages/background-media` или `packages/background-cabinet`, `apps/client`

1. API: запрос DDR по `briefReportId` + `sampleId` (клип уже в media library).
2. Сервер: `analyzeSampleDetectors` (4 детектора + template-match).
3. Ответ: `drone-detection-report/v1`; обновить journal row (`detailedReportId`, `detailedReportStatus`).
4. Клиент: `requestDetailedDroneReport` → fetch → `micLiveDronePluginState.setDetailedReportReady`.
5. Stream-only brief: подробный недоступен без upload окна (v2) — UI disabled + подсказка.

**DoD LP1b:** track-import brief → кнопка → подробный DDR с сервера в панели и журнале.

---

### LP2 — FFT plugins → journal

**Пакет:** `apps/client`

1. Заменить no-op в `fftThresholdTelemetry.ts` / `trendsFftTelemetry.ts` на writers:
   - `appendLiveJournalReportFromFftThreshold(report)`
   - `appendLiveJournalReportFromTrendsFft(report)`
2. Схемы: `fft-threshold-test/v0.2`, `trends-fft/v0.1` в `report.schema`; `isDetected` по правилам плагина.
3. Адаптеры в `apps/client/src/modules/telemetry-journal/adapters/` — отображение в journal row (если ещё нет trends).
4. Тесты: append → snapshot journal +1 report.
5. **Не** менять `active: false` по умолчанию (opt-in).

**DoD LP2:** включить fft-threshold + trends вручную на mic → записи в журнале «Отчёты» / «Обнаружения».

---

### LP3 — track-import backpressure

1. Режим `track-import` — текущий `sampleImported` путь, явно в config.
2. `inFlight` + `pendingSampleId`: не более одного анализа; при новом import — skip или replace policy (document in code).
3. UI: показывать «очередь» / «пропущен клип» если отстаём.
4. Regression-тесты существующего `micLiveDroneAnalysisPlugin.test.ts`.

---

### LP4 — smoke & SLO (сделано)

1. SLO + paired smoke в [`docs/LIVE_PARALLEL_DETECTION.md`](../LIVE_PARALLEL_DETECTION.md).
2. Vitest: `streamWindowCollector.test.ts` — окно 3 с, конкатенация кадров, elapsed; stream-auto integration в `micLiveDroneAnalysisPlugin.test.ts`.
3. Paired checklist — в doc (раздел «Paired smoke»).

---

### Definition of Done (эпик)

- [ ] Три режима mic-live-drone в UI и config.
- [ ] Краткий brief (`drone-detection-brief/v1`) по умолчанию во всех режимах mic-live-drone.
- [ ] Stream manual/auto: окно 3 с, auto-цикл 3+2 с.
- [ ] FFT threshold + trends пишут в live-журнал (opt-in, без смены default active).
- [ ] track-import: краткий brief по клипу; подробный DDR — LP1b (сервер по запросу).
- [ ] CI зелёный; ручной paired smoke задокументирован.

### Out of scope

- Template-match на live stream.
- Новые детекторы / stage-gate калибровка.
- Изменение интервала mic-buffer-recorder (остаётся 5 с).
- SSE journal push.

---

## Заметки для постановщика

1. Issue: «Live-анализ не успевает за нарезкой; stream modes + FFT journal».
2. Связать с follow-up к #81/#83, не переоткрывать закрытые эпики.
3. После merge LP4: `yarn task:archive live-parallel-detection-sprint`.

### Проверка после PR

```bash
yarn workspace @membrana/client test
yarn workspace @membrana/client typecheck
# paired: auto buffer + drone stream-auto (3s+2s) → reports в журнале каждые 5s
```

# Промпт (эпик): Device-Board Trends FFT Parity v0.8 — mic trends-fft-analyzer on same v07 graph

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Эпик** · **Размер:** **L** (фазы **TBD** — после обсуждения команды)
> **Реестр:** `id` = **`db-trends-fft-parity-mic-v08`**
> **Статус:** **LGTM 2026-06-21** — B0–B3 complete; UserCase MVP достигнут (см. [`USERCASE_MVP_MICROPHONE_LGTM.md`](../actions/device-board/sign-offs/USERCASE_MVP_MICROPHONE_LGTM.md))
> **Blocked by:** [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md) (A5 LGTM ✓)
> **Канон графа:** `docs/device-board-scripts/device-scenario-microphone-main-v07.json`

**GitHub Issue:** _TBD_ (создать после A5; можно ссылаться на #133 как parent theme)

**Ветка:** `vesnin`

---

## Контекст

После parity **записи** (эпик A) нужна parity **анализа тенденций FFT** между:

- плагином **«Анализатор тенденций FFT»** (`apps/client/src/plugins/trends-fft-analyzer/`);
- device-board графом v07: `GetFFTFrame → CollectFftFrames → … → MakeFftTrendsAnalysis → MakeReportFromAnalysis → PublishReport`.

Сейчас `analyzeTrendsFromFftFrames` / `MakeFftTrendsAnalysis` дают **приближённый** результат vs live plugin (`classifyTrends`, DRONE_TIGHT templates, `measurementsCount`, telemetry/journal schema).

**Цель:** при том же mic stream и том же графе — **идентичная классификация и отчёт**, что sidebar plugin.

**Out of scope:** запись трека (эпик A); drone-detector plugins; background-media.

---

## Product decisions (LGTM 2026-06-21)

| # | Решение | Выбор |
|---|---------|-------|
| 1 | **Интервал** | Только **ms-presets** (50, 100, 200, 500, 1000) — как sidebar plugin; stride в UI не показываем |
| 2 | **Journal report** | Только **`trends-fft/v0.1`** — идентично plugin; `device-board-observation/v1` bundle не публикуем |
| 3 | **Окно trends vs recording** | **Независимо** — `TrendsAnalysisPolicy` и `RecordingPolicy` настраиваются отдельно на canvas |
| 4 | **User templates** | **Runtime merge** из plugin store; на canvas — shipped/tariff catalog + галочки `enabledTemplateKeys` |
| 5 | **Фазы** | **P0 → B0 → B1 → B2 → B3** (см. таблицу ниже) |

Дополнительные требования:

1. **measurementsCount** — enum: **5, 20, 50, 100, 180, 300**
2. **Шаблоны** — конструктора шаблонов нет; список от plugin/tariff + **галочки** участия в анализе
3. Exploratory draft B0 в ветке — сверить с таблицей выше перед merge

---

---

## Мнение виртуальной команды (planning session — TBD)

```text
[Teamlead — Vesnin]:
Старт только после A5. Не смешивать PR записи и trends. Эпик B — отдельный Issue.
Topology v07 сохраняем; policy-параметры через variable или node inspector.

[Структурщик — Ozhegov]:
B0: TrendsAnalysisPolicy contract в core (mode, measurementsCount, templateSetRef) — enum как plugin config.
Runtime: один classifyTrends path — reuse @membrana/trends-detector-service, не дублировать в bridge.

[Математик — Dynin]:
MetricSample[] из FFT frames must match plugin tick aggregation (interval ms, count).
Unit-test: fixture frames → plugin classify === device-board classify (bit-identical labels/confidence bands).

[Музыкант]:
DRONE_TIGHT template resolution — тот же resolveTrendsTemplatesForAnalysis / droneTightCalibration constants.
Smoke: live mic 60 s → сравнение isDrone/confidence timeline plugin vs graph journal.

[Верстальщик — Rodchenko]:
Journal renderer «Анализатор тенденций FFT» — parity текста/summary с appendTrendsFftJournalReport.
Optional: Variable TrendsAnalysisPolicy UI (как RecordingPolicy в A3).
```

---

## Фазы

| Фаза | `id` | PR scope | DoD |
|------|------|----------|-----|
| **P0** | `db-trends-parity-p0-spec-lgtm` | docs only | Product decisions LGTM; epic prompt + registry; GitHub Issue |
| **B0** | `db-trends-parity-b0-policy-contract` | `@membrana/core` + device-board graph UI | `FftTrendsPolicy` contract; **MakeFftTrendsPolicy** node + inspector (ms-only interval, template checkboxes) |
| **B1** | `db-trends-parity-b1-runtime-parity` | bridge + device-board runtime | `MakeFftTrendsAnalysis` / `analyzeTrendsFromFftFrames` = plugin tick loop semantics |
| **B2** | `db-trends-parity-b2-report-schema` | journal-report-views + telemetry | `PublishReport` → **`trends-fft/v0.1`** only; reuse `buildTrendsFftReport` + plugin renderer |
| **B3** | `db-trends-parity-b3-smoke-lgtm` | docs + manual | 60 s A/B plugin vs graph; LGTM; archive P0–B3 + epic |

**Параллельность:** P0 → B0 → B1 → B2 → B3 (строго последовательно).

---

## Контракт TrendsAnalysisPolicy (B0)

Align с `TrendsFftAnalyzerPluginConfig` и sidebar plugin «Анализатор тенденций FFT»:

| Поле | Тип | UI / примечание |
|------|-----|----------------|
| `detectionMode` | `'auto' \| 'manual'` | select |
| `measurementsCount` | **enum** | **5, 20, 50, 100, 180, 300** (точное перечисление) |
| `intervalMs` | **enum** | **50, 100, 200, 500, 1000** мс (как plugin presets; под капотом — не «каждый N-й фрейм») |
| `minConfidence` | number 0..1 | advanced (default DRONE_TIGHT) |
| `minRms` | number 0..1 | advanced |
| `enabledTemplateKeys` | `string[]` | **галочки** по shipped catalog/tariff; user templates — **runtime merge** из plugin store (не persist в JSON сценария) |

**MakeFftTrendsPolicy** — exec-in → exec-out + `FftTrendsPolicy` data-out (как MakeRecordingPolicy в A3).

**Цель B1–B2:** journal report **идентичен** plugin: `buildTrendsFftReport` → schema `trends-fft/v0.1` → тот же renderer, что sidebar «Анализатор тенденций FFT».

---

## Runtime parity (B1)

**Эталон:** `trendsFftAnalyzerPlugin.ts` — FftAnalyzer tick, SpectralFluxTracker, `classifyTrends`, template store.

**Device-board path:**

- `CollectFftFrames` → flush → `MakeFftTrendsAnalysis`
- Must use same: FFT_SIZE, smoothing, template resolution, measurement window

**Reuse (не копировать):**

- `@membrana/trends-detector-service` — `classifyTrends`
- `@membrana/fft-analyzer-service`
- `resolveTrendsTemplatesForAnalysis` from client lib (or move to service if boundary violation — LGTM Ozhegov)

---

## Report schema (B2)

- `buildTrendsFftReport` / `buildTrendsFftSummaryText`
- Journal entry id / schema version parity with plugin telemetry
- Cabinet renderer: existing Trends FFT view without regression

---

## Definition of Done (эпик)

- [ ] Classification parity: plugin vs graph on shared fixture + live smoke
- [ ] Journal report schema + renderer match plugin output
- [ ] v07 graph topology unchanged
- [ ] CI green (core, device-board, client, trends-detector)
- [ ] LGTM Vesnin; archive B0–B3 + epic

---

## Out of scope

- Recording / MakeTrack (эпик A)
- Sample-library offline analyzer
- New detection templates beyond DRONE_TIGHT curated set
- SSE / realtime journal push

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Координатор Membrana / Vesnin. **Не начинай**, пока эпик A (`db-recording-parity-mic-v08`) не archived с A5 LGTM.

### Что построить

Parity **«Анализатор тенденций FFT»** на графе v07:

1. **B0:** policy contract (enums)
2. **B1:** runtime classifyTrends = plugin
3. **B2:** journal report schema
4. **B3:** smoke A/B + archive

### Запрещено

- Менять capture/recording path (эпик A)
- Дублировать classifyTrends logic в bridge без выноса в service
- Новые node kinds без LGTM

---

## Связь

- **Предшественник:** [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md)
- **Эталон plugin:** `apps/client/src/plugins/trends-fft-analyzer/`
- **Bridge:** `analyzeTrendsFromFftFrames.ts`, `scenarioMicJournalBridge.ts`

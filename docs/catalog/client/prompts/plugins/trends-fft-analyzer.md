# Плагин: `trends-fft-analyzer` — Анализатор тенденций FFT

> **Catalog-спецификация** · parent: `microphone` · статус: **stable**

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `trends-fft-analyzer` |
| **Константа** | `TRENDS_FFT_ANALYZER_PLUGIN_ID` |
| **Lead** | Dynin + Ozhegov |

---

## 2. Зачем пользователю

Классификация акустической сцены по серии FFT-метрик (ветер, тишина, трафик, дрон и др.) в live-режиме. Показывает победивший шаблон, confidence, опционально пишет отчёт в журнал и сигнал «дрон» в header hub.

---

## 3. install / teardown

**install** (`trendsFftAnalyzerPlugin.ts`):

- `createAnalysisFrameFeed` + подписка на mic stream
- `FftAnalyzer` (preset drone), `SpectralFluxTracker`
- интервальный сбор `MetricSample[]` → `classifyTrends` (`@membrana/trends-detector-service`)
- шаблоны: `resolveTrendsTemplatesForAnalysis` (DRONE_TIGHT, user templates)
- при detection с `countsAsDetection` → `publishDroneDetected`, `buildTrendsFftReport` → journal

**teardown**: dispose feed, timers, flux tracker

**UI**: `TrendsFftAnalyzerPanel` + sidebar editor шаблонов (`pluginSidebarDetails`)

---

## 4. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `trendsFftAnalyzerPlugin.ts` |
| State | `trendsFftPluginState.ts` |
| Report | `buildTrendsFftReport.ts` |
| Templates | `userTemplatesStore.ts`, `TrendsTemplateEditor.tsx` |
| Сервисы | `fft-analyzer-service`, `trends-detector-service` |

Математика классификации — только в `trends-detector-service`.

---

## 5. Конфиг

`TrendsFftAnalyzerPluginConfig`: `detectionMode`, `measurementsCount`, `intervalMs`, `minRms`, `enabledTemplateKeys`, … — см. `types.ts` / `resolveTrendsFftAnalyzerConfig`.

---

## 6. Журнал / hub

| Выход | Тип |
|-------|-----|
| Live journal | trends-fft report (`buildTrendsFftReport`) |
| Header sensor | `publishDroneDetected` при `countsAsDetection` |

См. [`LIVE_DETECTION_UI.md`](../../../../LIVE_DETECTION_UI.md).

---

## 7. Связанные task-промпты

- [`TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md`](../../../prompts/TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md) (archived)
- `cj-4-trends-counts-as-detection` — семантика detection vs match

---

## 8. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | stable catalog (MC-3) |

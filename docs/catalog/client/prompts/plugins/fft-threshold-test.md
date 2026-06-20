# Плагин: `fft-threshold-test` — FFT пороговый тест

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `fft-threshold-test` |
| **parentModuleId** | `microphone` |
| **Lead** | Dynin + Ozhegov |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Live-калибровка FFT-порогов: серия измерений, verdict по кадрам, итог pass/fail. Помогает подобрать preset до полевых детекторов.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| нет mic | ожидание потока |
| measuring | тики кадров, progress |
| result | итог + история отчётов |

---

## 4. install / teardown

- **install**: `createAnalysisFrameFeed` + `FftAnalyzer`, `evaluateThresholdTest`, state в `fftThresholdPluginState`
- **teardown**: dispose feed, timers, history listeners
- **UI**: `FftThresholdTestPanel`, sidebar в `pluginSidebarDetails`

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/fft-threshold-test/fftThresholdTestPlugin.ts` |
| State | `fftThresholdPluginState.ts` |
| Report | `buildFftThresholdTestReport.ts` |
| Panel | `FftThresholdTestPanel.tsx` |

---

## 6. Конфиг

`FftThresholdTestPluginConfig` — preset, counts, intervals; см. `types.ts` / `resolveFftThresholdTestConfig`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | mic via `createAnalysisFrameFeed` |
| Engine | `FftAnalyzer` + `SpectralFluxTracker` |

---

## 8. Журнал / telemetry

Отчёты в journal (`buildFftThresholdTestReport`); `publishDroneDetected` при detection; `fftThresholdTelemetry`.

---

## 9. Тестирование

| Область | Файл |
|---------|------|
| Unit | `buildFftThresholdTestReport.test.ts` |

---

## 10. Связанные task-промпты

- `fft-last-chance-calibration` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

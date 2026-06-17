# Плагин: `mic-live-drone-analysis` — Live-анализ дрона (mic)

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `mic-live-drone-analysis` |
| **parentModuleId** | `microphone` |
| **Lead** | Dynin + Ozhegov |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Оркестрация DSP-детекторов на live-потоке: brief/detailed отчёты, stream windows, опционально анализ импортированного трека из recorder.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| stream mode | progress collector, brief ticks |
| sample mode | analyze после import |
| detailed | async `requestDetailedDroneReport` |

---

## 4. install / teardown

- **install**: `createAnalysisFrameFeed`, `StreamWindowCollector`, `analyzeStreamDetectorsBrief`
- **teardown**: dispose feed, collectors, media-library subscription

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/mic-live-drone-analysis/micLiveDroneAnalysisPlugin.ts` |
| State | `micLiveDronePluginState.ts` |
| Reports | `appendLiveDroneBriefReport.ts`, `analyzeSampleDetectorsBrief.ts` |
| Service | `@membrana/drone-detection-orchestrator-service` |

---

## 6. Конфиг

`MicLiveDroneAnalysisPluginConfig` — stream vs track modes; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | mic stream + optional imported sample |
| FFT | 2048, smoothing 0.5 |

---

## 8. Журнал / telemetry

Brief/detailed reports → live journal; интеграция с `mic-buffer-recorder` import events.

---

## 9. Тестирование

| Область | Файл |
|---------|------|
| Unit | `micLiveDroneAnalysisPlugin.test.ts`, `streamWindowCollector.test.ts` |

---

## 10. Связанные task-промпты

- `lp1-mic-drone-stream-modes` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

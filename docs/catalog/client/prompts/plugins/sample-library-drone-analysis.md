# Плагин: `sample-library-drone-analysis` — Детекция дрона на сэмпле

> **Catalog-спецификация** · parent: `sample-library` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `sample-library-drone-analysis` |
| **parentModuleId** | `sample-library` |
| **Lead** | Dynin |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Вердикт DSP-детекторов и template-match по целому сэмплу (~5 с) после воспроизведения или по кнопке «Анализ».

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| no playback | disabled analyze |
| analyzing | spinner, progress |
| result | verdict cards в `SampleLibraryDroneAnalysisPanel` |

---

## 4. install / teardown

- **install**: `subscribeSamplePlayback`, `analyzeSampleDetectors` on end/trigger
- **teardown**: отписка playback, clear controller

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/sample-library-drone-analysis/sampleLibraryDroneAnalysisPlugin.ts` |
| Analyze | `analyzeSampleDetectors.ts` |
| State | `sampleLibraryDronePluginState.ts` |
| Service | `@membrana/drone-detection-orchestrator-service` |

---

## 6. Конфиг

`SampleLibraryDroneAnalysisConfig` — auto-analyze on play end; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | decoded sample buffer (playback snapshot) |
| Длительность | policy сэмпла модуля библиотеки |

---

## 8. Журнал / telemetry

`droneAnalysisTelemetry.ts`; опционально journal reports.

---

## 9. Тестирование

| Область | Минимум |
|---------|---------|
| Ручной | known drone WAV, manual vs auto analyze |

---

## 10. Связанные task-промпты

- `sld2-sample-library-drone-plugin` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

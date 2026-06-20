# Плагин: `trends-fft-sample-analyzer` — Trends FFT на сэмпле

> **Catalog-спецификация** · parent: `sample-library` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `trends-fft-sample-analyzer` |
| **parentModuleId** | `sample-library` |
| **Lead** | Dynin + Ozhegov |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Классификация trends-шаблонов (DRONE_TIGHT и user templates) по offline-сэмплу — аналог live `trends-fft-analyzer` для библиотеки.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| analyzing | progress, metric collection |
| result | winning template + confidence |

---

## 4. install / teardown

- **install**: `subscribeSamplePlayback`, `analyzeSampleTrendsFft`, controller в state
- **teardown**: отписка playback

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/trends-fft-sample-analyzer/trendsFftSampleAnalyzerPlugin.ts` |
| Analyze | `analyzeSampleTrendsFft.ts` |
| Policy | `sampleDurationPolicy.ts` |
| State | `trendsFftSamplePluginState.ts` |

---

## 6. Конфиг

`TrendsFftSampleAnalyzerPluginConfig` — templates, intervals; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | sample playback buffer |
| Сервисы | `fft-analyzer-service`, `trends-detector-service` |

---

## 8. Журнал / telemetry

`logTrendsFftResult`; `publishDroneDetected` при DRONE_TIGHT detection (`isDroneTightTrendsDetection`).

---

## 9. Тестирование

| Область | Файл |
|---------|------|
| Unit | `sampleDurationPolicy.test.ts` |

---

## 10. Связанные task-промпты

- `trends-fft-sample-library-drone-tight` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

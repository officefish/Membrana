# Плагин: `sample-library-fft-threshold-test` — FFT пороговый тест (сэмплы)

> **Catalog-спецификация** · parent: `sample-library` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `sample-library-fft-threshold-test` |
| **parentModuleId** | `sample-library` |
| **Lead** | Dynin |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Offline FFT threshold test на выбранном сэмпле — зеркало mic `fft-threshold-test` для калибровки на записанных клипах.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| ready | кнопка run на выбранном сэмпле |
| running | progress ticks |
| done | verdict + journal option |

---

## 4. install / teardown

- **install**: `subscribeSamplePlayback`, `analyzeSampleFftThreshold`
- **teardown**: отписка, clear state controller

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/sample-library-fft-threshold-test/sampleLibraryFftThresholdTestPlugin.ts` |
| Analyze | `analyzeSampleFftThreshold.ts` |
| State | `sampleLibraryFftThresholdPluginState.ts` |
| Shared | `fft-threshold-test/appendFftThresholdJournalReport.ts` |

---

## 6. Конфиг

`SampleLibraryFftThresholdTestPluginConfig` — preset, measurement params; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | sample playback buffer |
| Engine | `@membrana/fft-analyzer-service` |

---

## 8. Журнал / telemetry

`appendFftThresholdJournalReport`; `publishDroneDetected` при detection.

---

## 9. Тестирование

| Область | Файл |
|---------|------|
| Unit | `sampleLibraryFftThresholdTest.test.ts` |

---

## 10. Связанные task-промпты

- `fl1-sample-library-fft-threshold-plugin` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

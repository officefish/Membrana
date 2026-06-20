# Плагин: `fft-indices-viz` — FFT индексы (live)

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `fft-indices-viz` |
| **parentModuleId** | `microphone` |
| **Lead** | Ozhegov |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Live-графики спектральных индексов (centroid, flux, RMS и др.) для диагностики сцены без полного детектора.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| нет потока | placeholder canvas |
| live | canvas + legend обновляются |

Sidebar: `FftIndicesVizSidebarSettings.tsx`.

---

## 4. install / teardown

- **install**: `subscribeMicrophoneStream` → `LiveSampler` → `FftAnalyzer` → `fftIndicesVizPluginState`
- **teardown**: отписка hub, `sampler.stop()`

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/fft-indices-viz/fftIndicesVizPlugin.ts` |
| State | `fftIndicesVizPluginState.ts` |
| Panel | `components/FftIndicesCanvas.tsx` |
| Hook | `useFftIndicesViz.ts` |

---

## 6. Конфиг

`FftIndicesVizPluginConfig` — видимые индексы, preset; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | `microphoneStreamHub` |
| FFT | 2048, smoothing 0.5 |

---

## 8. Журнал / telemetry

Не пишет в journal.

---

## 9. Тестирование

| Область | Файл |
|---------|------|
| Unit | `fftIndicesDraw.test.ts`, `fftIndicesVizPluginState.test.ts` |

---

## 10. Связанные task-промпты

- `fft-indices-viz` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

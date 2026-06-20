# Плагин: `harmonic-detector-viz` — Гармонический детектор

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `harmonic-detector-viz` |
| **parentModuleId** | `microphone` |
| **Lead** | Dynin + Музыкант |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Live-детекция гармонической структуры (дрон-подобный сигнал) с порогом, сглаживанием и индикатором в UI/header hub.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| analyzing | `DetectionStatus`, mic controls |
| detected | hub `publishDroneDetected` |

Sidebar: `HarmonicDetectorSidebarSettings.tsx`.

---

## 4. install / teardown

- **install**: `createAnalysisFrameFeed` + `createHarmonicDetector`, `DetectionSmoother`
- **teardown**: dispose feed, throttle timers

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/harmonic-detector-viz/harmonicDetectorVizPlugin.ts` |
| State | `harmonicDetectorPluginState.ts` |
| Service | `@membrana/harmonic-detector-service` |

---

## 6. Конфиг

`HarmonicDetectorVizPluginConfig` — threshold, smoothing; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | mic `createAnalysisFrameFeed` |
| FFT | `DEFAULT_FFT_SIZE` из harmonic-detector-service |

---

## 8. Журнал / telemetry

`publishDroneDetected` при срабатывании; journal — по связанным отчётам orchestrator.

---

## 9. Тестирование

| Область | Минимум |
|---------|---------|
| Ручной | порог, live drone sample |

---

## 10. Связанные task-промпты

- [`DSP_DRONE_DETECTOR_PROMPT.md`](../../../prompts/DSP_DRONE_DETECTOR_PROMPT.md)

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

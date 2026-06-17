# Плагин: `sound-quality-viz` — Качество звука

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `sound-quality-viz` |
| **parentModuleId** | `microphone` |
| **Lead** | Ozhegov |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Псевдо-метрики качества сигнала (SNR, clarity, score) в live — быстрая оценка «слышимости» до тяжёлого анализа.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| нет mic | disabled метрики |
| live | `SoundQualityVizPanel` обновляет gauges |

---

## 4. install / teardown

- **install**: `subscribeMicrophoneStream` → `LiveSampler` + `FftAnalyzer` → `soundQualityVizPluginState`
- **teardown**: отписка, stop sampler

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/sound-quality-viz/soundQualityVizPlugin.ts` |
| State | `soundQualityVizPluginState.ts` |
| Panel | `SoundQualityVizPanel.tsx` |

---

## 6. Конфиг

`SoundQualityVizPluginConfig` — preset, пороги; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | `microphoneStreamHub` |
| FFT | 2048, smoothing 0.5 |

---

## 8. Журнал / telemetry

Нет.

---

## 9. Тестирование

| Область | Минимум |
|---------|---------|
| Ручной | live mic, смена preset |

---

## 10. Связанные task-промпты

- `sound-quality-viz` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

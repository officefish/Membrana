# Плагин: `microphone-stream-viz` — Визуализация потока микрофона

> **Catalog-спецификация** · parent: `microphone` · статус: **stable**

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `microphone-stream-viz` |
| **Константа** | `MIC_STREAM_VIZ_PLUGIN_ID` |
| **Lead** | Ozhegov + Музыкант |

---

## 2. Зачем пользователю

Live-мониторинг входящего сигнала: waveform, спектр (бары), псевдо-метрики качества (SNR/noise/score). Подтверждает, что микрофон «слышит» до включения тяжёлых детекторов.

---

## 3. install / teardown

**install** (`micStreamVizPlugin.ts`):

- `subscribeMicrophoneStream` на hub модуля
- при появлении stream → `LiveSampler` + callback кадров
- метрики в `micStreamPluginState` (singleton)

**teardown**:

- отписка hub, `sampler.stop()`, clear telemetry throttle

**UI** (`MicStreamVizPluginPanel`): `useSyncExternalStore` на state — без Web Audio в React.

---

## 4. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `plugins/microphone-stream-viz/micStreamVizPlugin.ts` |
| State | `micStreamPluginState.ts` |
| Panel | `MicStreamVizPluginPanel.tsx` |
| Engine | `LiveSampler` из `@membrana/audio-engine-service` |

RMS/waveform — в plugin; не дублировать в panel.

---

## 5. Конфиг

`MicStreamVizPluginConfig` — `types.ts`, defaults в `defaultMicStreamVizConfig`. Persist в plugin.config.

---

## 6. Аудио-контракт

| | |
|--|--|
| Источник | `microphoneStreamHub` |
| FFT_SIZE | 2048, smoothing 0.75 |

---

## 7. Журнал

Не пишет в telemetry journal.

---

## 8. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | stable catalog (MC-3) |

# Плагин: `mic-buffer-recorder` — Буферная запись микрофона

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `mic-buffer-recorder` |
| **parentModuleId** | `microphone` |
| **Lead** | Rodchenko |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Записать клип с микрофона в media-library (manual / auto, WAV/WebM) для датасета и последующего offline-анализа.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| idle | кнопки start/stop, mode |
| recording | `RecordingProgress`, quota watch |
| imported | hub event → sample в буфере |

---

## 4. install / teardown

- **install**: `subscribeMicrophoneStream`, `clipRecorder`, media-library hub publish/subscribe
- **teardown**: stop active recorder, отписки quota/buffer

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/mic-buffer-recorder/micBufferRecorderPlugin.ts` |
| Recorder | `clipRecorder.ts` |
| State | `micBufferRecorderPluginState.ts` |
| Panel | `MicBufferRecorderPanel.tsx` |

---

## 6. Конфиг

`MicBufferRecorderPluginConfig` — mode, targetSec, format; `types.ts`.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | `microphoneStreamHub` MediaStream |
| Выход | blob → `@membrana/media-library-service` import |

---

## 8. Журнал / telemetry

Hub: `publishMediaLibraryCaptureStart/Stop`; quota updates.

---

## 9. Тестирование

| Область | Минимум |
|---------|---------|
| Ручной | manual clip, quota full, clear buffer |

---

## 10. Связанные task-промпты

- `media-library-a3-mic-recorder` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

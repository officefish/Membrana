# Плагин: `sample-library-player` — Проигрыватель сэмплов

> **Catalog-спецификация** · parent: `sample-library` · статус: **draft**  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `sample-library-player` |
| **parentModuleId** | `sample-library` |
| **Lead** | Rodchenko |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Крупный плеер с осциллограммой для прослушивания выбранного сэмпла из библиотеки; визуальное подтверждение перед offline-анализом.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| no sample | placeholder |
| playing | waveform + transport (модуль owns hub) |

---

## 4. install / teardown

- **install**: UI-only; playback hub в `SampleLibraryModule`
- **teardown**: no-op (dispose в модуле)

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/sample-library-player/sampleLibraryPlayerPlugin.ts` |
| Panel | `SampleLibraryPlayerPanel.tsx` |
| Playback | `@membrana/sample-playback-service` (module-level) |

---

## 6. Конфиг

`SampleLibraryPlayerPluginConfig` — `types.ts`, defaults в plugin factory.

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | sample blob via media-library + playback service |
| Engine | decode/play в модуле, не в plugin install |

---

## 8. Журнал / telemetry

Нет.

---

## 9. Тестирование

| Область | Минимум |
|---------|---------|
| Ручной | select sample, play/pause, waveform |

---

## 10. Связанные task-промпты

- `media-library-a4-sample-player` — `docs/tasks/registry.json`

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-06-17 | Создан catalog-промпт (draft) |

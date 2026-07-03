# Плагин: `vdr-validation` — VDR-валидация (пилот hard-gate)

> **Catalog-спецификация** · parent: `microphone` · статус: **draft**
> Реестр: `docs/catalog/client/registry.json` · эпик: `vdr-hard-gate` (HG2)

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `vdr-validation` |
| **parentModuleId** | `microphone` |
| **Lead** | Rodchenko + Kuryokhin |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

Продуктовая поверхность экспериментов hard-gate (**требование владельца 2026-07-03**: эксперименты живут в продукте как плагины микрофона, скрипты — только канон воспроизводимости): прогон trends-детектора на пилотном корпусе (pred-vs-truth, метрики gate P/R/F1) и live-окно 5 с с микрофона.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| manifest loaded | «Манифест: … · сэмплов N»; без манифеста строки — «не размечено» |
| corpus running | progress прогонa; строки добавляются по мере анализа |
| done | сводка P/R/F1/acc + gate-badge (hard ≥85% / soft 80–85% / fail <80%) + таблица pred-vs-truth (mismatch подсвечен) |
| live collecting | кнопка «Слушаю 5 с…»; по завершении — trends-вердикт строкой |

---

## 4. install / teardown

- **install**: `registerVdrLiveController` (live-окно: `createAnalysisFrameFeed` 2048/0.5 → 5 с PCM → trends)
- **teardown**: dispose feed, `vdrValidationState.reset()`

Прогон корпуса запускается панелью (файлы локальные, WAV декодируется `loadAudioBuffer` audio-engine).

---

## 5. Архитектура

| Слой | Путь |
|------|------|
| Plugin | `apps/client/src/plugins/vdr-validation/vdrValidationPlugin.ts` |
| Panel | `VdrValidationPanel.tsx` |
| State | `vdrValidationState.ts` (useSyncExternalStore singleton) |
| Analysis | `analyzeVdrAudio.ts` — `collectMetricSamples` → `classifyTrends` (DRONE_TIGHT, паритет с `yarn benchmark:detectors`) |
| Metrics | `vdrMetrics.ts` — pure P/R/F1/acc + gate |

Данные: корпус `data/detectors-benchmark/vdr-hard-gate-pilot/` (манифест + WAV выбирает оператор file-input'ами; в бандл не вшивается).

---

## 6. Аудио-контракт

| Поле | Значение |
|------|----------|
| Файлы | `loadAudioBuffer` + `getMonoChannel` (audio-engine, Web Audio только там) |
| Live | `createAnalysisFrameFeed` FFT 2048, smoothing 0.5, окно 5 с |

---

## 7. Тестирование

| Область | Файл |
|---------|------|
| Unit | `vdrMetrics.test.ts` (границы gate 85/80, unlabeled/error исключения) |

Ручной smoke: активировать плагин → загрузить манифест + 33 WAV пилота → метрики совпадают с `yarn benchmark:detectors` (HG3 проверяет расхождение ≤ погрешности).

---

## 8. Связанные task-промпты

- `vdr-hg2-mic-validation-plugin` — `docs/prompts/VDR_HARD_GATE_EPIC_PROMPT.md`
- Консилиум: `docs/seanses/vdr-validation-scope-2026-07-03.md`

---

## 9. Changelog

| Дата | Изменение |
|------|-----------|
| 2026-07-03 | Создан (HG2): corpus runner + live-окно + gate-метрики |

# Эпик: Sample Library Drone Detection — анализ 5-с сэмплов + плагин библиотеки

> **Стратегический task-эпик** (несколько PR) · регламент [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Размер:** L · **GitHub:** [#47](https://github.com/officefish/Membrana/issues/47)  
> **Родитель:** `single-node-detection-first` · **Датасет:** [`DATASET.md`](../DATASET.md) v0.2 free-v1 (120 × 5 с)  
> **Консилиум:** [`docs/discussions/sample-library-drone-detection-consilium-2026-06-15.md`](../discussions/sample-library-drone-detection-consilium-2026-06-15.md)

---

## Продуктовое решение (2026-06-15)

| Принцип | Формулировка |
|---------|----------------|
| **Где** | Специальный **плагин модуля `sample-library`** (`apps/client`), не ядро модуля и не API сервера |
| **Когда** | После проигрывания 5-с сэмпла (или по кнопке «Анализировать» без ожидания конца) |
| **Что показываем** | По каждому детектору: имя, семейство (`dsp` / …), `isDrone`, `confidence` (0–1) |
| **Единица анализа** | **Целый сэмпл** (5 с); кадры `AudioWindow` — внутренняя нарезка |
| **Бенчмарк / калибровка** | Только **`data/detectors-benchmark/v0.2/`** (free-v1, 120 файлов). v0.1 synthetic — smoke CI |

**Live-микрофон:** плагин `harmonic-detector-viz` на модуле `microphone` **остаётся** для live; stage-gate и продуктовый отчёт ведём через библиотеку сэмплов.

---

## Архитектура (кратко)

```
AudioBuffer (5 s, 48 kHz)
    → analyzeSample(buffer, DroneDetector[])
        → frames: AudioWindow[] (hop = fftSize/2)
        → per detector: SampleDetectionVerdict
    → sampleDetectionReportHub (client)
    → plugin UI: таблица вердиктов
```

- Детекторы: `packages/services/detectors/*` — только `detect(AudioWindow)`.
- Агрегация: `@membrana/detector-base` — `analyzeSample()` (общая для UI и `yarn benchmark:detectors`).
- Декод: `@membrana/sample-playback-service` / `audio-engine` — без второго hub воспроизведения.

См. [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1e, [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md).

---

## Фазы эпика (один PR ≈ одна запись реестра)

| Фаза | `id` реестра | Размер | Содержание | DoD (кратко) |
|------|--------------|--------|------------|--------------|
| **SLD1** | `sld1-sample-detection-contract` | M | Типы `SampleDetectionVerdict`, `analyzeSample()`; политика v0.2-only в docs; harmonic довести + unit-тесты | `analyzeSample` в detector-base; benchmark использует тот же код; v0.1 помечен legacy smoke |
| **SLD2** | `sld2-sample-library-drone-plugin` | M | Плагин `sample-library-drone-analysis`, hub отчёта, UI после playback | Регистрация на `sample-library`; таблица detector/confidence; a11y |
| **SLD3** | `sld3-dsp-detectors-free-v1` | L | harmonic tune + cepstral + spectral-flux; все три в плагине и benchmark | `yarn benchmark:detectors` на 120; метрики в `DETECTOR_BENCHMARK.md` |
| **SLD4** | `sld4-stage-gate-calibration` | M | Калибровка порогов на free-v1, split train/val (опц.), отчёт stage-gate | Таблица P/R/F1; рекомендация по gate 85/90; LGTM Vesnin |

**Порядок merge:** SLD1 → SLD2 → SLD3 → SLD4.

**Связь с «сегодня» (MAIN_DAY 2026-06-15):** содержимое дня **входит в SLD1 + начало SLD3** (контракт, harmonic, benchmark на v0.2). Синтетический датасет v0.1 **снимаем** с Definition of Done дня.

**Закрытие фазы:** merge PR → отчёт в #47 → `yarn task:archive <id> --notes "PR #…"`.  
**Закрытие эпика:** после SLD4 → `yarn task:archive sample-library-drone-detection`.

---

## SLD1 — контракт анализа сэмпла (промпт целиком для агента)

### Кто ты

Координатор Membrana (Vesnin). Роли: Dynin (агрегация), Ozhegov (пакеты), Teamlead (LGTM).

### Задачи

1. В `@membrana/detector-base` добавить:
   - `SampleDetectionVerdict`
   - `analyzeSample(samples: Float32Array, sampleRate: number, detector: DroneDetector, options?)`
   - Нарезка окон: hop = `floor(fftSize/2)` (константа из harmonic или параметр).
2. Рефактор `scripts/benchmark-detectors.mjs` → вызывает `analyzeSample`, не дублирует цикл.
3. Обновить [`DATASET.md`](../DATASET.md) / [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md): **канон = v0.2**; v0.1 — «legacy smoke only».
4. `@membrana/harmonic-detector-service` — тесты ≥70% на синтетических кейсах + smoke на 3–5 файлах free-v1.

### Out of scope SLD1

- UI плагин (SLD2)
- cepstral / spectral-flux (SLD3)

---

## SLD2 — плагин библиотеки сэмплов

### Задачи

1. `createSampleLibraryDroneAnalysisPlugin()` → `MembranaRegistry.registerPlugin('sample-library', …)`.
2. Триггеры анализа:
   - `playback.status === 'ended'` для выбранного сэмпла;
   - кнопка «Анализировать» (без полного проигрывания).
3. Поток: `loadSampleBufferById` → mono channel → `analyzeSample` для списка активных детекторов (v1: только harmonic).
4. UI: таблица результатов; empty «Выберите и воспроизведите сэмпл»; loading/error по DESIGN.md.
5. **Запрещено:** логика детекции в JSX; прямой `new AudioContext`.

### DoD

- [ ] Плагин в sidebar `sample-library`
- [ ] После play 5-с сэмпла виден harmonic: confidence + isDrone
- [ ] `yarn lint typecheck test` для client + detector-base

---

## SLD3 — DSP-волна на free-v1

### Задачи

1. Реализовать / довести `cepstral-detector-service`, `spectral-flux-detector-service` (scaffold → working).
2. Подключить в плагин (реестр детекторов v1: массив фабрик).
3. `yarn benchmark:detectors` — все три на 120 файлах; автоген таблицы в `DETECTOR_BENCHMARK.md`.

### DoD

- [ ] Три строки в benchmark-таблице с TP/FP/FN/TN
- [ ] Плагин показывает 3 детектора для одного сэмпла

---

## SLD4 — калибровка и stage-gate

### Задачи

1. Документировать протокол калибровки порогов на free-v1 (grid search / ручной порог — v1).
2. Опционально: `split: train|val` в manifest (80/40) без смены файлов — только метаданные.
3. Итоговый отчёт: лучший детектор, gap до gate 85/90.
4. Обновить `MAIN_DAY_ISSUE` / WHITE_PAPER ссылкой на эпик.

---

## Out of scope эпика

- TDOA, localizer, tracker, ensemble-service (до gate)
- YAMNet, CLAP, agentic (этап 1.B)
- Детекция на `background-cabinet` API
- Обучение нейросетей на GPU
- Cabinet SPA (можно follow-up: тот же плагин-паттерн без MembranaRegistry)

---

## Команды

```bash
yarn dataset:sync-free-v1          # актуализировать 120 WAV
yarn turbo run build --filter=@membrana/harmonic-detector-service
yarn benchmark:detectors             # v0.2 free-v1
yarn workspace @membrana/client dev  # ручной smoke плагина
```

---

## Definition of Done эпика

- [ ] Плагин `sample-library-drone-analysis` показывает вердикты по детекторам после анализа 5-с сэмпла
- [ ] `analyzeSample()` — единый путь для UI и benchmark
- [ ] Все системные метрики на **120 free-v1**, не на synthetic v0.1
- [ ] harmonic + cepstral + spectral-flux в benchmark
- [ ] SLD1–SLD4 в архиве реестра
- [ ] LGTM Vesnin

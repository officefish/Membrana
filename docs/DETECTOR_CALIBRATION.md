# DETECTOR_CALIBRATION — калибровка DSP-детекторов

> **Статус:** VDR4 (2026-06-15) · **80% val accuracy — не достигнуто**  
> **Датасет:** free-v1 v0.2 · curated manifest · 80 train / 40 val  
> **Ground truth:** [`DATASET_CURATION.md`](./DATASET_CURATION.md) · [`manifest.json`](../data/detectors-benchmark/v0.2/manifest.json)

---

## Цель VDR4

| Метрика | Порог |
|---------|--------|
| Val **accuracy** | ≥ **80%** |

Подбор `aggregation` + `sampleConfidenceThreshold` на train (80 curated), оценка на val (40 curated). Unlabeled пропускаются.

---

## Результат VDR4 (curated labels, 2026-06-15)

Команда: `yarn calibrate:detectors`  
Отчёт: [`calibration-latest.json`](../data/detectors-benchmark/v0.2/reports/calibration-latest.json)  
Пресет: [`calibration-preset.json`](../data/detectors-benchmark/v0.2/calibration-preset.json)

| Детектор | Val accuracy | Val F1 | Val P | Val R | Лучшая конфигурация (train) |
|----------|--------------|--------|-------|-------|------------------------------|
| **cepstral** | **50.0%** | 66.7% | 50.0% | 100% | `any-frame`, confidence ≥ 0 |
| harmonic | 40.0% | 55.6% | 44.1% | 75.0% | `any-frame`, confidence ≥ 0 |
| spectral-flux | 20.0% | 30.4% | 26.9% | 35.0% | `majority`, confidence ≥ 0 |

**Accuracy goal (≥80%):** **NOT PASSED** (лучший: cepstral **50%**).  
**Stage-gate (P≥85%, R≥90%):** **NOT PASSED**.

Пресеты применены в плагине `sample-library-drone-analysis` (`detectorCalibrationPreset.ts`).

---

## Gap analysis

1. **Cepstral / spectral-flux** на train дают TN=0 — предсказывают «дрон» почти на всём; grid search не находит порог, поднимающий accuracy на val.
2. **Harmonic** — единственный с TN>0 на val, но accuracy **40%** (gap **−40 п.п.** до цели).
3. Curated operator labels **не улучшили** метрики vs folder-labels SLD4 — DSP-признаки слабо коррелируют с субъективным «слышу дрон».
4. **Следующий шаг (VDR5, FFT-only):** template-match на curated `DRONE_CURATED` + системные non-drone шаблоны; `yarn templates:build-from-dataset`. Следующий **тариф** (вне этой недели): MFCC, спектрограммы, 600 сэмплов.

---

## Исторический результат SLD4 (folder-labels, до VDR3)

| Детектор | Val F1 | Val P | Val R |
|----------|--------|-------|-------|
| harmonic | 55.6% | 44.1% | 75.0% |
| cepstral | 66.7% | 50.0% | 100% |
| spectral-flux | 30.4% | 26.9% | 35.0% |

Метрики совпадают с VDR4 — проблема в детекторах, не в метках.

---

## Ground truth (продуктовый канон)

См. [`DATASET_CURATION.md`](./DATASET_CURATION.md). Экспорт: `yarn dataset:export-ground-truth`.

---

## Протокол калибровки (v1)

### 1. Подготовка split

```bash
yarn dataset:assign-splits   # stratified 80 train / 40 val
```

Политика: 2/3 каждого класса → train, остальное → val; сортировка по `id` (детерминированно).

### 2. Базовый benchmark (все 120, default aggregation)

```bash
yarn benchmark:detectors
```

### 3. Grid search (train → val)

```bash
yarn calibrate:detectors
```

Перебор:

- агрегация: `any-frame` | `majority` | `min-ratio` (0.6 / 0.75);
- `sampleConfidenceThreshold`: 0 … 0.95 шаг 0.05.

Реализовано в `@membrana/detector-base` `analyzeSample()`:

```typescript
analyzeSample(samples, sampleRate, detector, {
  aggregation: 'majority',           // или 'min-ratio'
  minDroneFrameRatio: 0.6,
  sampleConfidenceThreshold: 0.55,
});
```

### 4. Критерий успеха продукта (следующий эпик)

**≥ 80% узнаваемости** на валидированном корпусе — метрика уточняется в эпике `detector-calibration-80` (accuracy или F1 на val с достоверными метками).

---

## Связанные документы

- [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md)
- [`DATASET.md`](./DATASET.md)
- [`prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md`](./prompts/SAMPLE_LIBRARY_DRONE_DETECTION_EPIC_PROMPT.md)

# DETECTOR_CALIBRATION — калибровка DSP-детекторов

> **Статус:** SLD4 (2026-06-14) · stage-gate **не пройден**  
> **Датасет:** free-v1 v0.2 · 80 train / 40 val ([`manifest.json`](../data/detectors-benchmark/v0.2/manifest.json))  
> **Консилиум:** [`discussions/sample-library-drone-detection-consilium-2026-06-14-next-epics.md`](./discussions/sample-library-drone-detection-consilium-2026-06-14-next-epics.md)

---

## Цель stage-gate

Перед переходом к этапу 2 (TDOA, ensemble, neural) — см. [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8:

| Метрика | Порог |
|---------|--------|
| Precision | ≥ 85% |
| Recall | ≥ 90% |

Оценка на **val-split** (40 сэмплов), после подбора порогов на **train-split** (80).

---

## Результат SLD4 (автопрогон)

Команда: `yarn calibrate:detectors`  
Отчёт: [`calibration-latest.json`](../data/detectors-benchmark/v0.2/reports/calibration-latest.json)

| Детектор | Val F1 | Val P | Val R | Лучшая конфигурация (train) |
|----------|--------|-------|-------|------------------------------|
| harmonic | **55.6%** | 44.1% | 75.0% | `any-frame`, confidence ≥ 0 |
| cepstral | 66.7% | 50.0% | 100% | `any-frame`, confidence ≥ 0 |
| spectral-flux | 30.4% | 26.9% | 35.0% | `majority`, confidence ≥ 0 |

**Stage-gate:** **NOT PASSED** (ни один детектор не достиг P≥85% и R≥90% на val).

**Лучший val F1:** cepstral **66.7%** (но TN=0 — предсказывает «дрон» на всём val).  
**Наиболее сбалансированный:** harmonic — F1 **55.6%**, единственный с TN>0 на val.

---

## Ручная валидация (оператор)

Субъективное прослушивание в плагине `sample-library-drone-analysis`:

- harmonic — ~50–65% confidence на большинстве треков;
- cepstral / spectral-flux — ~100% на большинстве треков.

**Вывод:** folder-labels в free-v1 и текущие DSP-пороги **не дают** доверия к «узнаванию дрона на слух». Калибровка только на manifest без валидации меток ограничена.

---

## Ground truth (продуктовый канон)

Каждый сэмпл в `background-media`:

| Поле | Значения | Кто редактирует |
|------|----------|-----------------|
| `label` | `drone` \| `not_drone` \| `unlabeled` | admin (system catalog) / user (свои коллекции) |
| `notes` | текст (будущий промпт обучения) | то же |

Следующий эпик: **`dataset-ground-truth-curation`** — UI + PATCH API + export manifest ↔ benchmark.

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

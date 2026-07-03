# DETECTOR_BENCHMARK — бенчмарк детекторов (stage-gate 1→2)

> **Статус:** runner v0.2 (`yarn benchmark:detectors` на `data/detectors-benchmark/v0.2/`). Метрики harmonic — автоген ниже.
>
> **Дисклеймер:** после появления скрипта бенчмарка ручные правки в таблице
> результатов **не сохраняются** — источник истины автогенерация.

## Цель и критерий stage-gate

Перед переходом к Этапу 2 (TDOA, мультиузел) лучший одиночный детектор **или**
согласованный ensemble на **тестовом** split датасета должен достичь:

| Метрика | Порог |
|---------|--------|
| Precision | ≥ 85% |
| Recall | ≥ 90% |

Дорожная карта: [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8. Датасет: [`DATASET.md`](./DATASET.md).

## Таблица детекторов (сводная)

| name | family | стоимость | объяснимость |
|------|--------|-----------|--------------|
| harmonic | dsp | CPU | высокая |
| cepstral | dsp | CPU | высокая |
| spectral-flux | dsp | CPU | средняя |
| yamnet | neural | CPU/GPU | низкая |
| clap | neural | CPU/GPU | средняя |
| agentic-claude | agentic | токены API | высокая |

<!-- BENCHMARK:auto:start -->

> **Автогенерация:** `yarn benchmark:detectors` · 2026-07-03T11:08:43.545Z
> **Датасет:** v2 · test-split: 120 файлов

### Результаты последнего прогона

| name | family | TP | FP | FN | TN | precision | recall | F1 | latency p50 (ms) | latency p95 (ms) | статус |
|------|--------|----|----|----|----|-----------|--------|-----|------------------|------------------|--------|
| harmonic | dsp | 41 | 53 | 19 | 7 | 43.6% | 68.3% | 53.2% | 0.1 | 0.2 | benchmarked |
| cepstral | dsp | 60 | 60 | 0 | 0 | 50.0% | 100.0% | 66.7% | 0.2 | 0.4 | benchmarked |
| spectral-flux | dsp | 52 | 60 | 8 | 0 | 46.4% | 86.7% | 60.5% | 0.1 | 0.2 | benchmarked |
| template-match | dsp | 54 | 26 | 6 | 34 | 67.5% | 90.0% | 77.1% | 1.5 | 2.3 | benchmarked |
| yamnet | neural | — | — | — | — | — | — | — | — | — | scaffold |
| clap | neural | — | — | — | — | — | — | — | — | — | scaffold |
| agentic-claude | agentic | — | — | — | — | — | — | — | — | — | scaffold |

<!-- BENCHMARK:auto:end -->


### Заметка по stage-gate (template-match → DRONE_TIGHT)

После эпика [`fft-last-chance-calibration`](./prompts/FFT_LAST_CHANCE_CALIBRATION_EPIC_PROMPT.md) (#84) curated-каталог переведён с переобученного `DRONE_CURATED` (merged envelope) на узкий **`DRONE_TIGHT`** (перцентили train-дронов + требования стабильности во времени).

- **Было** (DRONE_CURATED): P 55.6% / R 100% / F1 0.714 / FPR 80%.
- **Стало** (DRONE_TIGHT): **P 85.5% / R 88.3% / F1 0.869 / FPR 15%** (TP 53 / FP 9 / FN 7 / TN 51).

Результат **проходит** мягкую цель эпика (recall ≥ 80% при FPR ≤ 40%) с большим запасом и **почти достигает** строгого stage-gate (precision ≥ 85% ✅, recall ≥ 90% — не хватает 1.7 пп). Это лучший одиночный DSP-детектор на free-v1. Источник шаблона: `data/detectors-benchmark/v0.2/curated-drone-templates.json` и пакетный `packages/services/detectors/template-match/src/data/curated-drone-templates.json` (синхронизированы). Подробности математики — [`prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md`](./prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md).












## Протокол прогона

```bash
yarn benchmark:detectors
```

1. Загрузить test-split из [`DATASET.md`](./DATASET.md) (`data/detectors-benchmark/v0.2/manifest.json`, 120 файлов free-v1).
2. Для каждого реализованного `@membrana/*-detector-service` — скользящие окна FFT + `detect(AudioWindow)`.
3. Собрать confusion matrix, precision/recall/F1, latency p50/p95.
4. JSON: [`data/detectors-benchmark/v0.2/reports/latest.json`](../data/detectors-benchmark/v0.2/reports/latest.json).
5. Перезаписать авто-блок таблицы в этом файле.

## Связанные документы

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1e
- [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §4
- [`prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](./prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md)

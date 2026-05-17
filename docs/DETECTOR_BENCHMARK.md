# DETECTOR_BENCHMARK — бенчмарк детекторов (stage-gate 1→2)

> **Статус:** runner v0.1 (`yarn benchmark:detectors`). Метрики harmonic — автоген ниже.
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

> **Автогенерация:** `yarn benchmark:detectors` · 2026-05-17T09:42:20.257Z
> **Датасет:** v1 · test-split: 9 файлов

### Результаты последнего прогона

| name | family | TP | FP | FN | TN | precision | recall | F1 | latency p50 (ms) | latency p95 (ms) | статус |
|------|--------|----|----|----|----|-----------|--------|-----|------------------|------------------|--------|
| harmonic | dsp | 3 | 3 | 0 | 3 | 50.0% | 100.0% | 66.7% | 0.1 | 0.3 | benchmarked |
| cepstral | dsp | — | — | — | — | — | — | — | — | — | scaffold |
| spectral-flux | dsp | — | — | — | — | — | — | — | — | — | scaffold |
| yamnet | neural | — | — | — | — | — | — | — | — | — | scaffold |
| clap | neural | — | — | — | — | — | — | — | — | — | scaffold |
| agentic-claude | agentic | — | — | — | — | — | — | — | — | — | scaffold |

<!-- BENCHMARK:auto:end -->




## Протокол прогона

```bash
yarn benchmark:detectors
```

1. Загрузить test-split из [`DATASET.md`](./DATASET.md) (`data/detectors-benchmark/v0.1/manifest.json`).
2. Для каждого реализованного `@membrana/*-detector-service` — скользящие окна FFT + `detect(AudioWindow)`.
3. Собрать confusion matrix, precision/recall/F1, latency p50/p95.
4. JSON: [`data/detectors-benchmark/v0.1/reports/latest.json`](../data/detectors-benchmark/v0.1/reports/latest.json).
5. Перезаписать авто-блок таблицы в этом файле.

## Связанные документы

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1e
- [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §4
- [`prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](./prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md)

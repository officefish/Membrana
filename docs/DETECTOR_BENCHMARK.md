# DETECTOR_BENCHMARK — бенчмарк детекторов (stage-gate 1→2)

> **Статус:** скелет. Таблица метрик заполняется по мере реализации детекторов и
> прогона `yarn benchmark:detectors` (отдельный task-промпт).
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

## Таблица детекторов

| name | family | precision | recall | F1 | ROC-AUC | latency p50 (ms) | latency p95 (ms) | стоимость | объяснимость | статус |
|------|--------|-----------|--------|-----|---------|------------------|------------------|-----------|--------------|--------|
| harmonic | dsp | — | — | — | — | — | — | CPU | высокая | scaffold |
| cepstral | dsp | — | — | — | — | — | — | CPU | высокая | scaffold |
| spectral-flux | dsp | — | — | — | — | — | — | CPU | средняя | scaffold |
| yamnet | neural | — | — | — | — | — | — | CPU/GPU | низкая | scaffold |
| clap | neural | — | — | — | — | — | — | CPU/GPU | средняя | scaffold |
| agentic-claude | agentic | — | — | — | — | — | — | токены API | высокая | scaffold |

## Протокол прогона (план)

```bash
# Будет добавлен отдельным промптом BENCHMARK_RUNNER
yarn benchmark:detectors
```

1. Загрузить test-split из [`DATASET.md`](./DATASET.md).
2. Для каждого пакета `@membrana/*-detector-service` вызвать `detect(AudioWindow)`.
3. Собрать confusion matrix, precision/recall/F1, latency p50/p95.
4. Перезаписать таблицу в этом файле.

## Связанные документы

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) §1e
- [`INTEGRATIONS_STRATEGY.md`](./INTEGRATIONS_STRATEGY.md) §4
- [`prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](./prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md)

# CURRENT_TASK — буфер (dataset bootstrap #47)

> **Канон дня:** [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) (#47 dataset + benchmark).  
> **#45 (`dsp-drone-detector`):** ✅ архив [`docs/tasks/archive/dsp-drone-detector.md`](./tasks/archive/dsp-drone-detector.md).

## Статус подготовки (2026-05-16)

| Шаг | Статус |
|-----|--------|
| Промпт bootstrap | ✅ [`DATASET_BOOTSTRAP_PROMPT.md`](./prompts/DATASET_BOOTSTRAP_PROMPT.md) |
| Скелет `docs/DATASET.md` | ✅ (классы, stage-gate) |
| `data/detectors-benchmark/v0.1/` + манифест | ✅ 9 WAV + manifest |
| `yarn dataset:generate` | ✅ |
| Чек-лист Музыканта в DATASET.md | ✅ шаблон (ручное прослушивание) |
| `yarn benchmark:detectors` | ⏳ следующая задача — промпт `BENCHMARK_RUNNER_PROMPT.md` |

## Перед стартом кода

```bash
git checkout techies68
git pull origin techies68
```

Читать по порядку: [`DATASET_BOOTSTRAP_PROMPT.md`](./prompts/DATASET_BOOTSTRAP_PROMPT.md) → [`DATASET.md`](./DATASET.md) → [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md).

## Ветка

`techies68` (или feature-ветка по договорённости).

## После приёмки bootstrap

1. **Следующий буфер:** `BENCHMARK_RUNNER_PROMPT.md` + `yarn benchmark:detectors` (см. `DETECTOR_BENCHMARK.md`).
2. Ручно: пройти чек-лист Музыканта в `DATASET.md`.

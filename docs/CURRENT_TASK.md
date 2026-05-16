# CURRENT_TASK — буфер (benchmark runner #47)

> **Канон дня:** [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) (#47 dataset + benchmark).  
> **Датасет v0.1:** ✅ [`DATASET_BOOTSTRAP_PROMPT.md`](./prompts/DATASET_BOOTSTRAP_PROMPT.md).

## Статус подготовки (2026-05-16)

| Шаг | Статус |
|-----|--------|
| Промпт benchmark | ✅ [`BENCHMARK_RUNNER_PROMPT.md`](./prompts/BENCHMARK_RUNNER_PROMPT.md) |
| Датасет + `yarn dataset:generate` | ✅ |
| `yarn benchmark:detectors` | ✅ harmonic: P=50% R=100% F1=66.7% (v0.1 synthetic) |
| `docs/DETECTOR_BENCHMARK.md` автоген | ✅ |
| `test:scripts` (metrics) | ✅ |

## Перед стартом кода

```bash
git checkout techies68
yarn dataset:generate
yarn turbo run build --filter=@membrana/harmonic-detector-service
```

Читать: [`BENCHMARK_RUNNER_PROMPT.md`](./prompts/BENCHMARK_RUNNER_PROMPT.md) → [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md) → [`data/detectors-benchmark/v0.1/manifest.json`](../data/detectors-benchmark/v0.1/manifest.json).

## Ветка

`techies68`

## После приёмки benchmark

Инфраструктура #47 (dataset + runner) готова. Следующее: расширение датасета, настройка классификатора, CI для `benchmark:detectors`, вечером `yarn task:close-github` (#45).

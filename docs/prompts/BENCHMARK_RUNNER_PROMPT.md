# Промпт: benchmark runner детекторов (v0.1)

> **Task-промпт для агента.** Блок **C** дня (#47).  
> Размер: **S–M** · артефакты: `scripts/benchmark-detectors.mjs`, автоген `docs/DETECTOR_BENCHMARK.md`, JSON-отчёт.  
> **Зависимость:** [`DATASET_BOOTSTRAP_PROMPT.md`](./DATASET_BOOTSTRAP_PROMPT.md) выполнен.

---

## Контекст

| Готово | Где |
|--------|-----|
| Датасет v0.1 + манифест | `data/detectors-benchmark/v0.1/` |
| `yarn dataset:generate` | `scripts/generate-dataset-synthetics.mjs` |
| Harmonic detector | `@membrana/harmonic-detector-service` (сборка `dist/`) |
| Протокол метрик | `docs/DETECTOR_BENCHMARK.md` |

---

## Цель

Реализовать **`yarn benchmark:detectors`**: прогон **test-split** манифеста, confusion matrix, precision/recall/F1, latency p50/p95 для каждого **реализованного** детектора; перезапись таблицы результатов в `DETECTOR_BENCHMARK.md` (между маркерами автогенерации).

v0.1: только **harmonic**; остальные строки таблицы — `scaffold`.

---

## Поведение скрипта

1. `yarn turbo run build --filter=@membrana/harmonic-detector-service` (или проверка `dist/`).
2. Читать `data/detectors-benchmark/v0.1/manifest.json`.
3. Для каждого `split: test` — декод WAV → `AudioWindow` (скользящие окна FFT).
4. Агрегация на файл: `predictedDrone =` любое окно с `isDrone: true` (как live edge).
5. Метрики: TP, FP, FN, TN, precision, recall, F1; latency по окнам.
6. JSON: `data/detectors-benchmark/v0.1/reports/latest.json`.
7. Обновить `docs/DETECTOR_BENCHMARK.md` между `<!-- BENCHMARK:auto:start -->` … `end`.

---

## DoD

- [ ] `yarn benchmark:detectors` завершается с кодом 0 на v0.1 датасете.
- [ ] `latest.json` содержит per-detector metrics + per-sample predictions.
- [ ] `DETECTOR_BENCHMARK.md` — строка harmonic с числами; дата прогона.
- [ ] Unit-тест на pure-функции метрик (`scripts/lib/benchmark-metrics.mjs`).
- [ ] `test:scripts` включает новый тест.

---

## Out of scope

- CI GitHub Actions (follow-up).
- cepstral / spectral-flux / neural детекторы.
- ROC-AUC (v0.2).

---

## Связанные документы

- [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md)
- [`DATASET.md`](../DATASET.md)
- [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md)

# Промпт: Detection — `yarn benchmark:detectors`

> **Task-промпт** · `detection-benchmark-runner` · размер **M** · **1 PR**  
> Родитель: [#47](https://github.com/officefish/Membrana/issues/47)  
> Реестр: `detection-benchmark-runner` · см. также `BENCHMARK_RUNNER_PROMPT.md`

---

## Контекст

`scripts/benchmark-detectors.mjs`, `docs/DETECTOR_BENCHMARK.md` с автоген-блоком уже есть. Задача — **верификация DoD** и доработка пробелов.

---

## Промпт целиком

### Что построить / проверить

1. `yarn benchmark:detectors` exit 0 на v0.1 synthetic manifest.
2. JSON отчёт: `data/detectors-benchmark/v0.1/reports/latest.json`.
3. Автообновление таблицы в `DETECTOR_BENCHMARK.md` (маркеры `BENCHMARK:auto`).
4. Регламент в `DETECTOR_BENCHMARK.md`: метрики, как добавить детектор, gate 85/90.

### DoD

- [ ] Benchmark на синтетике без ручных WAV.
- [ ] Документ описывает precision/recall/F1/latency p50/p95.
- [ ] `yarn task:archive detection-benchmark-runner`.

### Out of scope

Полевой датасет; ensemble.

---

## Заметки

Порядок: **3 из 5**. Требует manifest из `detection-dataset-v01`.

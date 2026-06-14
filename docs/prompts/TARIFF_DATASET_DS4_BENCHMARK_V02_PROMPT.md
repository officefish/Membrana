# Промпт: Tariff Dataset DS4 — benchmark runner на v0.2

> Task-промпт · размер **S** · **1 PR**.  
> Реестр: `tariff-dataset-ds4-benchmark-v02` · эпик: [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md).  
> GitHub Issue: [#47](https://github.com/officefish/Membrana/issues/47).  
> **Зависит от:** merge DS1.

---

## Контекст

Все тесты детекторов — на **том же** корпусе free-v1 (`data/detectors-benchmark/v0.2/`). v0.1 синтетика остаётся legacy smoke only.

---

## Промпт целиком

### Что построить

1. `scripts/benchmark-detectors.mjs` → `DATASET_DIR = v0.2`, `manifestPath` в report.
2. Fallback: если нет `split: test`, использовать все samples.
3. `docs/DETECTOR_BENCHMARK.md` — протокол и пути v0.2.

### Definition of Done

- [ ] `yarn benchmark:detectors` читает 120 samples из v0.2 (при собранном harmonic).
- [ ] `data/detectors-benchmark/v0.2/reports/latest.json` генерируется.
- [ ] Авто-блок в `DETECTOR_BENCHMARK.md` обновляется.
- [ ] Отчёт Issue #47 + `yarn task:archive tariff-dataset-ds4-benchmark-v02`.

### Out of scope

- Новые детекторы, stage-gate пороги.
- Fix `audio-engine` build (отдельный Issue если блокирует CI).

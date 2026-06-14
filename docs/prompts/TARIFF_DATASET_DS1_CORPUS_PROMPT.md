# Промпт: Tariff Dataset DS1 — корпус free-v1 и скрипты

> Task-промпт · размер **M** · **1 PR**.  
> Реестр: `tariff-dataset-ds1-corpus` · эпик: [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md).  
> GitHub Issue: [#47](https://github.com/officefish/Membrana/issues/47).

---

## Контекст

Нужен формальный корпус **120 × 5 с** для free-тарифа и benchmark v0.2. Источник — курированные реальные WAV (`docs/datasets/samples/real-collection/`). Синтетика v0.1 **не трогаем**.

---

## Промпт целиком

### Кто ты

Координатор Membrana (Vesnin). Один PR, scope DS1 только.

### Что построить

1. `scripts/fetch-real-dataset-collection.mjs` — сбор корпуса (mackenzie-jane + DroneAudioDataset + ESC-50).
2. `scripts/sync-free-v1-catalog.mjs` — sync → `data/detectors-benchmark/v0.2/` + manifest `catalogId: free-v1-catalog`, `split: test`.
3. `yarn dataset:fetch-real`, `yarn dataset:sync-free-v1` в `package.json`.
4. `data/detectors-benchmark/v0.2/README.md`, обновить `docs/DATASET.md` (секция v0.2).

### Запрещено

- Изменения в `media-library-service`, `apps/client`, `benchmark-detectors.mjs`.

### Definition of Done

- [ ] `data/detectors-benchmark/v0.2/manifest.json` — 120 samples, 60/60 label balance.
- [ ] `yarn dataset:sync-free-v1` идемпотентен.
- [ ] Отчёт в Issue #47 + `yarn task:archive tariff-dataset-ds1-corpus`.

### Out of scope

- Bundled `public/catalog/` (DS3).
- UI и domain model (DS2).

---

## Проверка

```bash
yarn dataset:sync-free-v1
node -e "const m=require('./data/detectors-benchmark/v0.2/manifest.json'); console.log(m.samples.length, m.catalogId)"
```

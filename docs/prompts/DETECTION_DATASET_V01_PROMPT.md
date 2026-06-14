# Промпт: Detection — датасет v0.1 и `DATASET.md`

> **Task-промпт** · `detection-dataset-v01` · размер **M** · **1 PR**  
> Родитель: [#47](https://github.com/officefish/Membrana/issues/47)  
> Реестр: `detection-dataset-v01` · **синтетика, без полевых записей**

---

## Контекст

`docs/DATASET.md`, `data/detectors-benchmark/v0.1/`, `yarn dataset:generate` частично есть. Задача — **привести к DoD** стратегического плана и связать с Media Library (буфер — опционально).

---

## Промпт целиком

### Что построить

1. Актуализировать `docs/DATASET.md`: классы, схема папок, минимальная квота, план полевых данных (out of scope v0.1).
2. Проверить `data/detectors-benchmark/v0.1/manifest.json` + ≥9 синтетических WAV (`yarn dataset:generate`).
3. `data/detectors-benchmark/v0.1/README.md` — quick start.

### DoD

- [ ] `yarn dataset:generate` → manifest + synthetic WAV без ошибок.
- [ ] `DATASET.md` описывает v0.1 и целевые квоты stage-gate.
- [ ] Чек-лист Музыканта для будущих полевых записей (без самих файлов).
- [ ] `yarn task:archive detection-dataset-v01`.

### Out of scope

Скачивание реальных дронов; commit больших бинарников в git.

---

## Заметки

Порядок: **2 из 5**. Зависит от: `detection-base-contract` (желательно, не блокер).

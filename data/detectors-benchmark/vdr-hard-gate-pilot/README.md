# VDR hard-gate pilot corpus

> Эпик [`VDR_HARD_GATE_EPIC_PROMPT.md`](../../../docs/prompts/VDR_HARD_GATE_EPIC_PROMPT.md) (HG1) ·
> протокол разметки: [`DATASET_CURATION.md`](../../../docs/DATASET_CURATION.md) §«Пилот hard-gate» ·
> консилиум `vdr-validation-scope-2026-07-03`

33 сэмпла (5 с / 48 кГц / mono), **независимых** от train v0.2 и real-collection:

- `drone/` — 16 свежих групп записей DroneAudioDataset (исключены целые группы, использованные ранее);
- `not-drone/` — 17 свежих файлов ESC-50 с упором на **hard negatives**: helicopter ×3, vacuum_cleaner ×3, washing_machine ×2, chainsaw ×2, engine ×2, airplane ×1 + контроль (wind ×2, chirping_birds ×2).

Все `label: unlabeled` — **истину ставит оператор** через cabinet VDR2-UI (фильтр статуса + счётчик прогресса). `class`/`originLabel` — только провенанс, не подсказка.

```bash
yarn dataset:fetch-vdr-pilot     # регенерация корпуса (детерминированный выбор групп)
yarn validate:vdr                # аудит: счётчики, дубли, файлы
yarn validate:vdr -- --intra-rater relabel.json   # воспроизводимость ≥95% (D3)
```

После разметки и intra-rater: sign-off в `DATASET_CURATION.md`, затем HG3 (`yarn benchmark:detectors` на этом манифесте).

# Detector benchmark dataset v0.1

Синтетические WAV для первого прогона `yarn benchmark:detectors` (после появления скрипта).

## Перегенерация

```bash
yarn dataset:generate
```

Создаёт `synthetic/*.wav` и `manifest.json`. Источник истины для путей — **манифест**, не ручное редактирование.

## Политика

- v0.1 — только **synthetic** (без PII).
- Полевые записи — отдельный PR с метаданными (см. `docs/DATASET.md`).

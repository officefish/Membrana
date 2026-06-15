# Dataset curation — free-v1 ground truth (VDR3)

> **Эпик:** [`prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md`](./prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md) · **Задача:** `vdr3-ground-truth-export`  
> **Канон benchmark:** `data/detectors-benchmark/v0.2/manifest.json` (после `yarn dataset:export-ground-truth`)

## Цель

Метки `drone` / `not-drone` и заметки оператора в tariff catalog (cabinet, admin) становятся **единственным ground truth** для `yarn benchmark:detectors` и `yarn calibrate:detectors`. Исходные folder-labels из ESC-50 / DAD — только происхождение файлов, не истина для метрик.

## Критерий «дрон» (оператор)

| Метка | Когда ставить |
|-------|----------------|
| **drone** | Слышен характерный звук мультикоптера / БПЛА (моторы, пропеллеры), даже на фоне шума |
| **not-drone** | Дрон не слышен: речь, природа, техника, бытовой шум, птицы и т.д. |
| **unlabeled** | Не использовать в финальном sign-off; блокирует VDR4 |

Заметки (`notes`) — краткое обоснование на русском: что слышно, сомнения, контекст.

## Протокол разметки (cabinet)

1. Войти как **admin** → **Библиотека сэмплов** → **Базовый набор**.
2. Для каждого сэмпла: выбрать метку → **Сохранить**; при необходимости заметки → **Сохранить** (отдельная кнопка).
3. Пагинация: 40 строк на страницу; пройти все страницы (120 сэмплов).
4. После сессии: обновить страницу и выборочно проверить 5–10 строк.

API: `PATCH /v1/membranes/:id/catalog/samples/:sampleId` (cabinet) → media DB (`Sample.label`, `Sample.notes`). Для tariff dataset метка с **title** fan-out на все спаренные узлы.

## Экспорт в репозиторий (инженер)

```bash
# С прода (SSH + cabinet API, нужен .env с BACKGROUND_MEDIA_*)
yarn dataset:export-ground-truth

# Только проверка без записи
yarn dataset:export-ground-truth --dry-run

# Из сохранённого snapshot
yarn dataset:export-ground-truth --input data/detectors-benchmark/v0.2/catalog-ground-truth-snapshot.json
```

Артефакты:

| Файл | Назначение |
|------|------------|
| `data/detectors-benchmark/v0.2/catalog-ground-truth-snapshot.json` | Сырой ответ catalog API |
| `data/detectors-benchmark/v0.2/manifest.json` | Benchmark manifest с `groundTruth` + обновлёнными `label`/`notes` |

Поле `manifest.groundTruth` фиксирует дату экспорта и счётчики.

Сопоставление catalog ↔ manifest: `manifest.samples[].id` = `catalog.samples[].title` (UUID в API не используется в benchmark).

## Sign-off оператора

| Поле | Значение |
|------|----------|
| **Дата** | 2026-06-14 |
| **Оператор** | admin (cabinet.membrana.space) |
| **Объём** | 120 / 120 сэмплов free-v1 |
| **Метки** | 60 `drone`, 60 `not-drone` (проверено prod audit) |
| **Заметки** | Есть у размеченных сэмплов (в т.ч. `not-human-speech-*`) |
| **Готовность к VDR4** | Да — ≥100 размеченных, 0 `unlabeled` |

Подпись: разметка завершена; экспорт manifest выполняется командой `yarn dataset:export-ground-truth`.

## Блокеры VDR4

Не запускать калибровку на curated labels, пока:

- `manifest.groundTruth.unlabeledCount > 0`, или
- `labeledCount < 100`, или
- нет свежего `yarn dataset:export-ground-truth` после последней сессии разметки.

## Связанные команды

```bash
yarn dataset:assign-splits    # train/val (80/40) — split не перезаписывается экспортом
yarn benchmark:detectors      # метрики на curated manifest
yarn calibrate:detectors    # VDR4 — пороги на train, отчёт на val
```

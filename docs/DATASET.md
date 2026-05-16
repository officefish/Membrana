# DATASET — датасет для бенчмарка детекторов

> **Статус:** **v0.1 bootstrap** (2026-05-16) — 9 синтетических сэмплов, test-split.  
> Промпт: [`prompts/DATASET_BOOTSTRAP_PROMPT.md`](./prompts/DATASET_BOOTSTRAP_PROMPT.md).  
> Манифест: [`data/detectors-benchmark/v0.1/manifest.json`](../data/detectors-benchmark/v0.1/manifest.json).

## v0.1 — каталог

| id | class | label | длит. (с) | sr (Гц) | SNR | источник | файл |
|----|-------|-------|-----------|---------|-----|----------|------|
| `drone-mr-120hz` | drone-multirotor | drone | 2 | 48000 | — | synthetic | `synthetic/drone-mr-120hz.wav` |
| `drone-mr-150hz` | drone-multirotor | drone | 2 | 48000 | — | synthetic | `synthetic/drone-mr-150hz.wav` |
| `drone-mr-180hz` | drone-multirotor | drone | 2 | 48000 | — | synthetic | `synthetic/drone-mr-180hz.wav` |
| `not-drone-sine-440` | bird | not-drone | 2 | 48000 | — | synthetic | `synthetic/not-drone-sine-440.wav` |
| `not-drone-speech-like` | human-speech | not-drone | 2 | 48000 | — | synthetic | `synthetic/not-drone-speech-like.wav` |
| `not-drone-white-noise` | silence | not-drone | 2 | 48000 | ~−12 dBFS | synthetic | `synthetic/not-drone-white-noise.wav` |
| `env-wind` | wind | not-drone | 2 | 48000 | — | synthetic | `synthetic/env-wind.wav` |
| `env-traffic` | traffic | not-drone | 2 | 48000 | — | synthetic | `synthetic/env-traffic.wav` |
| `env-silence` | silence | not-drone | 2 | 48000 | ~−48 dBFS | synthetic | `synthetic/env-silence.wav` |

Пути относительно `data/detectors-benchmark/v0.1/`. Поле `label` в манифесте: `drone` | `not-drone` (для confusion matrix).

### Дроны (мультиротор)

Три гармонических стека F₀ 120 / 150 / 180 Гц с затухающими кратными 2f–4f — согласовано с `@membrana/detector-base` `harmonicDroneWindow` (120 + кратные).

### Не-дрон (контроль)

- **440 Гц** — чистый тон вне полосы 80–250 Гц.
- **Speech-like** — модулированный шум (ложноположительный контроль).
- **White noise** — широкополосный шум.

### Шум среды

| Тип | id | Описание |
|-----|-----|----------|
| Ветер | `env-wind` | отфильтрованный ВЧ-шум |
| Трафик | `env-traffic` | низкий гул 60–120 Гц без чёткого гармонического ряда |
| Тишина | `env-silence` | фоновый уровень near-silence |

## Генерация и воспроизводимость

```bash
yarn dataset:generate
```

Скрипт: `scripts/generate-dataset-synthetics.mjs` — пересоздаёт WAV и `manifest.json`.

## Чек-лист Музыканта (ручная валидация)

| id | Слышен как дрон? | Заметки |
|----|------------------|---------|
| drone-mr-120hz | ☐ да ☐ нет | |
| drone-mr-150hz | ☐ да ☐ нет | |
| drone-mr-180hz | ☐ да ☐ нет | |
| not-drone-sine-440 | ☐ да ☐ нет | |
| not-drone-speech-like | ☐ да ☐ нет | |
| not-drone-white-noise | ☐ да ☐ нет | |
| env-wind | ☐ да ☐ нет | |
| env-traffic | ☐ да ☐ нет | |
| env-silence | ☐ да ☐ нет | |

Ожидание v0.1: три `drone-mr-*` — слышимый «жужжащий» тон; остальные — не дрон.

## Классы (целевая структура stage-gate)

| Класс | Описание | v0.1 |
|-------|----------|------|
| `drone-multirotor` | Мультиротор | 3 сэмпла |
| `drone-fixed-wing` | Крыло / планер | — (след. PR) |
| `bird` | Птица | 1 (синус-контроль) |
| `wind` | Ветер | 1 |
| `traffic` | Транспорт | 1 |
| `human-speech` | Речь | 1 |
| `silence` | Тишина / фон | 2 |

## Минимум для stage-gate (напоминание)

- **≥ 30 сэмплов на класс** на test-split — **не** достигнуто в v0.1; цель bootstrap — первый прогон harmonic + отладка `benchmark:detectors`.
- Train / val / test: **60 / 20 / 20** — в v0.1 все записи в `split: test`.

## Протокол расширения

1. Новые записи — отдельный PR с метаданными: источник, условия, расстояние (м), SNR.
2. Обновлять `manifest.json`; для синтетики — править `generate-dataset-synthetics.mjs`.
3. Не коммитить полевые записи с PII без политики (`WHITE_PAPER.md` §10).

## Источники данных

| Источник | Статус | Примечание |
|----------|--------|------------|
| `scripts/generate-dataset-synthetics.mjs` | ✅ v0.1 | 9 WAV, 48 kHz mono |
| Полевые / внешние (Freesound, DCASE) | план | отдельный поток |

## Связанные документы

- [`DETECTOR_BENCHMARK.md`](./DETECTOR_BENCHMARK.md)
- [`WHITE_PAPER.md`](./WHITE_PAPER.md) §8 (stage-gate)
- [`data/detectors-benchmark/v0.1/README.md`](../data/detectors-benchmark/v0.1/README.md)

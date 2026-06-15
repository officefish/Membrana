# Collections inventory — week 2026-06-14

> Сгенерировано: `2026-06-14T15:05:11.643Z` скриптом `scripts/fetch-real-dataset-collection.mjs`

## Сводка

| Метрика | Значение |
|---------|----------|
| Всего сэмплов | **120** |
| Дрон (label=drone) | **60** |
| Не-дрон (label=not-drone) | **60** |
| Длительность | 5 с |
| Sample rate | 48000 Hz mono |

## По классам

| class | count |
|-------|------:|
| `bird` | 12 |
| `drone-multirotor` | 60 |
| `human-speech` | 10 |
| `traffic` | 20 |
| `wind` | 18 |

## Источники

| Источник | Дрон | Не-дрон | Лицензия |
|----------|-----:|--------:|----------|
| [mackenzie-jane/drone-visualization](https://mackenzie-jane.github.io/drone-visualization/) | 29 | 0 | уточнить у авторов |
| [saraalemadi/DroneAudioDataset](https://github.com/saraalemadi/DroneAudioDataset) | 31 | 0 | research |
| [karoldvl/ESC-50](https://github.com/karoldvl/ESC-50) (native 5 s) | 0 | 60 | CC-BY-NC 3.0 |

## Импорт в библиотеку сэмплов

1. `yarn workspace @membrana/client dev`
2. Модуль **Библиотека сэмплов** → коллекция **Реальные дроны** → импорт `docs/datasets/samples/real-collection/drone/*.wav`
3. Коллекция **Шумные среды / Спокойные** → импорт `docs/datasets/samples/real-collection/not-drone/*.wav`
4. Для каждого файла выставить `class` и `label` по `manifest.json`.

## Файлы

- WAV: `docs/datasets/samples/real-collection/`
- Манифест: `docs/datasets/samples/real-collection/manifest.json`


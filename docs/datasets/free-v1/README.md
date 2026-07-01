# free-v1 Dataset Schema

**Эпик:** [#205 free-v1-sound-catalog](https://github.com/officefish/Membrana/issues/205)

Расширение free-v1 до 7 классов звука с авто-генерацией шаблонов. S2
содержит только реальные записи с проверяемым происхождением: 130 real,
0 synthetic.

## Структура директорий

```
docs/datasets/free-v1/
├── README.md          ← этот файл
├── SOURCE_MANIFEST.md ← канонический реестр источников и лицензий
├── QUALITY_REPORT.md  ← leave-one-out baseline для передачи в S3
├── drone/             ← data/detectors-benchmark/v0.2: 60 drone-сэмплов
├── silence/           ← 20 сэмплов (S2)
├── wind/              ← 22 сэмпла (S2)
├── birds/             ← 22 сэмпла (S2)
├── speech/            ← 22 сэмпла (S2)
├── machine-hum/       ← 25 сэмплов (S2)
└── gunshot/           ← 19 сэмплов (S2)
```

Генерируемые шаблоны сохраняются в:
```
packages/services/trends-detector/templates/<CLASS>.json
```

## Naming convention

```
<class>-<index>-<quality>.wav
```

| Поле | Значения |
|------|---------|
| `class` | `silence`, `wind`, `birds`, `speech`, `machine-hum`, `gunshot` |
| `index` | 3-значный номер, например `001` |
| `quality` | `a` (high), `b` (medium), `c` (low) |

Пример: `wind-001-a.wav`, `gunshot-007-b.wav`

## Metadata JSON

Каждая папка класса содержит `metadata.json`:

```json
[
  {
    "file": "wind-001-a.wav",
    "source": "freesound.org/s/123456",
    "license": "CC0",
    "duration": 5.0,
    "sampleRate": 48000,
    "quality": "a",
    "background": "outdoor",
    "notes": ""
  }
]
```

| Поле | Тип | Описание |
|------|-----|---------|
| `file` | string | Имя файла |
| `source` | string | URL или датасет-идентификатор |
| `license` | string | `CC0`, `CC-BY`, `public domain` |
| `duration` | number | Длина в секундах (целевая: 5.0) |
| `sampleRate` | number | 48000 Hz |
| `quality` | `"a"\|"b"\|"c"` | Субъективное качество |
| `background` | string | Условия записи |
| `notes` | string | Доп. комментарий |

## Лицензионные требования

Принимаются только: **CC0 / CC-BY / public domain**

Импортированные источники:

| Классы | Источник | Лицензия |
|---|---|---|
| speech | LibriSpeech dev-clean / OpenSLR SLR12 | CC BY 4.0 |
| birds, silence | BirdVox-DCASE-20k | CC BY 4.0 |
| wind | Wind Noise Dataset, real mobile-phone subset | CC BY 4.0 |
| machine-hum | DataSEC authentic recordings | CC BY 4.0 |
| gunshot | Gunshot/Gunfire Audio Dataset | CC BY 4.0 |

`REAL_SOURCE_RESEARCH.md` сохраняет сырой ответ Perplexity только для аудита.
Он не является источником лицензионных утверждений. Канон импорта —
`SOURCE_MANIFEST.md` и поля provenance в каждом `metadata.json`.

Все WAV нормализованы до mono PCM16, 48 kHz, 5 секунд. Исходный путь внутри
архива сохранён в metadata.

## Генерация шаблона

После наполнения папки класса:

```bash
yarn templates:generate --class wind --src docs/datasets/free-v1/wind/
```

Полный воспроизводимый цикл S2:

```bash
yarn templates:content:research
yarn templates:content:generate
yarn templates:content:qa
yarn vdr:list
```

Materializer реальных источников запускается командами
`templates:content:real:<class>` после загрузки исходных архивов в локальный
игнорируемый cache. Для gunshot используется
`python scripts/materialize-free-v1-real.py gunshot --source <directory>`.

Регрессия DRONE_TIGHT:

```bash
yarn templates:generate:drone-regression
```

## Целевые метрики (stage-gate S3)

| Класс | FPR дрона после добавления |
|-------|--------------------------|
| Все 6 новых | < 15% |
| Дрон recall | ≥ 90% |

Текущий LOO envelope baseline равен 47.7%. Это честная исходная точка, а не
production gate: multi-class routing и калибровка принадлежат S3.

Canonical v0.2 содержит 60 drone и 60 legacy not-drone записей. S2 добавляет
130 новых class-labelled записей, поэтому проверяемый семиклассовый inventory
содержит 190 записей, а не 250. Дубликаты для достижения ошибочной арифметики
эпика не создавались.

# free-v1 Dataset Schema

**Эпик:** [#205 free-v1-sound-catalog](https://github.com/officefish/Membrana/issues/205)

Расширение free-v1 до 7 классов звука с авто-генерацией шаблонов.

## Структура директорий

```
docs/datasets/free-v1/
├── README.md          ← этот файл
├── drone/             ← ссылка на data/detectors-benchmark/v0.2/drone/ (120 сэмплов)
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

Рекомендуемые источники:
- [Freesound.org](https://freesound.org) — фильтр по CC0
- [ESC-50](https://github.com/karolpiczak/ESC-50) — CC BY (non-commercial)
- [UrbanSound8K](https://urbansounddataset.weebly.com/urbansound8k.html) — research only
- [BBC SFX Library](https://sound-effects.bbcrewind.co.uk) — CC BY 4.0 non-commercial

## Генерация шаблона

После наполнения папки класса:

```bash
yarn templates:generate --class wind --src docs/datasets/free-v1/wind/
```

Регрессия DRONE_TIGHT:

```bash
yarn templates:generate:drone-regression
```

## Целевые метрики (stage-gate S3)

| Класс | FPR дрона после добавления |
|-------|--------------------------|
| Все 6 новых | < 15% |
| Дрон recall | ≥ 90% |

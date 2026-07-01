# OPEN: fv1-S2 — free-v1 content and template QA

| Поле | Значение |
|---|---|
| Sprint | `fv1-s2-content` |
| Epic | `free-v1-sound-catalog` / GitHub #205 |
| Lead | Kuryokhin |
| Support | Dynin, Ozhegov |
| Status | implementation ready; awaiting exact-SHA Teamlead review |

## Accountability

| Шаг | Ответственное лицо | Состояние |
|---|---|---|
| C1 — корпус, provenance и metadata | Kuryokhin | готово: 130 real-only файлов |
| C2 — воспроизводимый builder и `vdr:list` | Ozhegov | готов |
| C3 — шесть шаблонов | Ozhegov | готовы |
| C4 — LOO QA и паспорта | Dynin | готово; accuracy 47.7% |
| C5 — field-content gate | Kuryokhin | пройден: synthetic = 0 |
| C6 — финальный Teamlead review | Vesnin | ожидает опубликованный SHA |

## Текущий результат

- 130 S2 samples: 130 real, 0 synthetic.
- Canonical v0.2 содержит 60 drone, поэтому текущий семиклассовый каталог = 190,
  а не заявленные в epic prompt 250; исходное число 120 относилось ко всему
  бинарному корпусу (60 drone + 60 not-drone).
- Шаблоны: `SILENCE`, `WIND`, `BIRDS`, `SPEECH`, `MACHINE_HUM`, `GUNSHOT`.
- LOO accuracy: 47.7%; real-only: 47.7%.
- `DRONE.json` не изменялся.

## Передача в S3

Контентный gate реализации выполнен. Низкая baseline accuracy не исправляется внутри S2:
multi-class routing, calibration и production stage-gate принадлежат S3.

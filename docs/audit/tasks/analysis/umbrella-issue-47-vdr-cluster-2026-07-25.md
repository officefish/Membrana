# Ручной разбор: зонтик GitHub #47 → 5 active-карточек VDR

> Снимок: `yarn tasks:audit:offline` · 2026-07-25 · мастерская задач (план hygiene).

## Факты

| Поле | Значение |
|------|----------|
| Зонтичная Issue | [#47](https://github.com/officefish/Membrana/issues/47) |
| Active карточек под зонтиком | **5** |
| Механических кандидатов на архив | **0** (офлайн) |

## Карточки (вердикт — только владелец)

| id | title (кратко) | Рекомендация агента |
|----|----------------|---------------------|
| `real-dataset-live-calibration` | Real dataset v0.2: libraries → live matching | Развязать от #47 или завести свой Issue; проверить жив ли scope |
| `neural-tier-1b-contract` | Neural tier 1b contract | То же; не архивировать «потому что #47 closed» |
| `vdr-hard-gate` | VDR hard gate | Прецедент 18.07: issue закрыта, карточка жива — **ручной** verdict |
| `vdr-hg3-trends-benchmark` | HG3 trends benchmark | Сверить с текущим scoreboard/epic |
| `vdr-hg4-hard-gate-report` | HG4 hard-gate report | Сверить с detector-metrics / reporting |

## Системный дефект

Схема реестра **не помечает** epic/roadmap для зонтичных Issue → ловушка ловится только глазами в audit.

## Следующий шаг (не автомат)

1. Открыть #47 и каждую карточку в GitHub/Linear.
2. Для каждой: свой Issue **или** явный `parentEpic` + снятие зонтика.
3. После решений — `yarn task:archive` / обновление `notes`, не пакетный архив.

# Дом примеров Workflow — evidence марафона `workflow-examples-marathon`

Накопитель **проверяемых** примеров для объектов Mintlify-раздела Workflow:
мастерские (живой `discoverContainers`, kind=workshop) и процедуры
(`docs/procedures/registry.json`). Baseline перечитывается каждым прогоном —
числа не ручной канон.

Носитель: [`examples.jsonl`](examples.jsonl) (append-only JSONL).
Прибор: `yarn workflow:examples` — валидация контракта + coverage; невалидная
запись = exit 1; дыра coverage — **видимое требование**, не отказ.

## Контракт записи (промпт марафона, дословно)

| Поле | Требование |
|------|------------|
| `objectType` | `workshop` или `procedure` |
| `objectId` | ID из живого источника (workshop — `home`-путь; procedure — id реестра) |
| `evidenceKind` | `run`, `boundary`, `failure` или `fixture` |
| `source` | существующий repo-relative путь к первичному следу |
| `measuredAt` | дата фактического наблюдения (YYYY-MM-DD) |
| `input` | команда, trigger или воспроизводимое входное состояние |
| `expected` | что контракт обещал до запуска |
| `observed` | что получилось фактически, включая отрицательный результат |
| `verification` | как независимый рецензент перепроверяет утверждение |

Правила честности: `fixture` показывает форму, но lived coverage **не закрывает**;
дубликаты одного следа coverage не раздувают; текст, придуманный ради
документации, evidence **не является**; `0/N` печатается, не прячется.

Покрытие объекта = ≥1 `run` **и** ≥1 `boundary|failure`.

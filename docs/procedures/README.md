# docs/procedures — процедурный слой (определения)

Дом **определений процедур** — спроектированных сущностей, оперирующих категориями
слоя (виртуальная команда, задача, ответственность, стратегическая цель).
Канон: эпик заседания [`procedural-layer`](../meeting/procedural-layer/EPIC.md)
(Р1–Р5, ратифицирован 2026-07-21); реализация — #781.

## Контракт (вердикт Р1, протокол `m1-home-r2`)

- Один каталог — одна процедура: `docs/procedures/<id>/`.
- Контейнер несёт **`README.md`** (определение + держатель) и **`MANIFEST.json`**
  (`id`, `leadPersona`, `kitVersion`, `engines[]`, `precedents[]`).
- **Кода и тестов в контейнере нет** (Т12): движки живут в плоском `scripts/`,
  связь — только ссылкой из манифеста. Это подвид `manifest-only` паттерна
  [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md).
- **Определение ≠ прогон.** Здесь — классы; инстансы (прогоны) живут в своих
  домах (`docs/storm/<id>/`, `docs/meeting/<id>/`, `docs/seanses/`) и не
  мигрируют — на них ссылаются `precedents[]`.
- Зуб заселённости: `validateProcedure(dir)` — `resolvable` ∧ `readmeNonEmpty` ∧
  `manifestSchemaOk`; гоняется в CI (`scripts/validate-procedure.test.mjs`).

## Словарь категорий (Р2)

Источник — [`vocabulary.json`](./vocabulary.json) (единственный машиночитаемый;
ядро закрыто, расширение — ADR + LGTM владельца). Проекция —
[`VOCABULARY.md`](./VOCABULARY.md), генерится `yarn vocabulary:generate`
(руками не правится; дрейф ловит `--check`). Проверки: `check()` по маркерам
`@cat:` и `checkGenus()` по `@op:effect:@cat:имя`
(`scripts/lib/vocabulary-check.mjs`; роды и леммы — вердикт `m2a-rod`).

## Жильцы

| Процедура | Держатель | Статус |
|-----------|-----------|--------|
| [`ritual-evening/`](./ritual-evening/README.md) | Ангелина | первый жилец (Р1); `kitVersion: null` |
| [`ritual-day/`](./ritual-day/README.md) | Ангелина | утро; **`kitVersion`: `kits/angelina-morning`** (K4 / #819) |
| [`ritual-dreams/`](./ritual-dreams/README.md) | dynin | сны v2; **`kitVersion`: `kits/dream-master`** (D3 / #859) |
| [`attribution/`](./attribution/README.md) | dynin | адрес домена ответственности (Р3); механизм — T9 |

## kitVersion (провод процедура → кит)

| Значение | Смысл |
|----------|--------|
| `null` | процедура без пина кита (вечер, attribution — пока) |
| `kits/<id>` | дом кита; обязан существовать `kits/<id>/MANIFEST.json` |

`engines[]` — точка входа / движки **вне** полного subgraph кита (или единственный
якорь цепочки). Дублировать все roots кита в `engines[]` **нельзя** — набор
пинится манифестом кита (`yarn kits:audit`). Режимы: interactive → **latest**,
autonomous → **pinned** (см. [`angelina-morning`](../../kits/angelina-morning/README.md),
[`dream-master`](../../kits/dream-master/README.md)).
Зуб резолва `kitVersion` — в `validateProcedure`.

## Граница слоёв и киты (Р3)

Отношение легальности кодирует единый файл правил
[`layer-rules.json`](./layer-rules.json) (один файл — один SHA; `rulesSha`
вердиктов указывает сюда). Зуб — `yarn check:layer-direction`
(exit 0/1/2; живой прогон в `scripts/layer-direction.test.mjs`, CI).
**Охват зуба (честно):** судит статические `import`-рёбра; data-чтения
(`readFileSync` путей слоя скриптами-наблюдателями) и динамические ссылки —
названные слепые зоны (`blindSpots` файла правил), расширение — #800.
Слой `kits/` объявлен в [`layer-rules.json`](./layer-rules.json) (ранг 1).
**Дом слоя:** [`kits/`](../../kits/README.md) (K1 / #816); схема манифеста —
[`kits/MANIFEST.schema.json`](../../kits/MANIFEST.schema.json). Первый жилец —
жильцы `angelina-morning` (#814) и `dream-master` (#855). **Контракт кит-манифеста**
(Р3): кит без манифеста или с нерезолвящимися ссылками — машинный BLOCK на ревью;
манифест — главный diffable-артефакт. Версия единицы —
[`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md) (#761).

Реестр процедур (`registry.json`, статусы `migrated`/`legacy`) появится в Р5;
до него список ведётся этой таблицей.

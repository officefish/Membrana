# tests/ — контейнер тестовых прогонов

Корневой дом тестовой оснастки Membrana: сетапы `smoke` / `gate` / `full`, селектор
по графу импортов, отчеты о том, что не гонялось, и данные для `test:scripts`.

Канон: [ADR-0018](../docs/adr/ADR-0018-tests-container-selective-gate-nightly-full.md).
Юнит-тесты остаются рядом с кодом; этот дом хранит планирование и отчетность прогонов.

**Мастерская дома** ([`HOME_WORKSHOP`](../docs/patterns/HOME_WORKSHOP.md)):
[`workshop.manifest.json`](./workshop.manifest.json) — `audit` отвечает на вопрос
«что гонялось / что не гонялось», `decompose` раскладывает полный набор по группам,
`inspectElement` показывает один тестовый файл и его импорты. Кит: [`kits/tests-master`](../kits/tests-master/).

## Сетапы

| Сетап | Назначение | Команда |
|---|---|---|
| `smoke` | быстрые предикаты ритуалов и доставки | `node scripts/tests-container.mjs --setup smoke` |
| `gate` | `smoke` + тесты, затронутые изменениями по графу импортов | `node scripts/tests-container.mjs --setup gate` |
| `full` | весь набор `scripts/**/*.test.mjs` | `node scripts/tests-container.mjs --setup full` |

Любой выборочный сетап печатает `not run`: это обязательное условие честности из ADR.

## Данные

`test-scripts.catalog.json` — данные раннера: группы, осознанные исключения и состав
smoke-набора. `package.json` хранит только ярлыки команд, не перечни тестов.

## Чеклист HOME_WORKSHOP

1. ✅ `workshop.manifest.json` с полями `pattern`/`name`/`worksOn`/`verbs`/`kit`.
2. ✅ `worksOn` = ровно `tests`; ссылка на паттерн резолвится; правила не скопированы.
3. ✅ `audit`, `decompose`, `inspectElement` присутствуют в verbs.
4. ✅ Доменная декомпозиция по группам/сетапам не переписана через стек-примитивы.
5. ✅ `kit` = `kits/tests-master`.
6. ✅ Доменные инструменты несут `worksOn = tests`.
7. ✅ Отказы видимы: пустой прогон, неизвестная группа, missing smoke file и сужение
   выборки без `not run` являются ошибками/явным отчетом.
8. ✅ Провода: ADR, этот README, `workshop.manifest.json`, пакетные ярлыки.

# Матрица тарифов

Каноническое тело: [`docs/containers/strategic-docs/releases/tariff-matrix/README.md`](./containers/strategic-docs/releases/tariff-matrix/README.md).

Этот файл — только указатель. Матрица собирается из гранул по ресурсу с паспортами в
[`docs/containers/strategic-docs/granules/`](./containers/strategic-docs/granules/) (каталоги
`tariff-*`) по шаблону
[`docs/containers/strategic-docs/templates/tariff-matrix/template.json`](./containers/strategic-docs/templates/tariff-matrix/template.json).
Версия матрицы — набор `pins` в `release.json` релиза.

Правьте гранулы (`resource.json` — значения и паспорт) и пересобирайте релиз:

```bash
yarn strategic-docs:generate --template tariff-matrix
```

С 8 сентября 2026 матрица — единственный источник правды о тарифах (шторм
`storm-tariff-single-truth-2026-09-08`, T13–T16; спринт `tariff-matrix-2331`). Прежний
рукописный черновик v0.5 (23.06, тарифы `indie-v1`/`business-v1`) этим указателем заменён.

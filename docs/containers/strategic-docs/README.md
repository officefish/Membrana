# Контейнер strategic-docs

Дом генеративных стратегических документов: гранулы и шаблоны собираются в
проверяемые релизы, после чего могут быть опубликованы на разрешённую поверхность.

Вход в оснастку дома — [`WORKSHOP.md`](./WORKSHOP.md). Манифест мастерской:
[`workshop.manifest.json`](./workshop.manifest.json); каталог инструментов:
[`workshop.catalog.json`](./workshop.catalog.json).

> **Affine publish заморожен с 2026-07-26.** `strategic-docs:publish`,
> `affine:import` и `affine:sync` отказывают без явного
> `--allow-affine-frozen-publish`. Канон состояния и причина находятся в
> [`workshop.catalog.json#surfaceStatus.affinePublish`](./workshop.catalog.json) и
> [`PUBLISH.md`](./PUBLISH.md). Генерация гранул, шаблонов и релизов не заморожена.

## Граница

Контейнер хранит исходники и релизы документов. Общий обзор контейнеров остаётся
в [`docs/tooling-atlas`](../../tooling-atlas/README.md), а публикация в Affine
подчиняется [`PUBLISH.md`](./PUBLISH.md).

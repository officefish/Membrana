# @membrana/docs-harness

Публичная **Harness**-документация Membrana на [Mintlify](https://mintlify.com):
процедуры, мастерские и инженерные справочники. Это отдельный проект от Product
`@membrana/docs`, где живут Device Board, узлы и тарифы.

## Что делает

- Атлас контейнеров (`tooling/containers` — производная `yarn tooling:atlas --render`)
- Отдельная страница каждой живой мастерской и процедуры
- Честный статус портфолио и примеров, вычисленный из канона
- Bestiary workshop (антипаттерны)
- LLM calls — evidence specimens
- Git branch cookbooks

Live URL: **`https://harness.mmbrn.tech`** (W0 lock; владелец может переименовать в
`ops.mmbrn.tech`). Fallback: `https://membrana-harness.mintlify.app`.
Чеклист DNS: [`CUSTOM_DOMAIN_SETUP.md`](./CUSTOM_DOMAIN_SETUP.md). Panel → harness — W3;
закрытие эпика — W4.

## Установка

Из корня монорепо:

```bash
yarn install
```

## Локальный preview

Требуется **Node 20–24** (см. `.nvmrc` → 22).

```bash
fnm use
yarn docs-harness:dev
```

Откройте http://localhost:3334 (product остаётся на `:3333` через `yarn docs:dev`).

## Сборка и проверка

```bash
yarn workspace @membrana/docs-harness build
yarn workspace @membrana/docs-harness lint
yarn docs:verify:all                  # оба Mintlify-корня (CI)
yarn docs:workflow:check              # страницы процедур/мастерских без drift
yarn tooling:atlas --check            # производная containers.mdx свежа
```

## Связанные документы

| Документ | Роль |
|----------|------|
| [`CUSTOM_DOMAIN_SETUP.md`](./CUSTOM_DOMAIN_SETUP.md) | Owner DNS / 2-й Mintlify project |
| [`docs/day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md`](../../docs/day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md) | Спринт dual Mintlify |
| [`docs/tooling-atlas/README.md`](../../docs/tooling-atlas/README.md) | Канон атласа контейнеров |
| [`apps/docs/README.md`](../docs/README.md) | Product: Board, узлы и тарифы |

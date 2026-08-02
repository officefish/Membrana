# @membrana/docs

Публичная **Product**-документация Membrana на [Mintlify](https://mintlify.com):
Device Board, каталог узлов и тарифы. Отдельное приложение монорепо — **не**
часть `apps/client` и не содержит документацию рабочего контура.

Harness (tooling / bestiary / llm-calls / git) живёт в
[`@membrana/docs-harness`](../docs-harness/README.md) → `apps/docs-harness`.

## Что делает

- Доступное введение в продукт и **device-board MVP v0.4**
- Node reference, concepts, cookbooks
- Тарифная страница из `docs/tariffs/tariff-grid.json` и `tariff-scalars.json`
- Источник правды для onboarding; agent-truth остаётся в `docs/catalog/`

## Установка

Из корня монорепо:

```bash
yarn install
```

## Локальный preview

Требуется **Node 20–24** (см. `.nvmrc` → 22). На Node 25+ Mintlify падает на native-модуле `sharp` (Windows: `ERR_DLOPEN_FAILED`).

```bash
fnm use    # или nvm use
yarn install
yarn docs:dev
```

Откройте http://localhost:3333

Harness preview: `yarn docs-harness:dev` → http://localhost:3334

## Сборка и проверка ссылок

```bash
yarn workspace @membrana/docs build   # CI-safe verify (без Mintlify CLI)
yarn workspace @membrana/docs lint      # + проверка внутренних ссылок (--links)
yarn docs:product:tariffs:check          # generated MDX ↔ тарифный канон
yarn docs:verify:all                  # оба корня: apps/docs + apps/docs-harness (CI)
```

Полный Mintlify preview — только Node 20–24 (`yarn docs:dev`). UI-примеры в MDX должны соответствовать [`DESIGN.md`](../../docs/DESIGN.md); полный visual parity — Phase 1+ эпика `db-doc-v04-mvp`.

Custom domain (owner): [`CUSTOM_DOMAIN_SETUP.md`](./CUSTOM_DOMAIN_SETUP.md) → `product.mmbrn.tech`.

## Workflow с MCP

См. [`docs/DOCUMENTATION_WORKFLOW.md`](../../docs/DOCUMENTATION_WORKFLOW.md) — Mintlify Admin MCP, ChatPRD, Atlan tier4.

## Связанные документы

| Документ | Роль |
|----------|------|
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Архитектурный канон |
| [`docs/SCENARIO_RUNTIME.md`](../../docs/SCENARIO_RUNTIME.md) | Runtime phases |
| [`docs/catalog/client/prompts/modules/device-board.md`](../../docs/catalog/client/prompts/modules/device-board.md) | Обязательно агенту перед правками кода |
| [`prd/device-board-mvp-docs.md`](../../prd/device-board-mvp-docs.md) | PRD-скелет (sync с ChatPRD) |
| [`apps/docs-harness/README.md`](../docs-harness/README.md) | Harness Mintlify (tooling / bestiary / …) |
| [`docs/day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md`](../../docs/day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md) | Dual Mintlify sprint |

# @membrana/docs

Публичная документация Membrana на [Mintlify](https://mintlify.com). Отдельное приложение монорепо — **не** часть `apps/client`.

## Что делает

- Операторская и developer-документация по **device-board MVP v0.4**
- Node reference, concepts, cookbooks
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

## Сборка и проверка ссылок

```bash
yarn workspace @membrana/docs build   # CI-safe verify (без Mintlify CLI)
yarn workspace @membrana/docs lint      # + проверка внутренних ссылок (--links)
```

Полный Mintlify preview — только Node 20–24 (`yarn docs:dev`). UI-примеры в MDX должны соответствовать [`DESIGN.md`](../../docs/DESIGN.md); полный visual parity — Phase 1+ эпика `db-doc-v04-mvp`.

## Workflow с MCP

См. [`docs/DOCUMENTATION_WORKFLOW.md`](../../docs/DOCUMENTATION_WORKFLOW.md) — Mintlify Admin MCP, ChatPRD, Atlan tier4.

## Связанные документы

| Документ | Роль |
|----------|------|
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Архитектурный канон |
| [`docs/SCENARIO_RUNTIME.md`](../../docs/SCENARIO_RUNTIME.md) | Runtime phases |
| [`docs/catalog/client/prompts/modules/device-board.md`](../../docs/catalog/client/prompts/modules/device-board.md) | Обязательно агенту перед правками кода |
| [`prd/device-board-mvp-docs.md`](../../prd/device-board-mvp-docs.md) | PRD-скелет (sync с ChatPRD) |

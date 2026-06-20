# Documentation workflow (device-board MVP)

Регламент публикации документации Membrana: **Mintlify** + **ChatPRD** + **Atlan** + **Cursor Docs Canvas**.

## Слои артефактов

| Слой | Где | Инструмент |
|------|-----|------------|
| Код и тесты | `packages/device-board` | git |
| Agent truth | `docs/catalog/client/prompts/modules/device-board.md` | ручной sync |
| Спецификация эпика | `docs/prompts/DEVICE_BOARD_DOC_V04_PROMPT.md` | git |
| PRD (sync) | `prd/device-board-mvp-docs.md` | ChatPRD MCP |
| Публикация | `apps/docs` | Mintlify |
| Корп. glossary | Atlan tenant | Atlan MCP |
| Интерактивные схемы | Cursor Canvas | Docs Canvas Skill |

**Atlan** не заменяет Mintlify: Atlan — канон **имён и определений** в корпоративном каталоге; Mintlify — **поведение runtime и узлов**.

## Локальный preview

```bash
yarn install
yarn docs:dev
```

http://localhost:3333

## MCP Tier 4

Фрагмент: [`docs/mcp/tier4-documentation.fragment.json`](./mcp/tier4-documentation.fragment.json)

```bash
yarn mcp:phase-d              # сгенерировать merge + отчёт
yarn mcp:phase-d:install        # записать в ~/.cursor/mcp.json
```

Пример полного workstation config: [`docs/mcp/documentation-workstation.example.json`](./mcp/documentation-workstation.example.json).

### Серверы

| MCP | URL | Когда использовать |
|-----|-----|-------------------|
| mintlify-reference | `https://mintlify.com/docs/mcp` | Синтаксис MDX, components |
| mintlify-admin | `https://mcp.mintlify.com` | Правка страниц `apps/docs` |
| chatprd | `https://app.chatprd.ai/mcp` | PRD, DoD, alignment |
| atlan-docs | `https://docs.atlan.com/mcp` | Справка по Atlan |
| atlan | `https://mcp.atlan.com/mcp` | Glossary, semantic_search |

Установите также **Mintlify** и **ChatPRD** plugins из Cursor Marketplace.

## Порядок написания node page

1. **Atlan** — найти каноничное имя термина (если есть в glossary).
2. **Код** — `palette-node.ts`, `block-executor.ts`, `resolve-input.ts`, тесты.
3. **Mintlify** — страница в `apps/docs/device-board/nodes/`.
4. **Catalog** — одна строка-ссылка в `docs/catalog/.../device-board.md` при смене контракта.
5. **ChatPRD** — `update-prd` после завершения фазы.

## Эпик

- Registry id: `db-doc-v04-mvp`
- Prompt: [`DEVICE_BOARD_DOC_V04_PROMPT.md`](./prompts/DEVICE_BOARD_DOC_V04_PROMPT.md)

## CI (план Phase 2)

```bash
yarn workspace @membrana/docs lint   # broken-links
```

Добавить в turbo pipeline после стабилизации контента.

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

Пути и имена canvas для device-board: [`docs/canvas/DEVICE_BOARD_CANVAS_INDEX.md`](./canvas/DEVICE_BOARD_CANVAS_INDEX.md). Mintlify hub: `apps/docs/device-board/canvas-overview.mdx`.

## Cursor Docs Canvas (Phase 3)

1. Источник — Mintlify MDX + `DEVICE_BOARD_CONCEPT` / `SCENARIO_RUNTIME`.
2. Создать или обновить `.canvas.tsx` в `~/.cursor/projects/<workspace>/canvases/` (см. canvas SKILL).
3. Зарегистрировать путь в `docs/canvas/DEVICE_BOARD_CANVAS_INDEX.md`.
4. Ссылка из Mintlify `canvas-overview.mdx` при публикации нового canvas.
5. PRD alignment — `docs/canvas/PRD_ALIGNMENT_DB_DOC_V04.md` или ChatPRD `check-prd-alignment` MCP.

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
| linear | `mcp-remote https://mcp.linear.app/sse` | Issues, статусы, PR-линковка (Tier 5, OAuth) |

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

## RAG index (dual-circuit)

После существенных правок документации — проиндексировать корпус, чтобы `yarn standup`, `yarn code-review`, `yarn consilium` и `yarn rag:query` подтягивали актуальный контекст.

**Сервис:** `@membrana/rag-service` (`packages/services/rag`) — operative circuit без `OPENAI_API_KEY`; archive circuit (LanceDB + embeddings) требует ключ и полный индекс.

**Когда запускать:** после merge doc PR или в конце вечернего ритуала (`yarn ritual:evening` вызывает incremental index, если скрипты есть в `package.json`).

### Целевые пути (device-board docs sprint)

| Glob | Содержимое |
|------|------------|
| `docs/**/*.md` | catalog, SCENARIO_RUNTIME, workflow, prompts |
| `apps/docs/**/*.mdx` | Mintlify (editor, nodes, overview) |
| `packages/device-board/*.md` | CONCEPT, README |
| `docs/catalog/client/**/*.md` | agent truth для client modules |

Не коммитить артефакты индекса: `.membrana/rag/` (LanceDB).

### Ритуал «docs change → index → smoke query»

1. **Проверки перед индексом** (обязательны независимо от RAG):

   ```bash
   yarn docs:lint
   yarn catalog:verify-client
   ```

2. **Incremental index** (после появления `yarn rag:index` в корневом `package.json`):

   ```bash
   yarn rag:index
   ```

   Полный rebuild archive circuit (редко, после смены embedding model или первого развёртывания):

   ```bash
   yarn rag:index --full
   ```

3. **Smoke query** — operative + archive должны находить свежие термины:

   ```bash
   yarn rag:query "device-board undo branch switch"
   yarn rag:query "ScenarioRevertPolicy keep-dirty"
   ```

   Ожидание: в top hits — `DEVICE_BOARD_CONCEPT.md`, `apps/docs/device-board/editor/edit-and-navigation.mdx`, `docs/catalog/client/prompts/modules/device-board.md`.

4. **Если `yarn rag:index` недоступен на ветке** — зафиксировать defer в archive card фазы (см. day-sprint D4); после merge RAG в `main` выполнить шаги 2–3 один раз на обновлённых путях.

**Operator guide** (когда в репозитории): [`docs/RAG.md`](./RAG.md).

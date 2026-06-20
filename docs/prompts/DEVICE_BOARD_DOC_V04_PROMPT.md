# Промпт: Device Board MVP v0.4 — документация (Mintlify + MCP)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **L**. Ожидаемый артефакт: **2–4 PR** — Mintlify site, node reference, MCP tier4, catalog stable.
> Реестр: `id` = `db-doc-v04-mvp` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Device-board достиг **MVP** за спринт 18–19 июня 2026 (PR #96–#123): v0.4 contracts, variables, Event handlers, palette, scenario runtime, editor UX, end-to-end mic→stream→sample→FFT. Документация разрознена; нужен опубликованный слой в `apps/docs` (Mintlify) и workflow с ChatPRD + Atlan MCP.

**Phase 0 выполнен:** каркас `apps/docs`, tier4 MCP, `DOCUMENTATION_WORKFLOW.md`, PRD-скелет, начальные MDX.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DOCUMENTATION_WORKFLOW.md`](../DOCUMENTATION_WORKFLOW.md) | MCP + порядок написания |
| [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Архитектурный канон |
| [`SCENARIO_RUNTIME.md`](../SCENARIO_RUNTIME.md) | Runtime phases |
| [`DEVICE_BOARD_REFACTOR_V04_EPIC_PROMPT.md`](./DEVICE_BOARD_REFACTOR_V04_EPIC_PROMPT.md) | Исходный v0.4 epic |
| [`prd/device-board-mvp-docs.md`](../../prd/device-board-mvp-docs.md) | PRD для ChatPRD |
| [`catalog/.../device-board.md`](../catalog/client/prompts/modules/device-board.md) | Agent truth |

**GitHub Issue:** (создать) — `db-doc-v04-mvp`.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md).

### Что построить

1. Завершить **Mintlify** site в `apps/docs`: все palette nodes, system nodes, 2 cookbooks, editor pages.
2. Довести **catalog** `device-board.md` до `stable` со ссылками на Mintlify.
3. Использовать **MCP tier4** при написании (Mintlify admin, ChatPRD, Atlan glossary).
4. **3 Docs Canvas**: architecture, streaming pipeline, branch/variable map.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Docs app | `apps/docs` | Mintlify MDX only |
| Agent catalog | `docs/catalog/client/prompts/modules/device-board.md` | Краткая правда + links |
| PRD | `prd/device-board-mvp-docs.md` | Sync ChatPRD |
| Code truth | `packages/device-board` | Не дублировать логику в docs |

**Запрещено:**

- Импорт TS из `apps/docs` в `packages/*`
- Описывать runtime semantics только из Atlan (Atlan — glossary names)
- `console.log` в примерах production-кода

### Шаблон страницы узла

Каждый `V04_PALETTE_NODE_KINDS` + system nodes:

1. Summary
2. Pins table
3. Runtime (из `block-executor.ts`)
4. Preconditions / postconditions
5. Anti-patterns
6. Minimal graph (text или mermaid)
7. Link to test file

### Definition of Done

- [ ] Phase 1: 3 concepts polished; catalog `stable`
- [ ] Phase 2: 8 palette + 3 system node pages; 2 cookbooks; `yarn workspace @membrana/docs lint` green
- [ ] Phase 3: 3 Canvas artifacts; ChatPRD `check-prd-alignment`
- [ ] `docs/DOCUMENTATION_WORKFLOW.md` актуален
- [ ] `packages/device-board/README.md` ссылается на `yarn docs:dev`
- [ ] LGTM Teamlead

### Out of scope

- Scheduled jobs docs
- Legacy D0 full reference
- Mintlify production deploy credentials в репо

### Порядок ролей

1. **Teamlead** — scope MVP docs, LGTM
2. **Структурщик** — `apps/docs` structure, MCP tier4
3. **Музыкант** — streaming cookbook accuracy
4. **Верстальщик** — Mintlify MDX, Canvas visuals
5. **Математик** — FFT/sample concept review (если нужно)

---

## Заметки для человека-постановщика

- Phase 0 merged в main отдельным PR.
- ChatPRD: создать документ из `prd/device-board-mvp-docs.md`.
- Atlan: завести glossary terms при наличии tenant.
- `yarn mcp:phase-d:install` — на каждой dev-машине после clone.

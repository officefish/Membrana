# Промпт: Agent Context Optimization v1

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — внедрение graph-first workflow, headroom proxy config, RAG topK, audit-reads hook.
> Реестр: `id` = `agent-context-optimization-v1` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

По итогам консилиума 2026-06-27 команда зафиксировала 6 изменений в рабочих процессах.

Предпосылки:
- **codebase-memory-mcp 0.8.1** установлен, граф репо 26k узлов / 60k рёбер
- **headroom-ai 0.27.0** установлен (`tools/headroom-venv/`), M2 gate LGTM (RAG 88.8%, smoke-matrix 42.1%)
- RAG dual-circuit v1 работает, но `RAG_TOP_K` не скорректирован под новую контекстную ёмкость
- `rag-evening-index.mjs` обновлён (C3 частично), но audit-reads hook не добавлен
- `CONTRIBUTING.md` не содержит graph-first навигационных рекомендаций
- `@membrana/core` не исключён из headroom proxy (риск компрессии контрактов)

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модулей |
| [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) | Тир-таблица, §9 спринта |
| [`docs/discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md`](../discussions/mcp-agent-tooling-consilium-2026-06-27-PROTOCOL.md) | Источник решений |
| [`docs/insights/insight-headroom-server-deploy/m2-gate-report.json`](../insights/insight-headroom-server-deploy/m2-gate-report.json) | Gate report |

**GitHub Issue:** #186

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (6 задач из консилиума 2026-06-27)

**C1 — `ritual:day` + graph smoke**
Добавить в скрипт утреннего ритуала вызов `codebase-memory-mcp cli index_status` (или аналог через PATH). При отсутствии индекса — warn, не fail. Цель: убедиться, что граф актуален до начала работы.

**C2 — `RAG_TOP_K` archive-circuit**
В `packages/services/rag/src/config.ts` поднять дефолт `RAG_TOP_K` для archive-circuit до 15–20 (operative оставить 5–7). Обновить `.env.example`. Мотивация: headroom сжимает RAG-контекст на 88.8%, room для топ-K вырос.

**C3 — `rag-evening-index.mjs` audit-reads hook**
После вызова `codebase-memory-mcp cli index_repository` добавить вызов:
```
headroom audit-reads --format json > docs/archive/<YYYY-MM-DD>-audit-reads.json
```
Non-blocking (skip если `headroom` не в PATH). Файл не коммитится (добавить в `.gitignore`).

**C4 — `CONTRIBUTING.md` graph-first navigation**
Добавить раздел «Graph-first navigation» с рекомендацией:
- Перед cross-package задачей: `search_graph` → `trace_path` → точечный `Read`
- Перед рефактором затрагивающим несколько пакетов: `trace_path` от изменяемого узла
- `check-package-boundaries.mjs` остаётся CI-gate, граф — для исследования

**C5 — headroom HEADROOM_EXCLUDE**
Добавить в `tools/headroom-venv/` файл `headroom.env.example`:
```
HEADROOM_EXCLUDE=packages/core/src
```
Документировать в `docs/MCP_INTEGRATION_STRATEGY.md` §9 как обязательное условие до постоянного proxy.

**C6 — proxy-perf замер**
Написать инструкцию `tools/headroom-venv/PROXY_SETUP.md`:
1. `headroom proxy` в отдельном терминале
2. `ANTHROPIC_BASE_URL=http://localhost:8787 yarn claude:code`
3. После сеанса: `headroom perf --format json > docs/insights/insight-headroom-server-deploy/proxy-perf-report.json`

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Конфиг RAG | `packages/services/rag/src/config.ts` | `RAG_TOP_K_ARCHIVE` default = 15 |
| Env example | `.env.example` | `RAG_TOP_K_ARCHIVE=15` |
| Evening hook | `scripts/rag-evening-index.mjs` | audit-reads блок (non-blocking) |
| Contributing | `CONTRIBUTING.md` | раздел Graph-first navigation |
| Headroom env | `tools/headroom-venv/headroom.env.example` | HEADROOM_EXCLUDE |
| Proxy docs | `tools/headroom-venv/PROXY_SETUP.md` | инструкция C6 |

**Запрещено:**
- Менять логику компрессии для `packages/core/src` — только exclude
- Изменять `RAG_TOP_K` operative-circuit (остаётся 5–7)
- Коммитить `docs/archive/*-audit-reads.json`

---

### Тесты

| Область | Минимум |
|---------|---------|
| RAG config | `packages/services/rag/src/config.test.ts` — проверить новый дефолт |
| Evening hook | `node --check scripts/rag-evening-index.mjs` синтаксис |

---

### Definition of Done

- [ ] C1: `yarn ritual:day` не падает при отсутствующем/актуальном индексе
- [ ] C2: `RAG_TOP_K_ARCHIVE=15` в `config.ts` и `.env.example`
- [ ] C3: `rag-evening-index.mjs` пишет audit-reads JSON, `docs/archive/*.json` в `.gitignore`
- [ ] C4: `CONTRIBUTING.md` содержит раздел «Graph-first navigation»
- [ ] C5: `tools/headroom-venv/headroom.env.example` с `HEADROOM_EXCLUDE`; упомянуто в `MCP_INTEGRATION_STRATEGY.md` §9
- [ ] C6: `tools/headroom-venv/PROXY_SETUP.md` существует
- [ ] `yarn turbo run lint typecheck --filter=@membrana/rag` — зелёный
- [ ] LGTM Teamlead (Vesnin)

---

### Out of scope

- Реализация самого proxy-сеанса (это ручная операция, C6 — только документация)
- Изменения в CI pipeline
- Issue #185 (services→device-board) — отдельный трек

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — проверяет C5 (HEADROOM_EXCLUDE) и C4 (CONTRIBUTING), выдаёт LGTM
2. **Математик (Dynin)** — C1, C2, C3, C6 (основной исполнитель)
3. **Структурщик (Ozhegov)** — C4 (CONTRIBUTING.md, формулировка trace_path)
4. **Музыкант (Kuryokhin)** — не затронут
5. **Верстальщик (Rodchenko)** — не затронут

---

## Заметки для человека-постановщика

1. GitHub Issue #186 — `wish`, ссылка на этот файл в описании.
2. Реестр: `agent-context-optimization-v1` + C1–C6 как дочерние задачи (`status: active`).
3. После merge: `yarn task:archive agent-context-optimization-v1 --notes "PR #…"`.

### Проверка после PR

```bash
yarn turbo run lint typecheck --filter=@membrana/rag
node --check scripts/rag-evening-index.mjs
grep "Graph-first" CONTRIBUTING.md
grep "HEADROOM_EXCLUDE" tools/headroom-venv/headroom.env.example
```

---

## Связь с дорожной картой

- Эпик `mcp-agent-tooling-2026-06-27` закрыт; этот эпик — продолжение, фиксирует выводы консилиума
- Приоритет: **ниже product-эпиков** (как и весь infra-трек)
- После C6 (proxy-perf): переоценка перевода headroom из `pilot` в `active` (Tier 1 → Tier 0)

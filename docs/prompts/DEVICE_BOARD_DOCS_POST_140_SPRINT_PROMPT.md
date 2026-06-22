# Промпт (day sprint · active): Device-Board — документация после #139/#140 + RAG index

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** day-sprint **`device-board-docs-post-140-sprint-2026-06-22`**  
> **Предшественник:** PR [#140](https://github.com/officefish/Membrana/pull/140) · эпики function-modal (#139), follow-up F1–F7, edit model v2  
> **Связанный эпик:** `db-doc-v04-mvp` (Mintlify baseline — **не закрывать**, дополняем)  
> **Статус:** **active**  
> **Пакет:** `docs/`, `apps/docs`, `packages/device-board` (README/CONCEPT only)

---

## Контекст

За июнь 2026 device-board получил крупный UX/edit слой:

| Источник | Что появилось |
|----------|----------------|
| PR #139 | Function editor, pins inspector, viewport fit, minimap |
| PR #140 F1–F7 | Breadcrumbs, direct function edit, undo depth=1, F7 branch snapshot, pin meter, runtime exec highlight, deletable GetDevice |
| PR #140 E1–E3 | `navigateScenarioBranch` + `RevertPolicy`, `edit-undo-controller`, nav integration tests |

**Проблема:** канон (`DEVICE_BOARD_CONCEPT.md`), catalog (`device-board.md`), Mintlify (`apps/docs/device-board/editor/*`) и agent prompts **отстают** от кода. Агенты и операторы опираются на устаревшие описания.

**RAG:** в репозитории разворачивается dual-circuit RAG (`@membrana/rag-service`, `yarn rag:index` / `yarn rag:query`). После обновления docs — проиндексировать изменённые пути, чтобы standup/code-review/consilium подтягивали актуальный контекст.

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-DOC-1** | Один источник правды по UX/edit: CONCEPT § + catalog + Mintlify editor pages (без дублирования runtime semantics) |
| **D-DOC-2** | Описать **явно**: undo scope (depth=1, no drag), F7 revert matrix, function navigation (`keep-dirty` vs `revert-if-dirty`) |
| **D-DOC-3** | Catalog `device-board.md` → **stable** после D1–D3 |
| **D-RAG-1** | После merge doc PR: `yarn rag:index` (incremental) на обновлённых `docs/` + `apps/docs/` + `packages/device-board/*.md` |
| **D-RAG-2** | Зафиксировать в `DOCUMENTATION_WORKFLOW.md` ритуал «docs change → index → smoke query» |

---

## Phases

| Phase | Registry id | Size | DoD summary |
|-------|-------------|------|-------------|
| **D1** | `db-docs-d1-canon-sync` | M | `DEVICE_BOARD_CONCEPT.md` + `packages/device-board/README.md`: functions UX, undo, F7, navigation policy |
| **D2** | `db-docs-d2-mintlify-editor` | M | `apps/docs/device-board/editor/*`: undo, breadcrumbs, functions, branch snapshot; `yarn docs:lint` green |
| **D3** | `db-docs-d3-catalog-runtime` | S | `docs/catalog/.../device-board.md` stable; `SCENARIO_RUNTIME.md` cross-links при необходимости |
| **D4** | `db-docs-d4-rag-index` | M | RAG incremental index + smoke `yarn rag:query`; workflow doc updated |

**Рекомендуемый порядок:** **D1 → D2 → D3 → D4**

---

## Архитектура артефактов

| Слой | Путь | Инструмент |
|------|------|------------|
| Канон | `packages/device-board/DEVICE_BOARD_CONCEPT.md` | git |
| Пакет README | `packages/device-board/README.md` | git |
| Agent catalog | `docs/catalog/client/prompts/modules/device-board.md` | git → `yarn catalog:verify-client` |
| Mintlify | `apps/docs/device-board/**` | `yarn docs:dev` / `yarn docs:lint` |
| Workflow | `docs/DOCUMENTATION_WORKFLOW.md` | git |
| RAG corpus | `docs/`, `apps/docs/`, selective `packages/device-board/` | `yarn rag:index` (если сервис в ветке) |

**Запрещено:**

- Дублировать полный node reference из `db-doc-v04-mvp` — только ссылки
- Менять runtime-код ради docs
- Коммитить `.membrana/rag/` LanceDB blobs

### D4 — RAG (если `yarn rag:index` недоступен на ветке)

1. Обновить `DOCUMENTATION_WORKFLOW.md` § RAG с целевыми glob-путями.
2. В `archiveNotes` фазы D4: «index deferred until RAG merge».
3. После появления RAG в `main` — один incremental index + query smoke.

---

## Definition of Done (спринт)

- [ ] D1–D4 archived в реестре
- [ ] Catalog `device-board.md` status **stable**
- [ ] `yarn docs:lint` green
- [ ] `yarn catalog:verify-client` green
- [ ] RAG index run **или** documented defer в D4 archive card
- [ ] LGTM Teamlead

---

## Out of scope

- Полный node reference (эпик `db-doc-v04-mvp`)
- Mintlify production deploy
- Atlan glossary bulk import
- Изменения `@membrana/core` / `vesnin`

---

## Промпт целиком (для агента)

Ты — координатор Membrana (Vesnin). Задача: **синхронизировать документацию device-board с PR #139/#140**.

1. **D1:** обнови CONCEPT и README — undo, F7, functions, navigation (`RevertPolicy`), breadcrumbs, runtime highlight.
2. **D2:** расширь Mintlify editor pages; добавь страницу «Edit & navigation» при необходимости.
3. **D3:** доведи catalog до stable; проверь cross-links в SCENARIO_RUNTIME.
4. **D4:** запусти `yarn rag:index` на обновлённых путях; smoke `yarn rag:query "device-board undo branch switch"`; обнови DOCUMENTATION_WORKFLOW.

Не трогай runtime TypeScript кроме JSDoc в публичных graph-модулях если нужно для accuracy.

Перед PR: `yarn docs:lint` + `yarn catalog:verify-client`.

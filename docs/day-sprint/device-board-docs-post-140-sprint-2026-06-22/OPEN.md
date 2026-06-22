# Day sprint open — device-board-docs-post-140-sprint-2026-06-22

| Поле | Значение |
|------|----------|
| **Epic id** | `device-board-docs-post-140-sprint-2026-06-22` |
| **Kind** | day-sprint |
| **Opened** | 2026-06-22 |
| **Status** | **open** |
| **Predecessor** | PR #140 · `device-board-edit-model-v2-2026-06-22` (archived) |

## Goal

Подкрепить изменения device-board (#139/#140) в каноне, Mintlify, catalog и проиндексировать обновлённые docs через RAG.

## Phases

| Phase | Task id | Size | Focus |
|-------|---------|------|-------|
| D1 | `db-docs-d1-canon-sync` | M | CONCEPT + package README |
| D2 | `db-docs-d2-mintlify-editor` | M | `apps/docs` editor UX |
| D3 | `db-docs-d3-catalog-runtime` | S | catalog stable + runtime links |
| D4 | `db-docs-d4-rag-index` | M | `yarn rag:index` + workflow |

**Prompt:** [`DEVICE_BOARD_DOCS_POST_140_SPRINT_PROMPT.md`](../../prompts/DEVICE_BOARD_DOCS_POST_140_SPRINT_PROMPT.md)

## Out of scope

Full node reference (`db-doc-v04-mvp`), production Mintlify deploy.

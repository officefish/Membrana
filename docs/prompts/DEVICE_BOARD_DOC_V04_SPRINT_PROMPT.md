# Промпт (day sprint · active): Device Board — Mintlify node reference (db-doc-v04-mvp)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** day-sprint **`device-board-doc-v04-sprint-2026-06-22`** · эпик **`db-doc-v04-mvp`**  
> **Предшественник:** docs post-#140 (editor pages) · PR [#140](https://github.com/officefish/Membrana/pull/140)  
> **Статус:** **closed** (2026-06-22)  
> **Пакет:** `apps/docs`, `docs/catalog/` (links only)

---

## Контекст

Эпик **`db-doc-v04-mvp`** ([`DEVICE_BOARD_DOC_V04_PROMPT.md`](./DEVICE_BOARD_DOC_V04_PROMPT.md)): полный **node reference** в Mintlify. Phase 0 + editor docs (post-#140) готовы; в `docs.json` и `nodes/index` — устаревший срез палитры (8 из 26 `V04_PALETTE_NODE_KINDS`).

**Канон кода:** `packages/device-board/src/graph/palette-node.ts`, `runtime/block-executor.ts`.

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-DOCV4-1** | Одна MDX-страница на `nodeKind` из `V04_PALETTE_NODE_KINDS` + system nodes |
| **D-DOCV4-2** | Шаблон страницы: Pins → Runtime → Preconditions → Anti-patterns → Minimal graph → Code |
| **D-DOCV4-3** | `docs.json` — группы Nodes по домену (globals, streaming, collectors, recording, journal, system) |
| **D-DOCV4-4** | Не дублировать editor UX (уже в `editor/*`) |

---

## Phases

| Phase | Registry id | Size | DoD |
|-------|-------------|------|-----|
| **DV1** | `db-doc-v04-dv1-nav-index` | S | `docs.json` nav + `nodes/index` полная таблица 26 kinds |
| **DV2** | `db-doc-v04-dv2-streaming-globals` | M | device-global, get-microphone, get-fft-frame, print/stop-streaming в nav |
| **DV3** | `db-doc-v04-dv3-collectors` | M | get-recorder, get-spectral-analyser, collect-*, flush |
| **DV4** | `db-doc-v04-dv4-journal-reporter` | M | get-journal … publish-report |
| **DV5** | `db-doc-v04-dv5-recording-policy` | M | make-*-policy, start/stop-recording, make-track, trends |
| **DV6** | `db-doc-v04-dv6-cookbooks-system` | S | cookbooks в nav, variable-get-set, stop-runtime, `yarn docs:lint` |

**Порядок:** **DV1 → DV2 → … → DV6**

---

## Definition of Done (спринт)

- [ ] DV1–DV6 archived
- [ ] Все `V04_PALETTE_NODE_KINDS` имеют MDX + ссылку из index
- [ ] `yarn docs:lint` green
- [ ] Catalog `device-board.md` — ссылка на nodes index (one-liner)
- [ ] LGTM Teamlead

## Out of scope

- Mintlify production deploy
- 3 Docs Canvas (эпик db-doc-v04 Phase 3 — отдельно)
- RAG index run

---

## Промпт целиком (для агента)

Ты — Vesnin. Продолжи **`db-doc-v04-mvp`**: node reference в `apps/docs/device-board/nodes/`.

1. **DV1:** синхронизируй `docs.json` и `nodes/index.mdx` с `V04_PALETTE_NODE_KINDS`.
2. **DV2–DV5:** пиши MDX по шаблону, сверяясь с `palette-node.ts` и `block-executor.ts`.
3. **DV6:** cookbooks + system nodes в nav; `yarn docs:lint`.

После каждой фазы: `yarn task:archive <id> --notes "…"`.

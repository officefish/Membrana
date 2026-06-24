# Промпт (day sprint): Device-Board — fn-blocks inspector (#172)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** эпик **`device-board-fn-blocks-sprint-2026-06-24`** (archived)  
> **Статус:** **closed** · PR [#173](https://github.com/officefish/Membrana/pull/173) · closure [`CLOSURE.md`](../day-sprint/device-board-fn-blocks-sprint-2026-06-24/CLOSURE.md)  
> **Предшественник:** [`DEVICE_BOARD_PR_BATCH_SPRINT_2026-06-24_PROMPT.md`](./DEVICE_BOARD_PR_BATCH_SPRINT_2026-06-24_PROMPT.md) (merged #170/#171)  
> **Пакет:** `@membrana/device-board` only

---

## Контекст

После #170 одна user function может встречаться на ветке несколько раз (`fn-X-block`, `fn-X-block-2`, …).
Инспектор subgraph-блока показывает только имя функции и кнопку «Открыть редактор» — нет навигации между экземплярами.

---

## Product decisions

| ID | Решение |
|----|---------|
| **FB1-LIST** | При выборе subgraph-блока — список **всех экземпляров** той же `functionId` на **текущей ветке** |
| **FB2-JUMP** | Клик по экземпляру → select на канвасе + `focusNodeIds` |
| **FB3-LABEL** | Подпись «Вызов n» + `nodeId`; активный экземпляр выделен |
| **FB4-SINGLE** | Один экземпляр — компактная строка с `nodeId`, без лишнего списка |

Out of scope S1: удаление одного экземпляра из инспектора (уже есть в graph API), cross-branch список, Mintlify.

---

## Phases

| Phase | Registry id | Size | DoD |
|-------|-------------|------|-----|
| **S1** | `db-fb-s1-inspector-list` | M | Sidebar list + jump select; unit test helper; CONCEPT §18 дополнение |
| **S2** | `db-fb-s2-docs-smoke` | S | Manual smoke checklist; PR + LGTM |

**Порядок:** S1 → S2 → merge → `yarn task:archive`.

---

## Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Graph | `graph/list-subgraph-blocks-for-function.ts` | Pure list instances on branch |
| Shell | `device-board-shell.tsx` | Branch nodes → instances; `selectCanvasNodeById` |
| UI | `board-right-sidebar.tsx` | Fn-blocks panel в subgraph inspector |

---

## Definition of Done (S1)

```bash
yarn workspace @membrana/device-board run test -- src/graph/list-subgraph-blocks-for-function.test.ts
yarn workspace @membrana/device-board test
```

Manual: main branch → insert function ×2 → select block → sidebar shows 2 instances → click second → canvas selection jumps.

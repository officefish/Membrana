# Промпт (эпик): Device-Board — умное выравнивание exec-цепочек (U8a)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`db-node-align-advanced`**  
> **Родитель:** [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](./DEVICE_BOARD_POST_USERCASE_ROADMAP.md) (направление **U8a**)  
> **Предшественник:** U8 LGTM (`db-canvas-groups-functions`, PR #134) · A0 `align-nodes.ts`  
> **Статус:** **active** — консилиум 2026-06-21 (Rodchenko initiator)  
> **Ветка:** `feat/db-node-align-advanced` от `main` / `techies68`

---

## Контекст

U8 дал **ручное** выравнивание (8 режимов + bbox «Авто»). Оператору нужен layout **уровня chat-диаграмм** и UE Blueprints: exec-цепочка читается слева направо, ветки — параллельные ряды, data не ломает «хребет».

**Исследование (Perplexity, 2026-06-21):** layered layout (Sugiyama / dagre LR), exec primary / data secondary, grid snap 8 px, Tufte — минимум chartjunk. См. CONCEPT §18.5 → §19 (после ship).

**Текущее состояние:**

- `align-nodes.ts` — bbox ops + `computeSmartAlignPositions` (не знает exec graph).
- Marquee modal — submenu «Выровнять» + «Авто (сетка 8 px)».
- `BOARD_LAYOUT_GRID_PX = 8`, `BOARD_ALIGN_GAP_PX = 24`.

---

## Product decisions (консилиум · 2026-06-21)

| ID | Тема | Решение |
|----|------|---------|
| **D-LAYOUT-LR** | Направление | Exec auto-layout только **left → right** (scenario branches). Signal graph — out of scope. |
| **D-LAYOUT-SCOPE** | Область | Default = **marquee selection**; «от entry ветки» — отдельная кнопка (L2). |
| **D-LAYOUT-DATA** | Data edges | **L1:** layout только по exec; data edges не двигают узлы. **L1.1:** optional local refine. |
| **D-LAYOUT-UNDO** | Destructive layout | Без undo stack — **preview ghost** перед apply (L2); L1 — immediate apply на selection (малый scope). |
| **D-LAYOUT-TIERS** | UX tiers | **Tier 0** manual align (A0) · **Tier 1** bbox «Авто» · **Tier 2** exec dagre · **Tier 3** snap guides on drag |

---

## Scope

### In scope (волны L1 → L2 → L3)

| Wave | Task id | Deliverable |
|------|---------|-------------|
| **L1** | `db-naa-l1-exec-dagre` | `layout-exec-chain.ts` + `@dagrejs/dagre` LR + unit tests; modal «Упорядочить exec-цепочку» |
| **L2** | `db-naa-l2-branch-entry` | Кнопка на ветке main/alarm «Упорядочить от entry»; preview ghost перед apply |
| **L3** | `db-naa-l3-snap-guides` | Figma-like alignment guides при drag (8 px grid + snap к соседям) |

### Out of scope

- Signal graph autolayout.
- Full-document re-layout без scope.
- Undo/redo stack (отдельный эпик).
- Orthogonal data-edge routing (edge path editing).
- ELK worker / graphs >100 nodes (stage-gate).

---

## Архитектура

### Слой → путь

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Graph ops | `layout-exec-chain.ts` | Pure: exec subgraph → positions Map |
| Graph ops (existing) | `align-nodes.ts` | Manual + bbox auto (не трогать семантику) |
| Graph UI | `board-selection-action-modal.tsx` | Tier 1 vs Tier 2 кнопки |
| Shell | `device-board-shell.tsx` | Handlers, branch entry (L2) |
| Canvas | `board-flow-canvas.tsx` | Snap guides overlay (L3) |

### Алгоритм L1 (exec dagre)

1. Filter `scopeNodeIds` + exec edges (`resolveHandle` → exec/event → exec).
2. Build dagre graphlib; `rankdir: 'LR'`, `acyclicer: 'greedy'` (loop-repeat).
3. Node size: `measured` ?? `BOARD_NODE_MARQUEE_*`.
4. `ranksep = width + BOARD_ALIGN_GAP_PX`, `nodesep = BOARD_ALIGN_GAP_PX`.
5. Translate layout to preserve selection anchor (min x/y).
6. Snap top-left to `BOARD_LAYOUT_GRID_PX`.

```typescript
computeExecChainLayoutPositions(
  nodes: readonly Node[],
  edges: readonly Edge[],
  scopeNodeIds: ReadonlySet<string>,
): Map<string, { x: number; y: number }>
```

---

## UI (Rodchenko)

**Modal «Выровнять» — два tier:**

```text
┌─ Быстрое (selection bbox) ─────────────┐
│  [ Авто · сетка 8 px ]                  │  ghost btn
└─────────────────────────────────────────┘
┌─ Exec-цепочка (Blueprint) ─────────────┐
│  [ ⇉ Упорядочить exec · LR ]           │  outline primary
└─────────────────────────────────────────┘
```

- Badge `Blueprint` / `exec · LR` на Tier 2.
- Disabled если <2 узлов или нет exec-рёбер в selection.
- Tooltip: «Layered layout слева направо по exec-рёбрам».

**L2 — toolbar ветки** (main / alarm): ghost «Упорядочить exec-цепочку» → preview → Apply / Cancel.

---

## Definition of Done (эпик)

- [x] L1: `layout-exec-chain.ts` + tests (linear chain monotonic x; MVP main fixture smoke)
- [x] L1: modal Tier 2 wired in shell
- [x] L2: branch entry + ghost preview
- [x] L3: snap guides on drag
- [x] CONCEPT §19 auto-layout rules
- [x] CI green `@membrana/device-board`

---

## Мнение команды (консилиум · 2026-06-21)

```text
[Верстальщик — Rodchenko]:
Chat-диаграммы читаются L→R; exec — spine, data — вторично. Modal: явно разделить «Авто»
и «Упорядочить exec». Snap guides — постоянный edit-mode affordance (L3).

[Математик — Dynin]:
dagre = Sugiyama layered LR; тесты: monotonic x, branch symmetry heuristic, cycle via acyclicer.

[Структурщик — Ozhegov]:
layout-exec-chain.ts — pure, без React. dagre только в device-board. A0 не раздуваем.

[Teamlead — Vesnin]:
Форма LGTM. Core не трогаем. L1 ship first; preview/undo — L2 gate.

[Музыкант]:
—
```

---

## Связанные документы

- [`DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md) §18.5, §19 (planned)
- [`DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md`](./DEVICE_BOARD_CANVAS_GROUPS_FUNCTIONS_EPIC_PROMPT.md) (U8, archived)
- [`DESIGN.md`](../DESIGN.md) — grid 8 px, modal tokens

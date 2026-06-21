# Промпт (эпик): Device-Board — группы, пользовательские функции, выравнивание (U8)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `id` = **`db-canvas-groups-functions`**  
> **Родитель:** [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](./DEVICE_BOARD_POST_USERCASE_ROADMAP.md) (направление **U8**)  
> **Предшественник:** Pure Getters LGTM · UserCase MVP LGTM  
> **Статус:** **active** — консилиум 2026-06-21, Product decision **D-PINS-9**  
> **Ветка:** `feat/db-canvas-groups-functions` от `main` / `techies68` (не `vesnin`, кроме additive core pins)

---

## Контекст

После UserCase MVP и Pure Getters оператору нужен **редактор уровня Blueprint**: быстро выделить фрагмент графа, упаковать в функцию или визуальную группу, выровнять узлы.

**Референс UE:** [Collapsing Graphs](https://dev.epicgames.com/documentation/en-us/unreal-engine/collapsing-graphs-in-unreal-engine) (marquee → Collapse to Function / Collapsed Graph), [Nodes](https://dev.epicgames.com/documentation/en-us/unreal-engine/nodes-in-unreal-engine) (tunnel Input/Output).

**Текущее состояние `@membrana/device-board`:**

- Одна demo-функция `Capture+Detect`, legacy `blockKind`, без system Input/Output.
- `ScenarioFunctionSubgraph.inputPins` / `outputPins` в core — **поля без UI/runtime**.
- Вкладка `function`, но нет списка функций и кнопки **+**.
- Нет marquee, comment groups, align tools.

---

## Product decisions (LGTM · 2026-06-21)

| ID | Тема | Решение |
|----|------|---------|
| **D-PINS-9** | Лимит параметров функции | **до 9 pins на Input** и **до 9 pins на Output** (независимо). Exec и data pins считаются в общем лимите каждой стороны. |
| **D-GROUP-VS-FN** | Группа vs функция | **Comment group** — только canvas (title, description, frame); **не** runtime. **User function** — `scenario.functions[]` + `subgraph`-блок на ветке. |
| **D-DEPTH-1** | Вложенность | Сохраняем **depth ≤ 1** (`validate-function-depth.ts`): функция не содержит subgraph-блоков. |
| **D-MARQUEE** | Выделение | Drag на pane → glass-rect → multi-select → action modal. |
| **D-ALIGN-SPLIT** | Выравнивание | MVP (6 align + 2 distribute) — **этот эпик**; snap guides / dagre — **`db-node-align-advanced`**. |

---

## Scope

### In scope (волны R0 → F1 → G1 → A0)

1. **Marquee selection** — pointer down на pane (не на node) + drag → полупрозрачный rect (`backdrop-blur`, `border-primary/30`).
2. **Action modal** после отпускания: «Объединить в функцию», «Объединить в группу», «Выровнять ▾», «Отмена».
3. **Collapse to function** — узлы уходят с ветки; создаётся/обновляется `ScenarioFunctionSubgraph`; на родителе — `subgraph`-блок; авто-inference граничных wires → pins (с подтверждением в sidebar).
4. **Function canvas** — system nodes **`function-input`** / **`function-output`**; sidebar CRUD pins (имя, `SocketType`, exec|data); rename функции + comment/description.
5. **Sidebar «Пользовательские функции»** — список + **`+`** новая пустая функция (Input/Output по умолчанию).
6. **Comment group** — рамка (dashed border), title, description; persist в document; **не** влияет на Run.
7. **Align MVP** — left/right/top/bottom/center H/V; distribute H/V (≥3 nodes, gap 24px).

### Out of scope

- Nested functions, function-in-function, signal-layer grouping.
- Undo/redo stack (отдельно).
- Expand function inline на parent canvas (v1.1).
- `db-node-align-advanced` (grid snap, alignment guides, dagre auto-layout).

---

## Архитектура

### Слой → путь

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Core (additive) | `scenario-graph.ts`, `scenario-node-kind.ts` | `ScenarioFunctionPin`, `ScenarioCommentGroup`, `function-input` / `function-output` kinds; validate ≤9 per side |
| Graph ops | `marquee-selection.ts`, `collapse-to-function.ts`, `comment-group.ts`, `align-nodes.ts` | Pure transforms nodes/edges/groups |
| Graph UI | `board-flow-canvas.tsx`, `board-group-node.tsx`, `board-marquee-overlay.tsx` | Pointer handlers, group frame |
| Context | `device-board-graph-context.tsx` | `functions[]`, multi-function state, selection |
| Shell | `device-board-shell.tsx`, `board-right-sidebar.tsx` | Function list +, IO inspector, group inspector, action modal |
| Runtime | `resolve-input.ts`, `block-executor.ts` | IO bridge at subgraph call |
| Serialize | `hydrate-board-from-document.ts`, `build-device-scenario.ts` | groups + multi-function round-trip |

### Контракт pin (draft)

```typescript
/** Один pin на границе функции (Input или Output). */
export interface ScenarioFunctionPin {
  readonly id: string;
  readonly name: string;
  readonly kind: 'exec' | 'data';
  readonly socketType?: SocketType; // обязателен для data
}

/** ScenarioFunctionSubgraph — расширение v1: */
readonly inputPins: readonly ScenarioFunctionPin[];  // max 9
readonly outputPins: readonly ScenarioFunctionPin[]; // max 9
readonly description?: string;
```

Миграция: legacy `readonly string[]` pins → normalize to `ScenarioFunctionPin[]` on hydrate (id = slug(name)).

### Collapse to function (алгоритм)

1. Selection `S`, boundary edges `E` (source ∉ S XOR target ∉ S).
2. Infer pins: exec-in on boundary → input exec pin; exec-out → output exec pin; data wires → typed data pins.
3. Enforce **≤9** per side; если больше — modal ошибка, не collapse.
4. Create function subgraph; move nodes; wire `subgraph` block; open function tab for review.

### Comment group (document)

```typescript
export interface ScenarioCommentGroup {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly nodeIds: readonly string[];
}
```

Хранить в `device-scenario` рядом с `scenario` (не как runtime node). React Flow: optional `parentId` для child positioning.

---

## Волны и PR

| Wave | Task id | PR focus |
|------|---------|----------|
| **R0** | `db-cgf-r0-marquee-modal` | Marquee overlay, multi-select, modal shell (stub actions OK) |
| **F1** | `db-cgf-f1-user-functions` | Multi-function, + button, Input/Output nodes, collapse, IO CRUD, runtime bridge |
| **G1** | `db-cgf-g1-comment-groups` | Group frame, collapse to group, serialize |
| **A0** | `db-cgf-a0-align-basic` | `align-nodes.ts` + modal submenu + unit tests |

**Отдельный эпик:** `db-node-align-advanced` — snap, guides, dagre «упорядочить exec-цепочку».

---

## UI (Rodchenko)

- **Marquee:** `crosshair` на pane; glass rect; Esc снимает selection.
- **Modal:** DaisyUI `modal`; primary = «Объединить в функцию»; ghost «Отмена».
- **Group frame:** `border-2 border-dashed border-accent/40`, label `text-xs font-semibold`.
- **Function sidebar:** таблица pins — Add disabled при count === 9; delete row; имя функции + textarea comment.
- **Align submenu:** 6 align + 2 distribute (disabled if &lt;2 or &lt;3 nodes).

---

## Definition of Done (эпик)

- [ ] Marquee + modal; Esc/Отмена
- [ ] Collapse → function; subgraph block; Run проходит smoke
- [ ] Input/Output system nodes; **≤9 pins per side** enforced in UI + pre-run
- [ ] «+» создаёт функцию; список в sidebar
- [ ] Comment group persist + не ломает runtime
- [ ] Align MVP + tests `align-nodes.test.ts`
- [ ] CONCEPT §12 note: groups ≠ runtime; functions depth ≤ 1
- [ ] Operator smoke: выделить фрагмент main → function → call → journal OK

---

## Мнение команды (консилиум)

```text
[Teamlead — Vesnin]:
U8 — следующий ROI после Pure Getters. Контракты vesnin откладываем; один additive PR в core для ScenarioFunctionPin + comment groups.

[Структурщик — Ozhegov]:
Graph ops — pure functions; context только orchestration. Запрет Web Audio / agenda в graph layer.

[Верстальщик — Rodchenko]:
Glass marquee + modal по DESIGN.md; align MVP в этом эпике, «красивый autolayout» — db-node-align-advanced.

[Математик — Dynin]:
align-nodes.ts — unit tests на bbox/distribute без DOM.
```

---

## Связанные документы

- [`DEVICE_BOARD_CONCEPT.md`](../packages/device-board/DEVICE_BOARD_CONCEPT.md) §4.3 Blueprint parity, §12 depth ≤ 1
- [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](./DEVICE_BOARD_POST_USERCASE_ROADMAP.md)
- [`PURE_GETTERS_LGTM.md`](../device-board-scripts/PURE_GETTERS_LGTM.md)

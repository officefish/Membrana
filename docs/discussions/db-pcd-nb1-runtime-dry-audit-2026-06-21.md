# NB1 runtime DRY audit — device-board-post-comp-debt

> **Дата:** 2026-06-21  
> **Lead:** Ozhegov  
> **Ветка:** `night/device-board-post-comp-debt-night-build-2026-06-21`

## Вопрос code-review

Пересекаются ли `exec-successor.ts`, `function-call-resolve.ts` и `function-pin-ops.ts`?

## Матрица ответственности

| Модуль | Слой | Когда | Вход | Выход |
|--------|------|-------|------|-------|
| `graph/function-pin-ops.ts` | **Editor / graph** | Collapse, hydrate, sidebar pin CRUD | React Flow `Node[]`, `ScenarioFunctionPin[]` | Updated nodes/edges, pin proposals |
| `runtime/function-call-resolve.ts` | **Runtime / data** | `executeScenarioBlock` on subgraph block call | Parent branch subgraph + block id | `ResolveInputContext` with `resolveFunctionInputPin` |
| `runtime/exec-successor.ts` | **Runtime / exec flow** | Subgraph walk, event dispatch | `ScenarioSubgraph`, node id, handle | Next node id or null |

## Overlap analysis

| Concern | function-pin-ops | function-call-resolve | exec-successor | Overlap? |
|---------|-------------------|----------------------|----------------|----------|
| Pin id strings (`exec-in`, `policy`, …) | Defines/edits pin metadata | Reads parent edge `targetHandle` | Matches exec edge handles | **Naming only** — no shared logic |
| Edge lookup | Remaps handles on canvas | Finds inbound data edge to block | Finds outbound exec edge | **Different predicates** (data vs exec, parent vs local) |
| function-output nodes | Sync block pins from draft | — | Special case: named exec-out = targetHandle | **Complementary** — editor syncs pins, runtime traverses |
| resolveInput / values | — | Delegates to `resolveNodeOutput` | — | **No duplication** |

## Verdict

**Refactor не требуется.** Модули разделены по слоям ARCHITECTURE:

- `function-pin-ops` — мутации графа в редакторе (D-PINS-9, collapse, hydrate).
- `function-call-resolve` — мост parent-branch → function body при **data** resolve (L9–L12 competition).
- `exec-successor` — единая точка **exec** traversal с учётом `function-output` boundary pins (L12).

Единственное улучшение NB1: JSDoc `@see` cross-refs + regression test для стандартного `exec-out` → `exec-in`.

## Consumers

```
function-pin-ops  → device-board-graph-context, hydrate, serialize, collapse
function-call-resolve → block-executor (subgraph call)
exec-successor    → exec-subgraph, event-dispatch
```

## Out of scope (deferred)

- Перенос pin CRUD в `packages/services/` — только при расширении catalog (consilium POL-01).
- Merge `findNode` helper в exec-successor vs event-dispatch — micro-DRY, не блокер.

**LGTM Ozhegov:** слои корректны, public API runtime не менялся.

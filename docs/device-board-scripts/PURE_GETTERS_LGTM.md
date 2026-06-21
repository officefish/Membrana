# Pure Getters — LGTM (device-board U7)

> **Date:** 2026-06-21  
> **id:** `db-pure-getters-blueprint-parity`  
> **Branch:** `vesnin`  
> **Канон:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §15.7  
> **Эпик:** [`DEVICE_BOARD_PURE_GETTERS_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_PURE_GETTERS_EPIC_PROMPT.md)

## Вердикт

**Pure Getters (Blueprint parity) выполнен** — explicit `pure` contract, inspector toggle,
exec-free policy constructors, bundled MVP main loop на data-only policy wires.

---

## Acceptance (epic LGTM)

| # | Критерий | Статус | Доказательство |
|---|----------|--------|----------------|
| 1 | `variable-get` pure → только data-edge, Run OK | **PASS** | `resolve-input.test.ts`, `exec-subgraph.test.ts` |
| 2 | `variable-get` impure → exec chain; toggle pure удаляет exec-edges | **PASS** | `pure-node-graph.test.ts`, G2 inspector |
| 3 | Ref getter sidebar: bound / empty ref, без редактирования | **PASS** | `board-right-sidebar.tsx` |
| 4 | Value getter sidebar: редактирование выходного value | **PASS** | `updateVariableValue` + sidebar |
| 5 | Policy constructors: only pure, no exec pins; MVP data-only | **PASS** | v08 JSON G3, `make-recording-policy-node.test.ts` |
| 6 | Runtime: `resolveInput` без stale tick-cache (D4) | **PASS** | `resolve-input.test.ts` |
| 7 | CI tests green | **PASS** | `yarn workspace @membrana/device-board test` (327) |

**Smoke:** `yarn trends-parity:smoke-matrix`, `yarn recording-parity:smoke-matrix` — green.

---

## Закрытые фазы

| Фаза | id | Результат |
|------|-----|-----------|
| P0 | `db-pure-getters-p0-spec-lgtm` | D1–D5 product LGTM |
| G0 | `db-pure-getters-g0-core-contract` | `scenario-node-pure.ts`, `ScenarioGraphNode.pure` |
| G1 | `db-pure-getters-g1-runtime-validation` | exec-subgraph skip; validatePreRun hints |
| G2 | `db-pure-getters-g2-inspector-canvas` | Pure toggle; strip exec; ref/value sidebar |
| G3 | `db-pure-getters-g3-constructor-mvp` | MVP JSON data-only; MakeTrack→restart exec |
| G4 | `db-pure-getters-g4-lgtm` | CONCEPT §15.7 v0.9; этот sign-off |

---

## Ключевые артефакты

| Пакет | Путь |
|-------|------|
| `@membrana/core` | `packages/core/src/contracts/device-board/scenario-node-pure.ts` |
| `@membrana/device-board` | `pure-node-graph.ts`, `validate-pure-exec.ts`, policy node factories |
| MVP JSON | `docs/device-board-scripts/device-scenario-microphone-main-v08-policy-constructor.json` |
| Embedded default | `default-usercase-mvp-microphone.generated.ts` |

---

## Не входит в LGTM (v1 out of scope)

- Automatic graph layout «pull pure nodes left»
- UserCase picker UI (U1)
- Tick-level cache layer for impure getter outputs
- Proposal #2+ из UX-серии (pending Product Owner)

---

## Следующая фаза

См. [`DEVICE_BOARD_POST_USERCASE_ROADMAP.md`](../prompts/DEVICE_BOARD_POST_USERCASE_ROADMAP.md):

- **U1** UserCase picker / «Загрузить MVP»
- **U3** Port labels, branch titles RU
- **Proposal #2** — следующий UX-эпик от Product Owner

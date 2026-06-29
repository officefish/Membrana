# Epic: UserCase MVP v2 — groups, functions, async pipeline

> **Task-промпт (umbrella)** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `usercase-mvp-v2-groups-async`  
> **Технический эпик (основной):** [`DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md`](./DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md) — **`device-board-async-pipeline-v1`**  
> **Статус:** **active** (W1)  
> **Канон:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §16.5.1 · [`USERCASE_MVP_MICROPHONE.md`](../actions/device-board/specs/USERCASE_MVP_MICROPHONE.md)

---

## Контекст

Product wave **W1**: bundled mic MVP v0.9-functions shipped; async track/report pipeline — **следующий качественный шаг**.

**Umbrella scope:**

1. Graph UX — groups, collapse to functions (`ucv2-1`)
2. **Async pipeline** — Promise nodes, latent Sequence, non-blocking runtime (**`device-board-async-pipeline-v1`**)
3. Operator sign-off — LGTM doc

> **Важно:** минимальный shim `ucv2-2` **superseded** полным эпиком async pipeline (2026-06-25). Вся техническая спецификация — в [`DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md`](./DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md).

---

## Phases (registry)

| id | Фаза | Промпт / эпик |
|----|------|----------------|
| `ucv2-0-spec-lgtm` | Spec map | umbrella + consilium |
| `ucv2-1-graph-collapse` | Groups/collapse | → merged in `db-ap-r9` |
| `device-board-async-pipeline-v1` | **Async pipeline R0–R12** | **основной эпик** |
| `db-ap-r0` … `db-ap-r12` | Дочерние фазы | см. async pipeline prompt |

**Superseded (archived):** `ucv2-2`, `ucv2-3`, `ucv2-4` → `device-board-async-pipeline-v1`

---

## Known gaps (baseline `7e8a289c`)

| ID | Gap | Owner |
|----|-----|-------|
| G1 | upload-ok отстаёт от publish-done | `db-ap-r7`, `db-ap-r8` |
| G2 | drone-skip track-not-in-journal | `db-ap-r6`, `db-ap-r9` |
| G3 | cabinet live-records 500 | infra (out of scope) |
| G4 | referencedFunctions export | follow-up PR |
| G5 | fn-{functionName} rename | `db-ap-r9` or hotfix |

---

## Definition of Done (umbrella)

1. `device-board-async-pipeline-v1` archived с operator LGTM.
2. Bundled `usercase-mvp-microphone` v2.0-async в default.
3. `USERCASE_MVP_V2_GROUPS_ASYNC_LGTM.md` или `DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md`.

---

## Commands

```bash
yarn logs:parse -- --run-id 7e8a289c
yarn usercase:build-mvp-microphone
yarn workspace @membrana/device-board test
```

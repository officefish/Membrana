# Epic: UserCase MVP v2 — groups, functions, async tracks

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** `usercase-mvp-v2-groups-async` · дочерние `ucv2-0` … `ucv2-4`  
> **Статус:** **planned** (follow-up после bundled v0.9 cutover)  
> **Предшественник:** [`DEVICE_BOARD_BUNDLED_MVP_V09_SPRINT_PROMPT.md`](./DEVICE_BOARD_BUNDLED_MVP_V09_SPRINT_PROMPT.md) — sync exec interim  
> **Канон:** [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) §16.5.1 · [`USERCASE_MVP_MICROPHONE.md`](../device-board-scripts/USERCASE_MVP_MICROPHONE.md)

---

## Контекст

Bundled **v0.9-functions** (2026-06-24) ввёл `scenario.functions[]` и user-function subgraphs (`fn-1`, `fn-3`), но **MakeTrack / PublishReport на gate-true остаются синхронными** — main tick ждёт upload start и trends publish; второй `PublishReport` (track) часто даёт `drone-skip: track-not-in-journal`.

**Цель эпика:** production-grade graph UX (groups/collapse) + **async exec** для track/report/publish без блокировки main loop.

**Не дублировать:** cutover codegen / golden / migrate — закрыто спринтом `device-board-bundled-mvp-v09-sprint-2026-06-25`.

---

## Phases (registry)

| id | Фаза | DoD (кратко) |
|----|------|----------------|
| `ucv2-0-spec-lgtm` | Spec + LGTM | Карта groups/functions; LGTM doc |
| `ucv2-1-graph-collapse` | Graph collapse | Mic graph → groups + collapse to function |
| `ucv2-2-freeze-async-tracks` | **Async tracks** | MakeTrack/Publish fire-and-continue; убрать `track-not-in-journal` race |
| `ucv2-3-pack-verify` | Pack verify | `usercase:build` + verify-pack + smoke |
| `ucv2-4-operator-signoff` | Sign-off | Operator LGTM + epic close |

---

## Known gaps (from v0.9 smoke)

| ID | Gap | Owner phase |
|----|-----|-------------|
| G1 | `upload-ok` отстаёт от `publish-done` | ucv2-2 |
| G2 | `MakeReportFromTrack` → `drone-skip` | ucv2-2 |
| G3 | cabinet `live-records` 500 | background-office / cabinet (infra) |
| G4 | `referencedFunctions[]` branch export/import | отдельный PR или ucv2-3 |
| G5 | BD4 rename `fn-{functionName}` | ucv2-1 или hotfix |

---

## Smoke reference

Parse: [`CLIENT_LOGS_PARSING.md`](../device-board-scripts/CLIENT_LOGS_PARSING.md) · baseline `runId 7e8a289c`.

---

## Commands

```bash
yarn usercase:build-mvp-microphone
yarn logs:parse -- --run-id 7e8a289c
yarn workspace @membrana/device-board test
```

---

## Definition of Done (эпик)

1. Main tick не блокируется на media upload / journal publish (async contract).
2. Track-based report публикуется без стабильного `drone-skip` на happy path.
3. Operator sign-off + LGTM doc (`USERCASE_MVP_V2_GROUPS_ASYNC_LGTM.md` — TBD).

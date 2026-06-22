# CURRENT_TASK — Фазы 1–3 (2026-06-22)

> **Ветка:** `techies68` (pushed)  
> **Канон дня:** [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md)

## Закрыто сегодня

| Фаза | Артефакт |
|------|----------|
| **1** | Merge night-build + RAG → `techies68` (`87612ee`, `8f2ea0a`) |
| **2** | Registry: `device-board-post-comp-debt-*`, `rag-dual-circuit-v1` R0–R6 → **archived** |
| **3** | [`STAGE_GATE_1_TO_2_DECISION.md`](./STAGE_GATE_1_TO_2_DECISION.md) — soft pass prod, hard gate ❌, Этап 2 frozen |

## Активно (следующий фокус)

| id | Тема |
|----|------|
| `rag-r7-optional` | full LanceDB index bootstrap (нужен `OPENAI_API_KEY`) |
| `real-dataset-live-calibration` | полевой v0.3 (когда вернёмся к сбору) |
| Этап 1.B | YAMNet scaffold (T2) — по решению stage-gate doc |

## Локальный WIP (не закоммичено)

- Утренние ritual docs, `DETECTOR_BENCHMARK.md`, `latest.json`
- `docs/seanses/morning-audit-action-plan-2026-06-22-2026-06-22.md`
- **Новое:** `STAGE_GATE_1_TO_2_DECISION.md`, `docs/tasks/registry.json`, archive cards

## Команда для фиксации фаз 2–3

```bash
git add docs/STAGE_GATE_1_TO_2_DECISION.md docs/tasks/ docs/CURRENT_TASK.md
git commit -m "docs: stage-gate 1→2 decision + archive night-build and RAG epics"
```

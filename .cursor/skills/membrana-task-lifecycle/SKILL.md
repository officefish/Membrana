---
name: membrana-task-lifecycle
description: >-
  Manages Membrana M/L task prompts: registry active → work → yarn task:archive →
  task:close-github. Use when starting or closing a task, day-sprint phase, epic phase,
  or when user mentions task:archive, TASK_CLOSURE_REGULATION, or registry.json.
  Do NOT use for daily standup rhythm (membrana-developer-rhythm).
---

# Membrana task lifecycle

Канон: [`docs/prompts/TASK_PROMPT_WORKFLOW.md`](../../../docs/prompts/TASK_PROMPT_WORKFLOW.md), [`docs/prompts/TASK_CLOSURE_REGULATION.md`](../../../docs/prompts/TASK_CLOSURE_REGULATION.md).

**Процедура day-sprint (определение):** [`docs/procedures/day-sprint/`](../../../docs/procedures/day-sprint/) ·
регламент [`DAY_SPRINT_REGULATION.md`](../../../docs/DAY_SPRINT_REGULATION.md).
Инстансы — `docs/day-sprint/<id>/` (не путать с определением).

## When to use

- New M/L work: verify registry `status: active` + prompt exists.
- Phase/epic done: archive + optional sprint closure.
- User asks «закрой задачу», «archive», «DoD».
- Day-sprint epic/phases: follow procedure + regulation above.

## When NOT to use

- Morning/evening rituals without task closure.
- GitHub PR creation only (user rules / `gh`).

## Start (before first commit on M/L)

0. **`yarn neighbors`** — сверить пересечение СКОУПА (не только файлов) с соседними
   сессиями: свежие коммиты main, открытые PR, active-карточки за сегодня, свежие
   ветки (#469 ti-4; урок коллизии #452/#454).
1. **Канон START (#722):** `yarn task:start --id <slug> --title "…" --size S|M|L`
   — одна команда: GitHub Issue (если нужно) + registry + prompt stub с acceptance.
   На Windows body Issue только через tempfile / `--body-file`. Узкий шаг без Issue:
   `yarn task:register` (обёртка не ломает register).
2. Confirm `id` in [`docs/tasks/registry.json`](../../../docs/tasks/registry.json) — `status: active`.
3. Read full task prompt `docs/prompts/*_PROMPT.md` — block **«Промпт целиком»**.
4. Read [`docs/MAIN_DAY_ISSUE.md`](../../../docs/MAIN_DAY_ISSUE.md) if day work.
5. Do **not** expand scope without new Issue/prompt.

## Close (four levels)

| Level | Action |
|-------|--------|
| Product | DoD from prompt; Teamlead LGTM |
| Code | Merge PR or explicit defer in `archiveNotes` |
| GitHub | Report in Issue; `Closes #N` |
| Registry | **`yarn task:archive <id> --notes "…"`** |

Without registry archive, task stays **active** even if Issue is closed.

## Commands

```bash
yarn task:start --id <slug> --title "…" --size M   # START (#722)
yarn task:list
yarn task:sync-readme
yarn task:archive <id> --notes "PR #N, краткий итог"
yarn task:close-github:dry
yarn task:close-github    # evening batch
```

## Day-sprint / epic

- Child phases: `parentEpic` in registry; archive each phase when done.
- Sprint epic: archive after all phases; write `docs/day-sprint/<id>/CLOSURE.md`.
- Update `docs/DAY_SPRINT_ACTIVE.md`, `docs/DAY_SPRINT_LOG.md`, `docs/CURRENT_TASK.md`.

## archiveNotes examples

- `PR #140, CONCEPT §21 synced`
- `index deferred until RAG merge`
- `Prod smoke OK 2026-06-22 https://…` (Membrane Platform #67 only)

## Output format

Checklist: DoD items, archive command run, CLOSURE path if sprint, deferred items.

---
name: membrana-developer-rhythm
description: "Runs Membrana morning and evening developer rituals (morning-care, plan:day, standup, main-day-issue, archive:daily-day, code-review, ritual:day, ritual:evening). Use when the user says утро, вечер, standup, ritual, main-day-issue, or asks what to run next in the dev rhythm. Do NOT use for task archive/closure (membrana-task-lifecycle) or Night Build (membrana-night-sprint)."
---
# Membrana developer rhythm

Канон: [`docs/DEVELOPER_RHYTHM.md`](../../../docs/DEVELOPER_RHYTHM.md).

## When to use

- User asks to run morning/evening routine or «что делать утром/вечером».
- Agent needs correct **read order** before coding M/L work.

## When NOT to use

- Closing a task in registry → `membrana-task-lifecycle`.
- `night:open` / Night Build → `membrana-night-sprint`.
- Generic PR review → built-in `review-bugbot`.

## Read order before coding (M/L)

1. [`docs/MAIN_DAY_ISSUE.md`](../../../docs/MAIN_DAY_ISSUE.md) — **канон дня**
2. Task prompt from [`docs/tasks/registry.json`](../../../docs/tasks/registry.json)
3. GitHub Issue (triage)
4. [`docs/CURRENT_TASK.md`](../../../docs/CURRENT_TASK.md) — **только буфер**; при конфликте проигрывает п.1–3

## Morning (`yarn ritual:day`)

| Step | Command | Output |
|------|---------|--------|
| 0 | `git checkout techies68 && git pull` (or `yarn morning-care`) | branch |
| 1 | `yarn morning-care` (`--no-anthropic` to save tokens) | env check |
| 2 | `yarn plan:day` | `docs/STRATEGIC_PLAN_DAY.md` |
| 3 | `yarn standup` | `docs/DAILY_STANDUP.md` |
| 4 | `yarn main-day-issue` | `docs/MAIN_DAY_ISSUE.md` |

**Dry / no API:** `yarn ritual:day:no-api` or `yarn morning-care --no-anthropic` + `yarn standup:dry` + `yarn task:list`.

**Never run `yarn code-review` in the morning** — only **read** existing `docs/DAILY_CODE_REVIEW.md`. Details: `membrana-code-review`.

## Evening (`yarn ritual:evening`)

**Order matters** — archive morning files **before** code-review:

1. `yarn archive:daily-day` → `docs/archive/daily-day/<YYYY-MM-DD>/`
2. `yarn rag:index:incremental` (non-blocking; in `ritual:evening` chain)
3. `yarn code-review` → `docs/DAILY_CODE_REVIEW.md`
4. `yarn task:archive <id>` (per accepted tasks; may have been done daytime)
5. `yarn save-code-review`
6. `yarn task:close-github` → `yarn team-evening-feedback` (via `ritual-evening-tail.mjs`)

Team feedback: `membrana-team-evening-feedback` → `docs/seanses/team-evening-feedback-<date>.md`

## Output format

Summarize: which commands ran, which docs to read next, and current `MAIN_DAY_ISSUE` focus if present.

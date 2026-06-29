---
description: Pick the single main focus issue of the day (yarn main-day-issue)
agent: build
---

Determine today's one central task.

1. Ensure standup ran first (`docs/DAILY_STANDUP.md` exists); otherwise run `/standup`.
2. Execute `yarn main-day-issue` (`--dry-run` to preview, `--full` for extended context).
3. Output: `docs/MAIN_DAY_ISSUE.md` — one focus, DoD, and "not doing today".
4. Confirm `primaryFocusId` matches an active task in `docs/tasks/registry.json`.

Skill: `membrana-developer-rhythm`. Canon: `docs/prompts/TASK_PROMPT_WORKFLOW.md`.

$ARGUMENTS

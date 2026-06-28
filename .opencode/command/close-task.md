---
description: Close a registry task — archive + close its GitHub issue
agent: build
---

Close the registry task with id: **$ARGUMENTS**

1. Confirm the task id exists in `docs/tasks/registry.json` and is `status: active`.
2. Verify Definition of Done from the task prompt is met (CI green, AC satisfied).
3. Archive: `yarn task:archive $ARGUMENTS --notes "<PR #, outcome>"` → writes `docs/tasks/archive/$ARGUMENTS.md`, syncs README.
4. Close the GitHub issue (evening): `yarn task:close-github` (`--dry-run` to preview). Requires authenticated `gh`.

Skill: `membrana-task-lifecycle`. Canon: `docs/prompts/TASK_CLOSURE_REGULATION.md`. If no task id was provided, ask for it before archiving.

---
description: Generate the Membrana daily standup (yarn standup)
agent: build
---

Run the Membrana morning standup.

1. Execute `yarn standup` (add `--full` for extended context, `--dry-run` to preview without writing).
2. Output: `docs/DAILY_STANDUP.md`.
3. Summarize the standup: blockers, in-flight tasks, and the proposed focus.

Skill: `membrana-developer-rhythm`. Do not run `yarn code-review` in the morning — only read `docs/DAILY_CODE_REVIEW.md` if needed.

$ARGUMENTS

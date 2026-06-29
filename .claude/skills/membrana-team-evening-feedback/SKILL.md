---
name: membrana-team-evening-feedback
description: >-
  Runs Membrana Team Evening Feedback — mandatory finalizing step of the daily ritual.
  Five virtual team roles evaluate the day's artefacts in free-form, vote usefulness 1–10,
  and Teamlead produces a strategic summary with tomorrow's focus.
  PROACTIVELY invoke at the end of every work session, at the close of yarn ritual:evening,
  or whenever the user says вечерний ритуал, вечерний фидбек, ретроспектива дня,
  уходим на вечерний ритуал, closing the day, end of day, or завершаем день.
  Do NOT skip even if code-review failed — feedback runs independently.
  Do NOT use for architecture disputes (→ membrana-consilium) or code quality LGTM (→ membrana-code-review).
---

# Team Evening Feedback

Thin mirror — canonical playbook:
[`.cursor/skills/membrana-team-evening-feedback/SKILL.md`](../../../.cursor/skills/membrana-team-evening-feedback/SKILL.md)

Regulation: [`docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md`](../../../docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md)

## Proactive trigger contract

This skill is **mandatory** at the end of every work session. Claude Code MUST invoke it
without waiting for the user to ask explicitly, whenever:

- `yarn ritual:evening` just completed (or was attempted).
- The user signals end-of-day: "уходим на вечерний ритуал", "closing the day",
  "заканчиваем", "завершаем день", "до завтра".
- The session produced significant commits and no feedback was run today.

Skipping `team-evening-feedback` is a **process violation** — treat it like forgetting
`task:review` after a push.

## Commands

```bash
yarn team-evening-feedback                   # full (needs ANTHROPIC_API_KEY)
yarn team-evening-feedback --no-rag          # skip RAG, still calls API
yarn team-evening-feedback:dry              # context only, no API call
yarn team-evening-feedback --save-as <slug>  # custom seans name
```

## Workflow

1. Check if `docs/DAILY_CODE_REVIEW.md` exists and is fresh (today). If not, warn the
   user — but proceed anyway; feedback runs independently of code-review.
2. Run `yarn team-evening-feedback`. If `ANTHROPIC_API_KEY` is unavailable, run
   `yarn team-evening-feedback:dry` and show the assembled context so the user can
   copy it into a chat session manually.
3. Report to the user:
   - Average team score (1–10)
   - Teamlead verdict (alignment with `MAIN_DAY_ISSUE`, drift yes/no)
   - Top 3 tomorrow proposals
   - Path to saved seans: `docs/seanses/team-evening-feedback-<date>.md`
4. Commit the seans file if it was saved and the user hasn't said "stop after feedback".

## Safety

- Never skip because code-review failed — the two steps are independent.
- Never substitute consilium output for evening feedback.
- Do not run twice in the same session for the same date unless the user explicitly asks.

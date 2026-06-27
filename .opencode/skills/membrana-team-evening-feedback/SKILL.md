---
name: membrana-team-evening-feedback
description: "Runs Membrana Team Evening Feedback via yarn team-evening-feedback after code-review. Five roles evaluate day docs, discuss outcomes, vote usefulness 1-10, Teamlead strategy summary. Use when user says вечерний фидбек команды, team evening feedback, ретроспектива дня, or last step of yarn ritual:evening. Do NOT use for consilium disputes or code review."
---
# Team Evening Feedback

Канон: [`docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md`](../../../docs/prompts/TEAM_EVENING_FEEDBACK_REGULATION.md) · промпт: [`docs/prompts/TEAM_EVENING_FEEDBACK.md`](../../../docs/prompts/TEAM_EVENING_FEEDBACK.md).

## When to use

- User asks «вечерний фидбек», «team evening feedback», «ретроспектива дня».
- After `yarn code-review` / as step 6 of `yarn ritual:evening`.
- Agent should run the script when `ANTHROPIC_API_KEY` is available.

## When NOT to use

- Architecture dispute → `membrana-consilium` (`yarn consilium`).
- Code quality LGTM → `membrana-code-review`.
- Morning standup → `membrana-developer-rhythm`.

## Prerequisites

Run **after** evening code-review so `docs/DAILY_CODE_REVIEW.md` is fresh:

1. `yarn archive:daily-day`
2. `yarn code-review`
3. `yarn save-code-review`
4. `yarn team-evening-feedback` (or full `yarn ritual:evening`)

## Commands

| Goal | Command | Output |
|------|---------|--------|
| Evening feedback | `yarn team-evening-feedback` | `docs/seanses/team-evening-feedback-<date>.md` |
| Dry (no API) | `yarn team-evening-feedback:dry` | stdout only |
| No RAG | `yarn team-evening-feedback --no-rag` | same |
| Named seans | `yarn team-evening-feedback --save-as w0-hotfix` | `docs/seanses/w0-hotfix-<date>.md` |

## Inputs (auto-collected)

- `STRATEGIC_PLAN_DAY`, `DAILY_STANDUP`, `MAIN_DAY_ISSUE`, `DAILY_CODE_REVIEW`, `CURRENT_TASK`
- Git log since midnight
- Optional RAG context

## Output format (from prompt)

Five role blocks → voting table → tomorrow proposals → Teamlead strategy summary (alignment with `MAIN_DAY_ISSUE`, drift verdict, focus for next morning).

## Cursor agent workflow

1. Read skill + regulation if user triggers evening ritual.
2. Ensure `code-review` ran; if not, run it first or warn.
3. Run `yarn team-evening-feedback` (or `:dry` without API key).
4. Summarize for user: average score, Teamlead verdict, top 3 tomorrow items, path to saved seans.

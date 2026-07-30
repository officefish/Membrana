# Архив: RT-9: гвард свежести code-review — критичный сбой не молчит

| Поле | Значение |
|------|----------|
| **ID** | `rt-9-code-review-freshness` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-16 |
| **Архивирована** | 2026-07-30 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/RT_9_CODE_REVIEW_FRESHNESS_PROMPT.md`](../../prompts/RT_9_CODE_REVIEW_FRESHNESS_PROMPT.md) |

## Заметки при закрытии

Already implemented/merged earlier; this workspace repair closes a stale active registry entry and refreshes the archive card.

Evidence:

- `scripts/lib/artifact-freshness.mjs` exports `dateOf`, `isFresh`, `assertReviewInputFresh`, and `NON_CRITICAL_EVENING_STEPS`.
- `scripts/_daily-standup.mjs` gates `docs/DAILY_CODE_REVIEW.md` through `guardDailyCodeReviewInput`; `scripts/_main-day-issue.mjs` imports and runs the same guard.
- `docs/tasks/evening-ritual-steps.json` keeps `code-review` as `critical`; `ritual:evening` points to `scripts/ritual-evening-run.mjs`, not a shell chain with swallowed `code-review`.
- Verification: `node --test scripts/artifact-freshness.test.mjs scripts/daily-standup-paths.test.mjs scripts/main-day-issue-paths.test.mjs scripts/code-review-ritual.test.mjs` => 43/43.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

# Архив: Шип-гейт: мердж только через ревью-вердикт по HEAD SHA + required check (стена от обхода ревью)

| Поле | Значение |
|------|----------|
| **ID** | `ship-review-tooth` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-22 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #924 |
| **Linear** | DRU-321 |
| **Промпт** | [`docs/prompts/SHIP_REVIEW_TOOTH_PROMPT.md`](../../prompts/SHIP_REVIEW_TOOTH_PROMPT.md) |

## Заметки при закрытии

Stale local card repaired after code/Linear check.

Evidence:

- `package.json` exposes `task:review:ship`.
- `scripts/task-review-ship.mjs` orchestrates `task:review:prepare` →
  `task:review:run` → `task:review:finalize` around the exact squash SHA,
  fails closed when GitHub does not return `mergeCommit.oid`, derives base from
  the merge commit parent, and prints the choreography before execution.
- `scripts/task-review-ship.test.mjs` covers argument parsing, fail-closed
  squash SHA extraction, detached checkout planning when `main` has moved, and
  non-detached planning when HEAD equals the squash SHA.
- Prior branch review:
  `docs/discussions/branch-feat-agent-tooling-friction-2b-code-review.md` →
  LGTM; live dry-run on PR #479 reported as correct there.

Verification:

- `node --test scripts/task-review-ship.test.mjs scripts/task-closure-review.test.mjs scripts/task-closure-review-schema.test.mjs` → 45/45 pass.

Linear:

- Live snapshot `2026-07-29T16:09:54.707Z`, `linear-snapshot@1`,
  `recordCount=300`: `DRU-321` is Done, `githubIssueRefs=[924]`,
  `completedAt=2026-07-29T07:06:34.915Z`.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

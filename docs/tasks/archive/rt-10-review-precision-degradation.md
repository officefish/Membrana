# Архив: RT-10: честный режим precision — exact vs working-tree

| Поле | Значение |
|------|----------|
| **ID** | `rt-10-review-precision-degradation` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-16 |
| **Архивирована** | 2026-07-30 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/RT_10_REVIEW_PRECISION_DEGRADATION_PROMPT.md`](../../prompts/RT_10_REVIEW_PRECISION_DEGRADATION_PROMPT.md) |

## Заметки при закрытии

Implemented in current workspace; code not pushed/merged yet, PR on request.

What changed:

- `scripts/lib/day-work-diff.mjs` now distinguishes an empty successful
  `git log` from a failed git call.
- `precision` can be `exact`, `working-tree`, or `approximate`.
- `working-tree` is used when the day diff is unavailable, with an explicit
  note: "дифф недоступен, показано текущее дерево".
- Segment-level diff failures are marked with `diffAvailable: false` instead
  of looking like empty exact diffs.
- Commits near local midnight are marked `precision: approximate`.
- `scripts/code-review.mjs` relabels the working-tree context as fallback
  review subject when precision degrades.

Verification:

- `node --test scripts/day-work-diff.test.mjs scripts/code-review-ritual.test.mjs` → 31/31 pass.
- Targeted review: `docs/tasks/archive/rt-10-review-precision-degradation-code-review.md` → LGTM.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

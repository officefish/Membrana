# Архив: Приёмка фиксируется лишь в 10 из 32 закрытий

| Поле | Значение |
|------|----------|
| **ID** | `closure-acceptance-gate` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-23 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #1001 |
| **Linear** | DRU-365 |
| **Промпт** | [`docs/prompts/FRAME_RAILS_2307_PROMPT.md`](../../prompts/FRAME_RAILS_2307_PROMPT.md) |

## Заметки при закрытии

Карточка не была просто stale: `scripts/lib/trace-acceptance.mjs` и тесты
существовали, но `finalizeReviewManifest` не применял `checkAcceptance`, поэтому
закрытие можно было выполнить через библиотечный путь без acceptance-гейта.

Сделано в текущем worktree:

- `scripts/lib/task-closure-review.mjs`: `finalizeReviewManifest` вызывает
  `checkAcceptance` по `{ acceptedBy, headRev }`, пишет структурированный след
  `completion.acceptanceGate`, а `acceptanceMode: "hard"` блокирует отсутствующую
  или stale-приёмку.
- `docs/schemas/task-closure-review.schema.json`: добавлен строгий контракт
  `completion.acceptanceGate`.
- `scripts/task-closure-review.test.mjs` и
  `scripts/task-closure-review-schema.test.mjs`: покрыты pass, soft-missing,
  hard-missing, hard-stale и schema-trace.

Проверки:

- `node --test scripts/task-closure-review.test.mjs scripts/trace-acceptance.test.mjs scripts/task-closure-review-schema.test.mjs` → 51/51 pass.
- Targeted code review по четырём файлам:
  `docs/tasks/archive/closure-acceptance-gate-code-review-targeted.md` → LGTM.
- Полный uncommitted review:
  `docs/tasks/archive/closure-acceptance-gate-code-review.md` → BLOCK из-за
  смешанного общего diff в дереве, не из-за acceptance-правки.

Linear:

- Live snapshot `2026-07-29T15:51:52.389Z`, `linear-snapshot@1`, `recordCount=300`:
  `DRU-365` существует, `githubIssueRefs=[1001]`, `state=Backlog`,
  `completedAt=null`.
- Внешний Linear-контейнер остаётся несинхронизированным; локальная карточка
  закрыта с доказательствами реализации и ревью.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

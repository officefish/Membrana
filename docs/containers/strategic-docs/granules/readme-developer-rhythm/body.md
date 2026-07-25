## Ритм разработки (утро / вечер / неделя)

Подробный регламент: **[`docs/DEVELOPER_RHYTHM.md`](./docs/DEVELOPER_RHYTHM.md)**.

| Когда            | Что запустить                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Утро**         | `yarn morning-care` → `yarn plan:day` → `yarn standup` → **`yarn main-day-issue`** (учитывает вчерашний `DAILY_CODE_REVIEW.md`)       |
| **Вечер**        | **`yarn archive:daily-day`** → **`yarn code-review`** → `yarn task:archive <id>` → `yarn save-code-review` → `yarn task:close-github` |
| **Неделя**       | `yarn analyzers:research:week` → `yarn plan:week`                                                                                     |
| **По ситуации**  | `yarn consilium "…"` (консенсус всех ролей), `yarn ask <persona> …` (совет одной роли)                                                |
| **Триаж issues** | `yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json`                                              |

Для скриптов с Claude нужен `ANTHROPIC_API_KEY` в `.env`. Утро: `yarn ritual:day`. Вечер: `yarn ritual:evening` (архив плана/стендапа/фокуса → code-review → team-evening-feedback в `docs/seanses/`). Code-review **не** утром. Фокус дня: `docs/MAIN_DAY_ISSUE.md`. Архив: [`docs/archive/README.md`](./docs/archive/README.md).

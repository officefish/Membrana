# Архив: NB5: scoped pre-push typecheck + commit-msg хук (трейлер+conventional)

| Поле | Значение |
|------|----------|
| **ID** | `nb-at-5-hooks` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-08 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md`](../../prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

stale card: NB5 уже реализован в дереве; evidence: .githooks/commit-msg содержит NB5 conventional gate и Co-Authored-By warning; .githooks/pre-push вызывает node scripts/prepush-typecheck-scope.mjs; scripts/prepush-typecheck-scope.mjs планирует affected typecheck без docs-trigger; node --test scripts/prepush-typecheck-scope.test.mjs = 8/8; docs/archive/night-build/2026-07-08/HANDOFF.md checkpoint NB5 pass/dogfooded; live Linear media snapshot 2026-07-29T15:15:53.976Z pullOk=true recordCount=297 matches=0, отдельного Linear-контейнера нет

## Отчёт о проверке

Карточка закрыта как устаревшая: реализация NB5 уже присутствовала в дереве, новая
кодовая правка не потребовалась.

**Доказательства в коде.**

- `.githooks/commit-msg` содержит метку `NB5, agent-tooling-night-build`, блокирует
  неконвенциональный заголовок и оставляет предупреждение при отсутствии
  `Co-Authored-By: Claude`.
- `.githooks/pre-push` вызывает `node scripts/prepush-typecheck-scope.mjs` как шаг
  `cg6/NB5`.
- `scripts/prepush-typecheck-scope.mjs` строит план affected typecheck, исключая
  `.md/.mdx` из typecheck-триггера.

**Проверки.**

- `node --test scripts/prepush-typecheck-scope.test.mjs` → 8/8 pass.
- `docs/archive/night-build/2026-07-08/HANDOFF.md` содержит checkpoint NB5:
  `Status: pass`, `scoped pre-push + commit-msg hook (dogfooded)`.

**Linear.**

Live snapshot через media:

- `format=linear-snapshot@1`, `producedBy=media-NL`;
- `pullOk=true`;
- `capturedAt=2026-07-29T15:15:53.976Z`;
- `recordCount=297`;
- поиск по `nb-at-5-hooks`, `NB5`, `scoped pre-push`, `commit-msg`,
  `prepush-typecheck-scope` дал `matches=0`.

Отдельного Linear-контейнера для этой карточки не найдено; `linearId` остаётся пустым.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

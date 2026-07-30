# Архив: NB7: tasks:archive-closed + lib/git-day-context (общий «работа дня»)

| Поле | Значение |
|------|----------|
| **ID** | `nb-at-7-bookkeeping-gitctx` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-08 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md`](../../prompts/AGENT_TOOLING_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

stale card: NB7 уже реализован в дереве; evidence: package.json содержит tasks:archive-closed; scripts/tasks-archive-closed.mjs реализует dry-run default и --execute; scripts/lib/git-day-context.mjs централизует headRevision/todaysCommits/todaysChangedFiles без author-фильтра; node --test scripts/git-day-context.test.mjs scripts/tasks-archive-closed.test.mjs = 4/4; docs/archive/night-build/2026-07-08/HANDOFF.md checkpoint NB7 pass, git-day-context + tasks:archive-closed, test:scripts 157/157; live Linear media snapshot 2026-07-29T15:19:13.411Z pullOk=true recordCount=297 matches=0, отдельного Linear-контейнера нет

## Отчёт о проверке

Карточка закрыта как устаревшая: реализация NB7 уже присутствовала в дереве, новая
кодовая правка не потребовалась.

**Доказательства в коде.**

- `package.json` содержит команду `tasks:archive-closed`.
- `scripts/tasks-archive-closed.mjs` реализует dry-run по умолчанию и режим
  `--execute`, выбирая active-карточки с закрытыми GitHub Issue.
- `scripts/lib/git-day-context.mjs` централизует `headRevision`,
  `todaysCommits`, `todaysChangedFiles`; логика работы дня не фильтруется по
  локальному git-автору.

**Проверки.**

- `node --test scripts/git-day-context.test.mjs scripts/tasks-archive-closed.test.mjs`
  → 4/4 pass.
- `docs/archive/night-build/2026-07-08/HANDOFF.md` содержит checkpoint NB7:
  `Status: pass`, `git-day-context + tasks:archive-closed, test:scripts 157/157`.

**Linear.**

Live snapshot через media:

- `format=linear-snapshot@1`, `producedBy=media-NL`;
- `pullOk=true`;
- `capturedAt=2026-07-29T15:19:13.411Z`;
- `recordCount=297`;
- поиск по `nb-at-7-bookkeeping-gitctx`, `NB7`, `tasks:archive-closed`,
  `git-day-context` дал `matches=0`.

Отдельного Linear-контейнера для этой карточки не найдено; `linearId` остаётся пустым.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) и реестру.

## Канон дня (2026-07-09)

**Текущий спринт:** `hermes-brief` ← **сейчас** (переход из инсайта `insight-hermes-liaison-agent`)

### Фокус

**Hermes brief** — детерминированный `yarn hermes:brief`, собирающий состояние сессии из
**6 источников** в `docs/HERMES_BRIEF.md`. Первый шаг adopted-инсайта (вес 7.4/10). Функция
ритма, не 6-я роль; бриф дескриптивный. Владелец — Математик (Dynin).

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и промпту:
docs/prompts/HERMES_BRIEF_PROMPT.md (блок «Промпт целиком»).
```

### Scope (кратко — канон в промпте)

- `scripts/hermes-brief.mjs` (переиспользует `scripts/lib/git-day-context.mjs`) + `yarn hermes:brief`
- `docs/HERMES_BRIEF.md` — иерархия «Сейчас» → «Контекст» → «Метаданные» (hash+timestamp)
- `scripts/hermes-brief.test.mjs` — детерминизм + fallback + сортировка (в `test:scripts`)
- тонкий read-only `.claude/agents/hermes.md`
- **Запрещено:** LLM-резюме, паковщик handoff, оркестратор, UI-панель, переписывание `plan:day`/`standup`

### Команды

```bash
yarn hermes:brief && sed -n '1,40p' docs/HERMES_BRIEF.md
node --test scripts/hermes-brief.test.mjs
```

**Инсайт:** [`insight-hermes-liaison-agent`](./insights/insight-hermes-liaison-agent/INSIGHT.md) (adopted, 7.4/10)
**Промпт:** [`HERMES_BRIEF_PROMPT.md`](./prompts/HERMES_BRIEF_PROMPT.md)
**Консилиум:** [`seanses/hermes-liaison-agent-2026-07-08.md`](./seanses/hermes-liaison-agent-2026-07-08.md)
**Реестр:** `id: hermes-brief` (`status: active`, `insightId: insight-hermes-liaison-agent`)

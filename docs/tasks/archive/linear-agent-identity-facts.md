# Архив: Ресёрч: Linear — личность агента, состояние подзадач, блокирующие связи

| Поле | Значение |
|------|----------|
| **ID** | `linear-agent-identity-facts` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-19 |
| **Архивирована** | 2026-07-30 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/LINEAR_AGENT_IDENTITY_FACTS_PROMPT.md`](../../prompts/LINEAR_AGENT_IDENTITY_FACTS_PROMPT.md) |

## Заметки при закрытии

Research artifact already exists at `docs/tasks/research/linear-agent-identity-facts.md`, generated 2026-07-19; the prompt explicitly says it is a skeleton and the research was already done.

Evidence:

- Local consumers cite the research as an input, not a solution: `docs/HANDOFF_2026-07-19_COWORK.md`, `docs/meeting/registry-relocation/MEETING_ACTIVE.md`, and cowork execution registry docs.
- Official Linear docs spot-check on 2026-07-30 confirms the core facts: agents/app users use `actor=app` plus `app:assignable`/`app:mentionable`; assigning an issue to an app sets the `delegate`, not the human `assignee`; parent/sub-issues are the decomposition primitive; issue relations include blocked/blocking; rate limits and webhook retry behavior mean an external gate needs sync discipline rather than blind webhook trust.
- Sources checked: `https://linear.app/developers/agents`, `https://linear.app/developers/oauth-2-0-authentication`, `https://linear.app/docs/parent-and-sub-issues`, `https://linear.app/docs/issue-relations`, `https://linear.app/developers/rate-limiting`, `https://linear.app/developers/webhooks`.

No code PR needed; this closes stale research bookkeeping.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*

---
name: membrana-consilium
description: "Runs Membrana virtual team consilium via yarn consilium with protocol saved to docs/seanses. Use for multi-role architectural or product disputes needing ≥20 role replies and a written consensus. Do NOT use for single-persona yarn ask or routine code review."
---
# Membrana consilium

Канон: [`docs/prompts/CONSILIUM_PROMPT.md`](../../../docs/prompts/CONSILIUM_PROMPT.md).

## When vs `yarn ask`

| Tool | Use |
|------|-----|
| `yarn ask vesnin "…"` | One role, one question |
| `yarn consilium "…"` | Five roles, debate, saved protocol |

## Run

```bash
yarn consilium --save-as <topic-slug> "Вопрос для консилиума"
```

Output: `docs/seanses/<topic-slug>.md` (or `docs/discussions/` per script).

## Protocol rules

- **≥20 replies** `[Роль]: …` in discussion body.
- Secretary does not vote; voices five roles per `docs/virtual-team/PROMPT_*.md`.
- Conflict: Teamlead + `ARCHITECTURE.md`.

## Does not replace

- GitHub Issue / task prompt / PR LGTM.

## Output

Path to saved seans; 3-bullet consensus summary for user.

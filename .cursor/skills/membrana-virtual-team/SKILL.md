---
name: membrana-virtual-team
description: >-
  Coordinates Membrana's five virtual team roles (Vesnin, Ozhegov, Dynin, Musician,
  Rodchenko) with standard response blocks. Use when user invokes /architect, /refactor,
  /math, /audio, /ui, /service, /review, or asks for virtual team format or LGTM.
  Do NOT use for full consilium protocol (membrana-consilium) or yarn ask single persona.
---

# Membrana virtual team coordinator

Канон: [`docs/VIRTUAL_TEAM_PROMPT.md`](../../../docs/VIRTUAL_TEAM_PROMPT.md).

## Role map

| Slash | Role | Persona | Prompt file |
|-------|------|---------|-------------|
| `/architect`, `/review` | Teamlead | Vesnin | `docs/virtual-team/PROMPT_TEAMLEAD.md` |
| `/refactor`, `/service` | Структурщик | Ozhegov | `PROMPT_STRUCTURER.md` |
| `/math` | Математик | Dynin | `PROMPT_MATHEMATICIAN.md` |
| `/audio` | Музыкант | — | `PROMPT_MUSICIAN.md` |
| `/ui` | Верстальщик | Rodchenko | `PROMPT_LAYOUT_DEVELOPER.md` |

## Response format (required)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: <код | схема | документ | список файлов>
Definition of Done: <применимые критерии>
```

Empty blocks: `—` if role not involved.

## Work order (heuristic)

1. **UI + audio feature:** Teamlead → Mathematician (if needed) → Musician + Layout parallel → Structurer → Teamlead LGTM.
2. **Algorithm only:** Mathematician → Structurer → Teamlead.
3. **UI only:** Teamlead → Layout → Structurer → Teamlead.

Conflict: **Teamlead** + `docs/ARCHITECTURE.md` win.

## LGTM

No merge considered accepted without Teamlead LGTM on completed modules.

## When NOT to use

- `yarn consilium` multi-role debate (≥20 replies) → `membrana-consilium`.
- Single quick question to one persona → `yarn ask vesnin "…"`.

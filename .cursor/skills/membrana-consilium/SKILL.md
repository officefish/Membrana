---
name: membrana-consilium
description: >-
  Runs Membrana virtual team consilium via yarn consilium with protocol saved to docs/seanses.
  Use for multi-role architectural or product disputes needing ≥20 role replies and a
  written consensus. Do NOT use for single-persona yarn ask or routine code review.
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

## Agenda drift (lesson 2026-07-11)

`yarn consilium` on a familiar domain tends to drift into the usual narrative and NOT
address the brief's specific points. Prevention: **number the contentious points** and in
the question explicitly demand an echo of each point with a verdict. If a run leaves points
uncovered — do not pass the protocol off as the answer; re-run with a tighter brief, OR (if
the topic is below the gate) record via `membrana-adr` instead of a full consilium. Precedent:
loop-switch (#355) — consilium drifted twice, 3 topics moved to an ADR (#356).

> **Эта профилактика исполнена 17.07 и не удержала.** Повестку пронумеровали 1–10 —
> консилиум всё равно уронил центральный вопрос (слово `ADR` в протоколе встречается один
> раз, в вопросе самого агента; 25 реплик его не заметили). Значит дело не в памяти агента:
> нумерация лечит забывчивость, а не расхождение. Эскалация — **заседание**: один вопрос
> на прогон, ронять нечего. См. [`membrana-meeting`](../membrana-meeting/SKILL.md) ·
> [`docs/MEETING_REGULATION.md`](../../../docs/MEETING_REGULATION.md).
> Многовопросная повестка законна здесь, но не под `--meeting` (S-M1).

## Output

Path to saved seans; 3-bullet consensus summary for user.

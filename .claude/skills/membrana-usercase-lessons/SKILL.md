---
name: membrana-usercase-lessons
description: >-
  UserCase lessons journal: read docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md
  BEFORE building/forking/packing any device-board UserCase scenario; log every live-Run
  finding as an L-entry (симптом→корень→фикс→профилактика) DURING debug, not after. Use
  when building a scenario, debugging a Run that «не заработал», running the live-Run
  checklist before owner sign-off, or when user says журнал ошибок, L-запись, недочёты
  сценария. Do NOT use for log parsing mechanics (membrana-client-logs-parsing) or PR
  review (membrana-code-review).
---

# Mirror — usercase lessons journal

**Canonical:** [`.cursor/skills/membrana-usercase-lessons/SKILL.md`](../../.cursor/skills/membrana-usercase-lessons/SKILL.md)

Run that playbook verbatim. Кратко:

1. **Перед сборкой сценария** — журнал целиком; чекбоксы профилактики релевантных L
   (collapse L1–L12 · async/pack L18–L23 · basn L24–L28); сослаться на учтённые L в CONCEPT/PR.
2. **Во время отладки** — находка = СРАЗУ L-запись (симптом с runId → корень → Fix #PR →
   профилактика); фикс по регламенту (семантика рантайма → консилиум-гейт).
3. **Перед sign-off владельца** — чеклист live Run из журнала.

Журнал append-only; каждая находка живого Run обязана стать L-записью.

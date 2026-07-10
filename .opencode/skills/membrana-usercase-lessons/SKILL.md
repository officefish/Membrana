---
name: membrana-usercase-lessons
description: "UserCase lessons journal workflow: read docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md BEFORE building/forking/packing any device-board UserCase scenario; log every live-Run finding as an L-entry (симптом→корень→фикс→профилактика) DURING debug. Use when building a scenario, debugging a Run that failed, running the live-Run checklist before owner sign-off, or when user says журнал ошибок, L-запись, недочёты сценария. Do NOT use for log parsing mechanics (membrana-client-logs-parsing) or PR review (membrana-code-review)."
---

# Membrana usercase lessons (operator)

Канон: [`.cursor/skills/membrana-usercase-lessons/SKILL.md`](../../../.cursor/skills/membrana-usercase-lessons/SKILL.md) · журнал: [`docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md`](../../../docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md).

**Владелец:** **Teamlead** — гейт чтения журнала; L-записи пишет нашедший.

## Operator workflow

1. Перед сборкой/fork/pack сценария: прочитать журнал (L1–L28+), пройти чекбоксы
   профилактики релевантных секций (collapse / async-pack / basn).
2. Отладка живого Run: находка → сразу L-запись (симптом с runId из `yarn logs:parse`
   → корень → Fix #PR → профилактика). Фикс — по регламенту задач.
3. Перед sign-off владельца: чеклист live Run из журнала.

## Инварианты

- Журнал append-only; L-записи не переписываются.
- Каждая находка живого Run = L-запись, даже с тривиальным фиксом.

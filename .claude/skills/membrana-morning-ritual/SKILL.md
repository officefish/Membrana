---
name: membrana-morning-ritual
status: live
description: >-
  Runs the Membrana MORNING ritual — owner-gated scenario: pre-ritual order (branch=main,
  read yesterday's feedback + owner forks first), chain with Angelina freshness guard,
  two owner gates (magistral owner-choice from top-3, swallow-send with explicit «ок»),
  ban on script-chosen magistral. Use when user says утро, утренний ритуал, ritual:day,
  standup, main-day-issue, стендап, план дня. Do NOT use for evening/day rhythm
  (membrana-developer-rhythm) or task closure (membrana-task-lifecycle).
---

# Mirror — morning ritual

**Canonical:** [`.cursor/skills/membrana-morning-ritual/SKILL.md`](../../../.cursor/skills/membrana-morning-ritual/SKILL.md)

Run that playbook verbatim. Key invariants:

- Ветка утра = main; грязное дерево → эскалация, не молчаливое продолжение.
- ДО запуска: вчерашний team-evening-feedback + открытые развилки владельца.
- Два гейта: **magistral** (owner-choice из топ-3, не скрипт) · **swallow-send**
  (черновик через линзу → явное «ок» → отправка). `canSend = оба предиката`.
- Ангелина — страж каскада; блок → цепочка стоит громко.
- Скилл недоступен → СТОП; developer-rhythm утро НЕ замещает.

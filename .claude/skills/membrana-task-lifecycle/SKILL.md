---
name: membrana-task-lifecycle
description: >-
  Membrana sprint/task lifecycle: START (registry active + task-промпт до кода,
  консилиум-гейт для архитектурных) → work → yarn task:archive → task:close-github.
  Use when STARTING a new sprint/M/L task ("новый спринт", "заведи задачу", "идём в
  задачу N", регистрация в registry.json) or closing one (task:archive,
  TASK_CLOSURE_REGULATION, day-sprint/epic phase). Do NOT use for daily standup rhythm
  (membrana-developer-rhythm).
---

# Mirror — task lifecycle

**Canonical:** [`.cursor/skills/membrana-task-lifecycle/SKILL.md`](../../.cursor/skills/membrana-task-lifecycle/SKILL.md)

Run that playbook verbatim.

## Старт спринта (краткий чеклист до первой строчки кода)

1. **Консилиум-гейт**: архитектурная развилка (новые контракты core, новый пакет,
   новые узлы палитры, L-эпик, спор границ слоёв) → `yarn consilium --save-as <slug>`
   с протоколом ≥20 реплик ДО кода (см. `membrana-consilium`). Исполнение по готовому
   канону → достаточно inline-обсуждения ролей.
2. M/L → запись в `docs/tasks/registry.json` (status active) + task-промпт
   `docs/prompts/<SLUG>_PROMPT.md` (шаблон TASK_PROMPT_TEMPLATE) + GitHub Issue.
3. Ветка от свежего main; S-правка docs/tooling — без промпта, через `pr:ship`.

Полный регламент: [`docs/prompts/TASK_PROMPT_WORKFLOW.md`](../../docs/prompts/TASK_PROMPT_WORKFLOW.md).

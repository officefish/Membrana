---
name: membrana-deep-research
description: >-
  Deep research по теме спринта через Perplexity: три запроса (Landscape / Fit / Risk),
  выжимка в docs/tasks/research/<id>.md. Use when starting a sprint with an EXTERNAL
  unknown (чужие подходы, форматы, лицензии, практики 2025-2026), when user says
  «сделай ресёрч», «что снаружи по теме», «deep research», или при `yarn task:register
  --research`. Do NOT use when ответ есть внутри репозитория (канон, код, история PR) —
  тогда это три сожжённых рана; не для инсайтов (`yarn insight research <id>`) и не
  вместо консилиума (membrana-consilium) — ресёрч это ВХОД для решения, а не решение.
---

# membrana-deep-research

Canonical playbook: [`.cursor/skills/membrana-deep-research/SKILL.md`](../../../.cursor/skills/membrana-deep-research/SKILL.md)

Run that playbook verbatim.

## Кратко

```bash
yarn task:register --id <slug> … --research   # заготовка секции «Вопросы для research»
yarn research <task-id> --dry-run             # что уйдёт в Perplexity
yarn research <task-id>                       # 3 запроса → docs/tasks/research/<id>.md
```

**Вопросы формулирует агент из контекста спринта**, владелец подтверждает. Плейсхолдеры
`<…>` и оборванные вопросы валят прогон **до** траты рана (#402).

**Не звать**, если ответ есть внутри репозитория — это три сожжённых рана.
**Выжимка — вход для решения, а не решение**: проверяй по нашему коду.

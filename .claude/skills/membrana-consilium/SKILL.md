---
name: membrana-consilium
description: >-
  Runs Membrana virtual team consilium via yarn consilium with protocol saved to
  docs/seanses (≥20 role replies + written consensus). Use for architectural or product
  disputes BEFORE code: new core contracts, new package, new palette nodes, L-epic,
  layer-boundary disputes — or when user says консилиум, архитектурный спор. Do NOT use
  for single-persona yarn ask or routine code review (membrana-code-review).
---

# Mirror — consilium

**Canonical:** [`.cursor/skills/membrana-consilium/SKILL.md`](../../.cursor/skills/membrana-consilium/SKILL.md)

## Run

```bash
yarn consilium --save-as <topic-slug> "Вопрос + явные спорные точки (пронумерованные)"
```

Output: `docs/seanses/<topic-slug>-<date>.md` — коммитится вместе с поправками промпта.

## Гейт (когда ОБЯЗАТЕЛЕН — до первой строчки кода)

- Новые контракты `@membrana/core` (типы/сокеты/node kinds), новый пакет, новые узлы
  палитры device-board, L-эпик, спор value-vs-ref / границ слоёв.
- Исполнение по уже готовому канону — консилиум НЕ нужен, хватает inline-ролей.
- Прецедент: эпик #323 — консилиум ИЗМЕНИЛ черновые контракты (fusion ref→value,
  proximity host→core-лемма, отчёт async→sync) — inline-роли этого не поймали бы.

## Protocol rules

≥20 реплик `[Роль]: …`; секретарь не голосует; конфликт решает Teamlead + ARCHITECTURE.md.
Не заменяет Issue / task-промпт / PR LGTM. Итог: путь к протоколу + 3 буллета консенсуса.

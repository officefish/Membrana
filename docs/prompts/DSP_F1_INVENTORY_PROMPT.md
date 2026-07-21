# Промпт: F1 — инвентарь поверхности day-sprint

> **M** · `dsp-f1-inventory` · [#850](https://github.com/officefish/Membrana/issues/850) · lead **ozhegov** · parent `day-sprint-procedure`

## Промпт целиком

Структурщик: собрать таблицу входа для MANIFEST и regulation:

| Группа | Что снять |
|--------|-----------|
| Canon | TASK_PROMPT_WORKFLOW, TASK_CLOSURE, skill task-lifecycle, ACTIVE/LOG |
| Engines | `yarn task:*` / скрипты — кандидаты в `engines[]` |
| Precedents | 3–7 закрытых day-sprint с CLOSURE (пути) |
| Gaps | нет DAY_SPRINT_REGULATION; нет open/close yarn; иное |

Артефакт: `docs/day-sprint/day-sprint-procedure-2026-07-21/INVENTORY.md` (или
`docs/procedures/` analysis — **не** код). Рекомендация F3: regulation vs README-only.

**DoD:** инвентарь закоммичен; список `engines[]` / `precedents[]` черновик; вход F2.

---

## Статус (2026-07-21)

- [x] [`INVENTORY.md`](../day-sprint/day-sprint-procedure-2026-07-21/INVENTORY.md)
- [x] черновик engines/precedents + рекомендация F3 = regulation
- [ ] Archive после ship

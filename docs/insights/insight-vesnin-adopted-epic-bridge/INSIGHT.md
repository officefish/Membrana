# INSIGHT: Мост adopted insight → week epic (LGTM gate)

| Поле | Значение |
|------|----------|
| **ID** | `insight-vesnin-adopted-epic-bridge` |
| **Статус** | adopted |
| **Источник** | virtual-team-vesnin |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение (Vesnin)

После регистрации процесса инсайтов накопилось **8+ adopted** идеей с weight ≥ 6, но нет **канонического моста** в исполняемый эпик: `plan:week` видит registry, `MAIN_DAY_ISSUE` — нет. Teamlead вручную выбирает фокус; риск — высоковесные инсайты (scenario builder 7.8, server forwarding 7.8) «висят» кварталами без stage-gate.

## Гипотеза

**Adopted Epic Bridge** — еженедельный ритуал (после `plan:week`, не в `ritual:day`):

1. Top-N adopted insights по weight (N=3).
2. Teamlead помечает **один** `epic-candidate` на неделю (остальные `watch`).
3. Артеfact: строка в `STRATEGIC_PLAN_WEEK.md` + optional `yarn task:register` **только после LGTM**.
4. Связка с Sunrise sprint lottery: flash-proposal ≠ epic-candidate без Vesnin.

## Scope

- In: regulation § bridge, `plan:week` hook, шаблон epic-candidate в OPEN.md
- Out: auto-create tasks, auto-merge

## Связи

- `INSIGHT_REGULATION.md`, `insight-sunrise-flash`, user adopted insights
- `docs/tasks/registry.json`, `TASK_PROMPT_WORKFLOW.md`

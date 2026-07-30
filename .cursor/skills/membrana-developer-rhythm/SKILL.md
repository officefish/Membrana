---
name: membrana-developer-rhythm
status: live
description: >-
  Membrana day rhythm and read order before coding M/L work. For the MORNING ritual
  (утро, ritual:day, standup, main-day-issue) use membrana-morning-ritual. For the
  EVENING ritual (вечер, ritual:evening, закрыть день) use membrana-evening-ritual.
  Morning and evening are NOT covered here.
---

# Membrana developer rhythm (день)

Канон: [`docs/DEVELOPER_RHYTHM.md`](../../../docs/DEVELOPER_RHYTHM.md).

<!-- pin:START morning-wiring-rhythm -->
> **Утро вычеркнуто из этого скилла** (вердикт заседания `angelina-hostess` M1, 21.07,
> ратифицирован владельцем: скилл был «слишком абстрактным» — корень №4 прецедента
> холодной сессии). **Утро → [`membrana-morning-ritual`](../membrana-morning-ritual/SKILL.md)**
> — единственный источник истины по утреннему сценарию. Если тот скилл недоступен —
> **СТОП с явной ошибкой**; этот скилл утро НЕ замещает (мёртвая дверь запрещена).
<!-- pin:END morning-wiring-rhythm -->

## When to use

- Ритм дня и порядок чтения перед M/L-кодом.

## When NOT to use

- **Утро** → `membrana-morning-ritual` (жёсткая граница, см. выше).
- **Вечер** → `membrana-evening-ritual` (отдельная дверь #1475; недоступен → STOP).
- Closing a task in registry → `membrana-task-lifecycle`.
- `night:open` / Night Build → `membrana-night-sprint`.

## Read order before coding (M/L)

1. [`docs/MAIN_DAY_ISSUE.md`](../../../docs/MAIN_DAY_ISSUE.md) — **канон дня**
2. Task prompt from [`docs/tasks/registry.json`](../../../docs/tasks/registry.json)
3. GitHub Issue (triage)
4. [`docs/CURRENT_TASK.md`](../../../docs/CURRENT_TASK.md) — **только буфер**; при конфликте проигрывает п.1–3

## Evening

Вечер вычеркнут из этого скилла по #1475. Единственный вход:
[`membrana-evening-ritual`](../membrana-evening-ritual/SKILL.md). Если он
недоступен — **СТОП с явной ошибкой**; не запускать вечер через эту проходную.

## Output format

Summarize: which docs to read next and current `MAIN_DAY_ISSUE` focus if present.

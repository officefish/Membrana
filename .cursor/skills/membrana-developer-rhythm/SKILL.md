---
name: membrana-developer-rhythm
status: live
description: >-
  Membrana day rhythm and EVENING ritual (archive:daily-day, code-review, team-evening-
  feedback, ritual:evening) plus the read order before coding M/L work. Use when the user
  says вечер, вечерний ритуал, ritual:evening, code-review вечером, or asks what to run
  next in the day rhythm. For the MORNING ritual (утро, ritual:day, standup,
  main-day-issue) use membrana-morning-ritual — morning is NOT covered here.
---

# Membrana developer rhythm (день и вечер)

Канон: [`docs/DEVELOPER_RHYTHM.md`](../../../docs/DEVELOPER_RHYTHM.md).

<!-- pin:START morning-wiring-rhythm -->
> **Утро вычеркнуто из этого скилла** (вердикт заседания `angelina-hostess` M1, 21.07,
> ратифицирован владельцем: скилл был «слишком абстрактным» — корень №4 прецедента
> холодной сессии). **Утро → [`membrana-morning-ritual`](../membrana-morning-ritual/SKILL.md)**
> — единственный источник истины по утреннему сценарию. Если тот скилл недоступен —
> **СТОП с явной ошибкой**; этот скилл утро НЕ замещает (мёртвая дверь запрещена).
<!-- pin:END morning-wiring-rhythm -->

## When to use

- Вечерний ритуал, ритм дня, порядок чтения перед M/L-кодом.

## When NOT to use

- **Утро** → `membrana-morning-ritual` (жёсткая граница, см. выше).
- Closing a task in registry → `membrana-task-lifecycle`.
- `night:open` / Night Build → `membrana-night-sprint`.

## Read order before coding (M/L)

1. [`docs/MAIN_DAY_ISSUE.md`](../../../docs/MAIN_DAY_ISSUE.md) — **канон дня**
2. Task prompt from [`docs/tasks/registry.json`](../../../docs/tasks/registry.json)
3. GitHub Issue (triage)
4. [`docs/CURRENT_TASK.md`](../../../docs/CURRENT_TASK.md) — **только буфер**; при конфликте проигрывает п.1–3

## Evening (`yarn ritual:evening`)

**Гнать через манифест** `docs/tasks/evening-ritual-steps.json`, не по памяти. Порядок
важен — архив утренних файлов **до** code-review:

1. `yarn archive:daily-day` → `docs/archive/daily-day/<YYYY-MM-DD>/`
2. `yarn rag:index:incremental` (non-blocking)
3. `yarn code-review` → `docs/DAILY_CODE_REVIEW.md`
4. `yarn task:archive <id>` (per accepted tasks)
5. `yarn save-code-review`
6. `yarn task:close-github` → `yarn team-evening-feedback` (обязателен, даже при упавшем review)
7. `yarn audit:evening` → `docs/DAILY_AUDIT.md` (Док 2 вечерней тройки)
8. **Доклад партнёрам — только руками**: черновик через линзу Ожегова (структура —
   зеркало утреннего плана, слова чищены) + чек живых ссылок → **явное «ок» владельца** →
   `yarn telegram:swallow`. Спец-ласточка НЕ заменяет вечерний отчёт; пропуск — только
   громко. Авто-`telegram:digest` как источник текста запрещён.
9. `yarn persona-memory:extract --all` — строго **ПОСЛЕ** показа партнёрам.

Team feedback: `membrana-team-evening-feedback` → `docs/seanses/team-evening-feedback-<date>.md`

## Output format

Summarize: which commands ran, which docs to read next, and current `MAIN_DAY_ISSUE`
focus if present.

# Прецедент 2026-07-25: Карта мастерской задач и её инструментов

<!-- precedent-meta
{
  "id": "2026-07-25-tasks-workshop-map-lookup",
  "date": "2026-07-25",
  "class": "session-report",
  "symptom": "Владелец спросил найти мастерскую задач и инструменты — агент собрал карту дома, глаголов и соседних контуров",
  "rootCause": "Дом docs/tasks имеет primary-workshop с манифестом и границей V2; знание размазано по OPEN, EPIC, manifest и yarn",
  "fix": "Зафиксирован session-report: адрес мастерской, 5 verbs, вне-границы, контракты V4-V9",
  "canonicalCause": "Дом docs/tasks имеет primary-workshop с манифестом и границей V2; знание размазано по OPEN, EPIC, manifest и yarn",
  "prevention": "Холодный старт: docs/tasks/WORKSHOP.md или yarn task:tools (скилл membrana-tasks-workshop); не путать primary verbs с audit/decompose соседнего контура docs/audit/tasks",
  "actionItems": [],
  "related": []
}
-->

<!-- Тип: прецедент-доклад (session-report). Автор: Cursor Grok 4.5. -->
<!-- Повод: владелец — «найди мастерскую задач и ее инструменты» → «сохрани свой поиск как прецедент». -->

## Что случилось

Владелец попросил найти **мастерскую задач** и её инструменты. Агент собрал карту из живых артефактов репо (без исполнения глаголов). По слову владельца этот поиск сохранён как прецедент класса `session-report`.

## Адрес

| Что | Путь |
|-----|------|
| Манифест (primary) | `docs/tasks/workshop.manifest.json` |
| Дом / реестр | `docs/tasks/` · `registry.json` |
| Вердикты заседания | `docs/meeting/tasks-workshop/EPIC.md` |
| Спринт OPEN | `docs/day-sprint/tasks-workshop-2026-07/OPEN.md` |
| Промпт спринта | `docs/prompts/TASKS_WORKSHOP_SPRINT_PROMPT.md` |
| Focus дня (на момент поиска) | `docs/DAY_SPRINT_ACTIVE.md` → `tasks-workshop-2026-07` |
| Linear | Project Tasks workshop · 2026-07 · контейнер DRU-403 |

Фазы спринта **g0…v9 закрыты** (OPEN: v9 PR #1153 → `6aec3c1b`).

## Глаголы мастерской (V2 wins)

В манифесте / вердикте M2 — пять decision-verbs:

| Глагол | Команда |
|--------|---------|
| `inspectElement` | `yarn task:inspect` |
| `list` | `yarn task:list` |
| `board` | `yarn task:board` (в манифесте ещё `planned`) |
| `bookkeeping` | `yarn tasks:bookkeeping` (манифест: `planned: yarn task:bookkeeping`) |
| `reviewing` | `yarn tasks:reviewing` (манифест: `planned: yarn task:reviewing`) |

`audit` и `decompose` в манифесте = `null` (вне primary-мастерской).

## Вне мастерской

- **Писатели / sync / start:** `task:register`, `task:archive`, `task:close-github`, `task:sync-readme`, `tasks:sync-issues`, `task:start`.
- **Соседний контур** `docs/audit/tasks`: `yarn tasks:audit`, `yarn tasks:decompose` (оси `--by`: category, size, age, lead, kind, links).

## Контракты спринта (ещё инструменты)

| Фаза | Команда / артефакт |
|------|---------------------|
| V4 inspect | `yarn task:inspect` · `docs/tasks/INSPECT_ELEMENT.md` |
| V5 validity | `yarn task:validate` |
| V6 invariants | `yarn task:invariants` / `task:invariants:repair` · `docs/tasks/SYNC_INVARIANTS.md` |
| V8 rank | `yarn one-shot:rank` · `docs/tasks/ONE_SHOT_RANK.md` |
| V9 trail | `yarn one-shot:trail` · `docs/audit/one-shot-trail.jsonl` |

## Как искали (хронология)

1. Grep / glob по `tasks-workshop`, «мастерская».
2. Прочитаны OPEN спринта, `TASKS_WORKSHOP_SPRINT_PROMPT`, `EPIC.md` заседания.
3. Сверены `package.json` (yarn task*/tasks*/one-shot*) и `docs/tasks/workshop.manifest.json`.
4. Доки контрактов: `INSPECT_ELEMENT.md`, `SYNC_INVARIANTS.md`, `ONE_SHOT_RANK.md`.
5. По слову владельца — `yarn precedent:register --new … --class session-report` + заполнение прозы.

## Корень (почему карта не в одном месте)

Мастерская — не одна команда и не один README-раздел: адрес в манифесте HOME_WORKSHOP, граница глаголов — в вердикте V2/g0, контракты — в фазовых доках спринта, соседний audit-контур — отдельно. Без манифеста легко смешать primary verbs с `tasks:audit` / `tasks:decompose`.

## Фикс

Этот session-report: единая карта на дату 2026-07-25. Реестр снимка — `docs/precedents/registry/PRECEDENTS.md` (пересобран `precedent:register`).

## Профилактика

- Холодный старт: `docs/tasks/WORKSHOP.md` или `yarn task:tools` (скилл `membrana-tasks-workshop`).
- Не тащить `audit`/`decompose` в primary verbs — V2 wins (g0, 23.07); пара живёт в `docs/audit/tasks`.
- Каталог инструментов — `docs/tasks/workshop.catalog.json`; кит поставки — `kits/tasks-master`.

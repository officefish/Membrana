---
name: membrana-tasks-workshop
description: >-
  Inventory primary tasks workshop tools: yarn task:tools table, read per-tool
  docs, kits/tasks-master. Use when user says мастерская задач, tasks-workshop,
  task:tools, какие инструменты у задач, inventory registry tools, or asks for
  the tasks workshop map. Do NOT use for tasks:audit/decompose (neighbor
  docs/audit/tasks — membrana-tasks-audit / membrana-tasks-decompose), writers
  (task:register/archive/start), or task lifecycle closure.
---

# Tasks workshop inventory

Канон: [`docs/tasks/WORKSHOP.md`](../../../docs/tasks/WORKSHOP.md) ·
каталог [`workshop.catalog.json`](../../../docs/tasks/workshop.catalog.json) ·
манифест [`workshop.manifest.json`](../../../docs/tasks/workshop.manifest.json) ·
кит [`kits/tasks-master`](../../../kits/tasks-master/).

## When to use

- «Мастерская задач», tasks-workshop, `yarn task:tools`.
- «Какие инструменты у реестра / docs/tasks».
- Нужна таблица verbs + контрактов + путь к инструкции.

## When NOT to use

- Ревизия устаревших карточек → `membrana-tasks-audit` (`yarn tasks:audit`).
- Раскладка по осям → `membrana-tasks-decompose`.
- Закрытие/старт задачи → `membrana-task-lifecycle`.
- Писатели/sync (`register`, `archive`, `close-github`, `sync-readme`) — вне мастерской (V2).

## Playbook

1. `yarn task:tools` — показать таблицу (zone · tool · yarn · doc · summary).
2. По запросу к одному инструменту: `yarn task:tools --doc <id>` или Read пути из колонки `doc`.
3. Фильтр: `yarn task:tools --zone workshop|contract|neighbor`.
4. Не чинить реестр и не запускать writers из этого скилла.
5. На audit/decompose — указать neighbor `docs/audit/tasks` и скиллы audit/decompose.

## Agent rules

- Источник истины — catalog + `yarn task:tools`, не самописный grep по репо.
- `board` / `bookkeeping` / `reviewing` могут быть в таблице с ⚠ «движок отсутствует» — не выдумывать файлы.
- Граница V2: primary decision-verbs ≠ audit-family neighbor.

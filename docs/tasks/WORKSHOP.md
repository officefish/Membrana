# Мастерская задач (primary)

Дом: [`docs/tasks/`](./) · реестр [`registry.json`](./registry.json).  
Манифест: [`workshop.manifest.json`](./workshop.manifest.json) · каталог [`workshop.catalog.json`](./workshop.catalog.json).  
Кит поставки: [`kits/tasks-master`](../../kits/tasks-master/) · вердикты [`EPIC`](../meeting/tasks-workshop/EPIC.md).

## Холодный старт

```bash
yarn task:tools              # таблица инструментов
yarn task:tools --json
yarn task:tools --zone workshop
yarn task:tools --doc inspect
```

Агент: скилл `membrana-tasks-workshop` (канон `.cursor/skills/membrana-tasks-workshop/`).

## Граница (V2 wins)

| В мастерской (decision-verbs) | Вне |
|-------------------------------|-----|
| `inspectElement`, `list`, `board`, `bookkeeping`, `reviewing` | Писатели: `task:register` / `archive` / `close-github` / `start` |
| Контракты спринта: `validate`, `invariants`, `one-shot:*` | Sync: `task:sync-readme`, `tasks:sync-issues` |
| | `audit` / `decompose` → [`docs/audit/tasks`](../audit/tasks/) |

Полный перечень с путями инструкций — `yarn task:tools` (источник: catalog).

## Контракты (фазовые доки)

| id | Документ |
|----|----------|
| inspect | [`INSPECT_ELEMENT.md`](./INSPECT_ELEMENT.md) |
| validate | [`VALIDITY.md`](./VALIDITY.md) |
| invariants | [`SYNC_INVARIANTS.md`](./SYNC_INVARIANTS.md) |
| one-shot-rank | [`ONE_SHOT_RANK.md`](./ONE_SHOT_RANK.md) |
| one-shot-trail | [`ONE_SHOT_TRAIL.md`](./ONE_SHOT_TRAIL.md) |

## README и sync

Описание мастерской живёт **здесь** и в catalog/manifest, не в длинной hand-секции
[`README.md`](./README.md): `yarn task:sync-readme` переписывает README целиком.
В шапке README — только указатель на этот файл.

Карантин синка снят (#1201): README реестра собирается движком стратегических
документов из шаблона `tasks-readme`
([`templates/tasks-readme`](../containers/strategic-docs/templates/tasks-readme/template.json)).
Ручная правка README запрещена — постоянный текст добавляют **гранулой** шаблона
([`granules/tasks-readme-header`](../containers/strategic-docs/granules/tasks-readme-header/body.md)),
набор задач приходит из `registry.json`. Переменной `TASKS_README_SYNC_FORCE` больше нет:
если шаблон не сходится с гранулами, сборка уходит в `experiment` и файл не пишется.

# Промпт: Ленивое закрытие журнала получает явную область (#1705)

> **Task-промпт** карточки `lazy-close-scope`. Размер: **S**. Артефакт: **1 PR**.
> Реестр: `id` = `lazy-close-scope` в [`docs/tasks/registry.json`](../tasks/registry.json).
>
> **Статус: исполнено спринтом в день постановки (06.08).** Файл — указатель, не вторая
> редакция контракта.

## Носители

| Что | Где |
|-----|-----|
| Нарезка и ратификация (13:42Z) | [`docs/sprint/cut/lazy-close-scope.json`](../sprint/cut/lazy-close-scope.json) |
| Прогон спринта | [`docs/local-sprint/lazy-close-scope/OPEN.md`](../local-sprint/lazy-close-scope/OPEN.md) |
| Канон области (закреплён этим же PR) | [`docs/procedure-runs/README.md`](../procedure-runs/README.md) → «Ленивое закрытие и его ОБЛАСТЬ» |
| Дефект-источник | [#1705](https://github.com/officefish/Membrana/issues/1705) |

## Существо

`openProcedureRun` получает обязательный `lazyCloseScope`: `procedure` (закрывать любые
незакрытые прогоны процедуры — ритуалы) или `run` (только сирот с тем же `runId` —
спринты). Умолчания нет: вызов без области бросает на месте. Потребители объявили
область явно; все вызовы мигрированы в этом же PR.

## Вне карточки

Межпроцедурная область (`across: [...]`) — замысел, не долг: случая в зубах нет.

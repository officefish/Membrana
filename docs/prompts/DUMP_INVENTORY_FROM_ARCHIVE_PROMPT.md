# Промпт: Опись дампа читается с диска — inventorySource `archive-contents` (#1814)

> **Task-промпт для агента-разработчика.** Размер: **M**. Lead: tarasov, support: dynin, ozhegov.
> Реестр: `id` = `dump-inventory-from-archive` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Процедура: `membrana-local-sprint`; прогон — `docs/local-sprint/dump-inventory-from-archive/`;
> план нарезки — `docs/sprint/cut/dump-inventory-from-archive.json` (там же — все решения резчика).

## Суть

Иссью [#1814](https://github.com/officefish/Membrana/issues/1814): `dbInventory` манифеста
дампа берётся разбором человекочитаемого stderr `mongodump` — формат не контракт. Полное
лечение — читать содержимое архива, то есть восстановить его; машинерия отката влита
(#1809, `c41637df`). Правило: конвейер «опись-из-артефакта» ОДИН на дрилл и дамп.

## Приёмка (дословно из иссью)

`manifest.inventorySource === 'archive-contents'`, и зуб сравнивает опись с фактическим
содержимым артефакта, а не с текстом лога.

## Нарезка

b1 — дом `scripts/lib/archive-inventory.mjs` (конвейер + адаптер, зубы на fake-адаптере) →
b2 — дрилл на приборы дома (поведение неизменно, три точки доказательства) →
b3 — дамп: манифест v2 (`archive-contents` + `protocolChecks`), опись read-back с закрытого
tmp до rename, стоп `DUMP_INVENTORY_UNAVAILABLE` без стенда, политика ветвится по
`schemaVersion` (v1-манифесты 09.08 вечно читаемы) →
b4 — живой прогон `yarn backup:dump` с вещдоком в `docs/audit/`.

## Out of scope

`packages/*`, `deploy/*` (стенды как есть), ядро `verifyRestore`, ротация/расписание.

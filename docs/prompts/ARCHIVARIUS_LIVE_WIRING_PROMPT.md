# Промпт: Archivarius — соединить контейнер с жизнью (спринт archivarius-live-wiring)

> **Task-промпт** фазы эпика `archivarius-sessions-container` (#1330-продолжение).
> Размер: **M** · sprintKind: `membrana-local-sprint` · Реестр: `id` = `archivarius-live-wiring`.
> **Исполняемый источник истины — нарезка:** [`docs/sprint/cut/archivarius-live-wiring.json`](../sprint/cut/archivarius-live-wiring.json)
> (ратифицирована владельцем 04.08, дайджест `98b6ce8c…`). Этот файл — обёртка-указатель, не вторая редакция.

## Контекст

Карта обзора 04.08 (разведчик, факты с файл:строка): контейнер построен 27.07 (#1335,
#1357, доведён #1407) — дом `docs/archivarius/` с контрактом span, CLI с резаком в
ingest-пути, office-модуль с 6 маршрутами, Mongo в compose. Не хватает соединения с
жизнью: 0 вызовов `POST /v1/archivarius/ingest` по репо, ~1500 сессий без дома,
`service` вычитывает `listSpans()` целиком в память, `search` по HTTP отдаёт до 500
полных транскриптов, `generate-office-env.sh` не пишет `ARCHIVARIUS_*`, тракта
scan→extract→ingest нет (карточка `archivarius-evening-tract` активна).

## Блоки (детали и границы — в нарезке)

1. `mongo-native-queries` (Дынин) — Mongo-запросы по готовым индексам; search: мета+курсор.
2. `cli-office-client-and-tract` (Веснин) — клиент CLI→office + тракт одной цепочкой; заливка ~1500 сессий.
3. `mongo-store-teeth` (Ожегов) — контрактные unit-зубы store, без живой Mongo.
4. `prod-env-smoke` (Ожегов) — env-генератор пишет `ARCHIVARIUS_*`, smoke-шаг; прод-выкладка — owner-gate.

Sync-point резчика: контракт `search(meta+cursor)` фиксируется до первого прогона тракта.

## DoD / Out of scope

См. `//dod` и `//out-of-scope` нарезки — не дублируется (две копии делают норму непроверяемой).

## Закрытие

`sprint:gate` по следам `docs/sprint/trail/archivarius-live-wiring.jsonl` (пары
context_run + review_pass на блок) → закрытие прогона в журнале → `yarn task:archive
archivarius-live-wiring` с вещдоками; карточка `archivarius-evening-tract` закрывается
вещдоком тракта.

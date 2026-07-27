# Промпт: Контейнер сессий Archivarius

> **Task-промпт для агента-разработчика**.
> Реестр: `id` = `archivarius-sessions-container` в [`docs/tasks/registry.json`](../tasks/registry.json).

## Контекст

Контейнер сессий — Archivarius: база данных office-стека хранит сессии, репозиторий держит контракт,
мастерскую и проверяемые снимки. Эпик #1229 задаёт норму: база — источник, репо — нотариус.

**GitHub Issue:** [#1330](https://github.com/officefish/Membrana/issues/1330)

## Промпт целиком

Построить первый срез Archivarius:

- дом в репозитории `docs/archivarius/`: `README.md`, `workshop.manifest.json`;
- office stack получает MongoDB в `docker-compose.yml` и конфиг без prod deploy;
- несущий контракт адресуемого отрезка: `{sessionId, uuid, ts}`;
- акт изъятия: `GET span -> {bytes, sha256}`;
- evidence bridge: `yarn evidence add --store archivarius --ref span://<sessionId>/<uuid>`;
- мастерская: `audit`, `decompose`, `inspectElement`, `search`;
- ingest локальных `~/.claude/projects/...jsonl` батчем;
- секреты: до вехи `secret-parser-built` полные строки с находками не пишутся, ingest маскирует строки и сохраняет `maskedLines`.

## Definition of Done

- [ ] `docs/archivarius/workshop.manifest.json` валиден и atlas пересобран.
- [ ] MongoDB добавлен в office-compose локально; prod deploy не выполняется.
- [ ] API/ядро возвращает span bytes + sha256 по `sessionId` и `uuid`.
- [ ] Ingest маскирует строки с секрет-находками и честно считает `maskedLines`.
- [ ] `audit/decompose/inspectElement/search` имеют CLI/ядро и тесты рядом с кодом.
- [ ] PR закрывает #1330.

## Out of Scope

- Кейсы/вещдоки соседнего блока.
- Починка формата транскриптов харнеса.
- Prod deploy VDS без слова владельца.

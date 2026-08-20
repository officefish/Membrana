# LIVE_SERVICES — инвентарь живых элементов контура

> **Обратная сторона зуба.** Каноны и манифесты проверяют, что *объявленное существует*.
> Этот файл — место, где проверяется обратное: *существующее объявлено*. Зверь
> «Немой носитель» ([`BESTIARY.md`](./bestiary/BESTIARY.md), B8, Issue #1221) ловит именно
> отсутствие записи здесь: холодная сессия физически не может учесть то, о чём в
> репозитории нет ни строки.
>
> **Дом объявления, а не проза.** Упоминание адреса в README объявлением не считается —
> детектор `undeclared` (`scripts/lib/lens-bestiary.mjs`) читает только структурные дома:
> `*MANIFEST.json`, `docs/procedures/registry.json` и этот файл.

## Правило записи

Строка вносится **только с вещдоком** — откуда известно, что элемент живой. Незнание
пишется словом «не подтверждено», а не пропуском: пустая клетка неотличима от «выяснили,
что никто». Удаление строк запрещено — умерший элемент помечается `⚰` с датой и причиной.

| Поле | Смысл |
|------|-------|
| Адрес | как элемент достигается (домен, путь, расписание) |
| Назначение | зачем существует |
| Что дёргает | какие наши части к нему обращаются |
| Держатель | кто отвечает за живость |
| Вещдок | откуда известно |

## Реестр

| Адрес | Назначение | Что дёргает | Держатель | Вещдок |
|-------|------------|-------------|-----------|--------|
| `procedures.mmbrn.tech` | оркестратор процедур (n8n): запускает шаги, вызывая методы серверного API офиса | не подтверждено — со стороны репозитория вызовов нет | не подтверждено | Issue [#1221](https://github.com/officefish/Membrana/issues/1221), вещдок 1: развёрнут и работает, в `docs/`, `scripts/` и пакетах — ни одного упоминания, кроме внешнего референса в исследовании инсайта `insight-procedures-orchestration-n8n`; известно **со слов владельца** 25–26.07 |
| `archivarius-mongo` (сервис compose-стека `background-office`, протокол Mongo, `mongo:7`; том `archivarius-mongo-data`) | контейнер сессий Archivarius: хранит спаны `{sessionId, uuid, ts}` — с 04.08 несёт ~106К записей | `packages/background-office/src/modules/archivarius/archivarius.mongo-store.ts` и `config/env.schema.ts` через `ARCHIVARIUS_MONGO_URI`; office объявляет его в `depends_on` | `background-office` (стек, в чьём compose сервис объявлен и чей healthcheck его сторожит) | `packages/background-office/docker-compose.yml:59` (образ, том, healthcheck `mongosh`), P1/B8 ревью PR [#1711](https://github.com/officefish/Membrana/pull/1711), долг [#1714](https://github.com/officefish/Membrana/issues/1714). **Вне этой записи:** бэкап тома `archivarius-mongo-data` и аутентификация Mongo — работа по compose и деплою, остаётся открытой в [#1714](https://github.com/officefish/Membrana/issues/1714) |
| `plugin-results` — коллекция Mongo в том же `archivarius-mongo` офиса (контейнер `membrana-office-archivarius-mongo-1`, БД `membrana_archivarius`; порт наружу не опубликован) | дом результатов серверных плагинов (M3/M3′, #1961): документы `RunRecord` с адресом из пяти полей, двумя отпечатками и `resumeMode`; уникальный индекс `{pluginId, version, collectionId, runId}` | пишет/читает `PluginResultsService` + `MongoPluginResultsStore` (`packages/background-office/src/modules/plugin-results/`, PR #1970) по `PLUGIN_RESULTS_MONGO_URI ?? ARCHIVARIUS_MONGO_URI`; скрипт `yarn plugin:run:mfcc --host collections --tunnel office` (`scripts/plugin-run-mfcc.mjs`) достигает контейнер SSH-туннелем через `_ssh-office-config.mjs` и пишет тем же кодом (dist офиса) — адрес контейнера и путь к dist объявлены константами скрипта | `background-office` (стек compose; хост плагинов `collections` в `background-media` результат в дом пока не несёт — мост #1961) | Первый живой документ 18.08: `docs/plugins/first-live-run-2026-08-18.md` (runId `01a0150f-95e6-718b-bfa7-4ba313511a10`), подтверждён `mongosh` в контейнере; PR #1975 |
| `office.mmbrn.tech/plugin-results/runs` (POST/GET, ключ класса `X-Membrana-Token`) — приёмник моста media → office | единственный HTTP-вход в дом результатов `plugin-results` (форма моста: `docs/plugins/results-bridge-form.md`, спринт `plugin-results-bridge`, #1961): принимает `RunRecord` (+`StateRecord`) по контрактам `plugin-contracts` и пишет тем же `PluginResultsService.writeRun`; GET — чтение обратно со `stale` по чтению | `PluginResultsController` (`packages/background-office/src/modules/plugin-results/`, PR #1981); отправитель — `PluginResultsBridgeService` в `background-media` (PR-B того же спринта) по `OFFICE_API_URL` + `OFFICE_API_TOKEN` (объявлены в `packages/background-media/src/config/env.schema.ts`, optional; без них исход `office-not-configured`) | `background-office` (приёмник) · `background-media` (отправитель, сид `onResult` хоста `collections`) | ЖИВОЙ: деплой 19.08 вечера (office → media, ствол faa83063 + #2008); первый RunRecord через HTTP-путь — runId `01a01ac2-…` 19.08 16:02Z, проба 20.08 — два RunRecord `01a01ede-…` с bridge sent и живой идемпотентностью; вещдоки `docs/plugins/results-bridge-live-run-2026-08-19.md` и `docs/plugins/mfcc-first-field-probe-2026-08-20.run.json` |

| `media.membrana.space` → устройство `field-node-2026-08`, коллекция «Полевые записи 2026-08» | приёмник полевых записей звука: узел отправляет WAV, сервис **сам меряет** длительность, частоту, каналы, формат и размер; человек объявляет только условия съёмки | `scripts/field-capture.mjs` (`yarn field:capture`) через `POST /v1/devices/:deviceId/collections/:collectionId/samples`; ключи `FIELD_NODE_DEVICE_ID`, `FIELD_NODE_COLLECTION_ID`, `VITE_MEDIA_SERVER_URL`, `VITE_MEDIA_API_TOKEN` объявлены в `.env.example` | `background-media` (сервис, чей `audio-ingest.service.ts` разбирает звук) | Живой прогон 16.08: устройство и коллекция созданы (201), запись снята с измерительного микрофона через звуковой интерфейс и принята сервисом — измерено 11.99 с · 44100 Гц · моно · wav, объявленное легло отдельным полем. Смежный долг: объявленное перебивает измеренное по трём полям — [#1950](https://github.com/officefish/Membrana/issues/1950). **Узел 18.08:** Firebat T6 пишет 48 кГц в заводском режиме карты (без Focusrite Control), две записи приняты (`62fe8ea1…`, `c4cfbf06…`); условия недели (усиление словом, 48V, расстояние) — в спутнике узла [`docs/field/firebat-node.md`](./field/firebat-node.md), не здесь (b6 спринта `firebat-node-device`, [#1998](https://github.com/officefish/Membrana/issues/1998)). **Вне этой записи:** служебный токен медиа-сервиса на полевом устройстве — риск при потере устройства; заменяется ключом узла по ADR-0027 (b2 того же спринта) |
| `media.membrana.space/v1/devices/:deviceId/node-key` (POST выдать · DELETE отозвать, под `X-Membrana-Token`) → заголовок узла **`X-Membrana-Node-Key`** на ручках узла `…/node/*` | ключ полевого узла (ADR-0027 Р3, b2 спринта `firebat-node-device`, [#1998](https://github.com/officefish/Membrana/issues/1998)): отзываемый секрет только на ручки узла своего устройства; служебный токен медиа-сервиса узлу больше не выдаётся; словарь заголовка ≠ `X-Membrana-Token` (внутренний API) | `FirebatNodeModule` (`packages/background-media/src/modules/firebat-node/`): `NodeKeyService` (таблица `NodeKey`, только sha256-хеш), `NodeKeyGuard` (вердикты `ok · missing · unknown · revoked · foreign_device`; чужое устройство — 403), `NodeKeyController`; поллер узла (b4) шлёт ключ этим заголовком | `background-media` | PR #2003 (код и 6 зубов); **живой провод не подтверждён** до b4/b7 — вещдоком станет `docs/field/firebat-node-acceptance-2026-08-19.md` |

## Не внесено (найдено грепом, ждёт вещдока)

Грепом по репозиторию видны ещё семнадцать адресов в двух зонах (`*.mmbrn.tech`,
`*.membrana.space`) — от кабинета и панели до документации и медиа. Они **намеренно не
внесены**: строка инвентаря без проверенного назначения и держателя — это «Проза» (B-зверь
#1204), то есть замена одного дефекта другим. Вносить по одному, с вещдоком: кто держит,
что дёргает, чем подтверждается живость.

Порядок разбора предлагается по частоте упоминаний в коде — начиная с `cabinet.membrana.space`,
`panel.mmbrn.tech`, `office.mmbrn.tech`.

## Что этот файл не покрывает

- **Дома данных процедур** (каталоги под `docs/`, которыми пользуется код, но которые не
  объявлены ни одним манифестом) — их обратный зуб закладывается в эпик рефакторинга
  контейнера процедур [#1220](https://github.com/officefish/Membrana/issues/1220), фаза Ф2.
  Живой пример на сегодня: `docs/bridge/` — дом комнаты живёт с 22.07, контейнер знает
  движки и держателя, про свой дом молчит (ловится линзой, см. B8).
- **Элементы вне репозитория и вне доменов** — расписания, внешние интеграции, ключи в
  чужих панелях. Файловой сверкой они не проверяются в принципе; способ их инвентаризации
  требует отдельного решения (пункт 5 объёма #1221).

# Первый живой прогон плагина — membrana.handler.mfcc

Документ прочитан из дома результатов (`plugin-results`, Mongo офиса) вызовом `readRuns` после записи;
не лог и не локальный вывод. Эпик #1961, приёмка Т3.11 (M6′). Коллекция «Полевые записи 2026-08» устройства `field-node-2026-08`.

| Поле | Значение |
|---|---|
| **runId** | `01a0150f-95e6-718b-bfa7-4ba313511a10` |
| address.pluginId | `membrana.handler.mfcc` |
| address.version | `0.1.0` |
| address.collectionId | `efbf9733-586a-4918-80fd-8fb8b4b9e364` |
| address.mountTarget | `background-media/collections` |
| fingerprints.inputHash | `39f6a30b27de32239dfc36f46d2f25fb985fed7b8cd2f3ba4ea1e6681cd6b31c` |
| fingerprints.configHash | `4b65be396451b097d4eb68fc5db106eccd631d24152943d2565b4063e19572c1` |
| resumeMode | `fresh` |
| kind · completedAt | `handler` · 2026-08-18T13:29:42.906Z |
| stale (по чтению) | false |
| StateRecord · ConvergenceRecord | отсутствуют — норма одиночного детерминированного прогона (M6′) |

Рабочая точка: ворота `mel40-c24-buf4096-sr48000`, строгость `normal`, minInBandRatio 0.5, minPassRate 0.6, minMagnitude 0, судимые коэффициенты [0, 1, 2, 3]. Пороги калибровки не менялись.

## Что измерено по пробам

| Проба | Гц | Кадров | Исход | passRate | судимых / немых | Причина отказа |
|---|---|---|---|---|---|---|
| ПРОБА ТРАКТА 16.08 — не полевая запись | 48000 | 35 | **detected** | 1 | 35 / 0 | — |
| Полевая запись 2026-08-16T14-56-54-667Z | 44100 | 0 | **refused** | — | — / — | частота 44100 ≠ 48000, на которой сняты ворота — несравнимо |
| Полевая запись 2026-08-16T14-40-38-226Z | 48000 | 175 | **detected** | 1 | 175 / 0 | — |

Сводка: всего 3 · detected 2 · not-detected 0 · refused 1.
Отказ по пробе — не «дрона нет», а «судить нечем»: запись при 44,1 кГц воротами, снятыми при 48 кГц, не судится и не подгоняется.

## Как получен

`yarn plugin:run:mfcc --host collections --tunnel office --doc docs/plugins/first-live-run-2026-08-18.md` (18.08, сессия Г):
пробы прочитаны GET'ами медиа-сервиса; хост — настоящий `CollectionsPluginHostService` (PR-2, #1974), в нём
зарегистрированы шесть плагинов первой волны (`registerFirstWave`), прогон запущен `host.request(...)`, результат
получен сидом `onResult`; запись — `PluginResultsService.writeRun` + `MongoPluginResultsStore` офиса (#1970) через
SSH-туннель к `archivarius-mongo`; независимо подтверждено `mongosh` на сервере (`db['plugin-results']`, 1 документ,
тот же runId). Предварительный прогон утром (без хоста, id `01a013b8-…`) в дом результатов не писался — живой след один.

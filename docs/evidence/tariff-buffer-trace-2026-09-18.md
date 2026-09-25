# Доезжает ли объём буфера от матрицы до прибора — 2026-09-18

Сессия Г, разведка замером под магистраль `tariff-transitions-live`. Задание: `docs/prompts/SESSION_D_TARIFF_QUOTA_TRACE_2026-09-18.md` (ветка `angelina/docs/session-tasks-18-09-part2`). Ствол на момент замера: `bac1180c`. **Ничего не чинилось.**

## Вывод одной строкой

**По коду цепочка целая до самого прибора, а на проде рвётся дважды до media: (1) кабинет на проде запущен 07.09 из образа с сеткой 29.07 (1 ГиБ у всех), сетка 09.09 в него не попала; (2) объём буфера кабинет отдаёт не из файла сетки, а из таблицы `Tariff` базы, которую наполняет только сид при первом деплое либо ручной `yarn tariff:project-cabinet` — в путь выкатки это не вшито, так что и после выкатки нового образа база останется на старых числах, пока проекцию не запустят руками.**

Именно поэтому владелец видел упор в 1 ГБ на старшем тарифе: это не «до матрицы», это матрица, которая до прибора не доехала.

## Три числа

| Тариф | Матрица (гранула, МиБ) | Сетка в стволе `bac1180c`, байт | Проекция в базу кабинета (прогон по коду) | Сетка в образе кабинета на проде (прогон по коду, см. «Образ») | Совпадает |
|---|---:|---:|---:|---:|---|
| free-v1 | 512 | 536870912 | 536870912 | 1073741824 | ствол ✅ · прод 🔴 |
| checkpoint-v1 | 2048 | 2147483648 | 2147483648 | 1073741824 | ствол ✅ · прод 🔴 |
| observatory-v1 | 4096 | 4294967296 | 4294967296 | 1073741824 | ствол ✅ · прод 🔴 |

Живого замера трёх чисел с кабинета **нет**: `GET /v1/tariffs` на `cabinet.membrana.space` требует авторизацию пользователя (401 без неё), ключа в распоряжении сессии не было, а гостевые учётные данные сида на проде пробовать нельзя. Столбцы «проекция» и «образ» — прогон по коду репозитория, помечены явно.

Прогон проекции: `projectTariffGridToCabinetBase(loadTariffGridDocument())` из `scripts/lib/tariff-project-cabinet.mjs` на сетке ствола → три числа выше, `grid.version = 1`.

## Цепочка, звено за звеном

| # | Звено | Файл : строка | Что отдаёт наружу | Источник объёма буфера | Совпадает с матрицей |
|---|---|---|---|---|---|
| 1 | Гранула матрицы | `docs/containers/strategic-docs/granules/tariff-buffer/resource.json` | `values.{free,checkpoint,observatory}-v1.MiB` = 512 / 2048 / 4096, ратифицировано 08.09 | — (исток) | ✅ |
| 2 | Сетка (производная) | `docs/tariffs/tariff-grid.json`, коммит `f5dcc7f4` 09.09 | `rows[].cells["storage.buffer"].limit` = 536870912 / 2147483648 / 4294967296, `unit: bytes` | гранула через `yarn tariff:reseed` | ✅ |
| 3 | Кабинет: файл сетки в образе | `packages/background-cabinet/Dockerfile:83` (`COPY docs/tariffs /app/docs/tariffs`) → `domain/tariff-grid-source.ts:52` `loadTariffGrid()` | список тарифов, ранг, права на переход | файл в образе | ✅ в стволе · 🔴 на проде (образ до 09.09) |
| 4 | Кабинет: проекция сетки в базу | `domain/tariff-grid-base.ts:65` `bufferQuotaBytes: BigInt(requireQuota(row,'storage.buffer','bytes'))` → `scripts/lib/tariff-project-cabinet.mjs` `upsertCabinetTariffs` | строки таблицы `Tariff` | вызывается только из `prisma/seed.mjs:15` (при `CABINET_RUN_SEED=true`, по регламенту деплоя выключается после первого запуска) и из `yarn tariff:project-cabinet` (руками) | ⚠ **обрыв на проде**: ни `docker/entrypoint.sh`, ни `deploy/cabinet-stack.sh`, ни compose проекцию не запускают |
| 5 | Кабинет: витрина тарифов | `modules/tariff/tariff-catalog.service.ts:30–62` → `domain/tariff-catalog.ts:65` `bufferQuotaBytes: record.bufferQuotaBytes.toString()` | `GET /v1/tariffs` → `items[].bufferQuotaBytes` (строка) | **таблица `Tariff` базы** (`record`), сетка даёт только список и ранг | зависит от звена 4 |
| 6 | Кабинет: контекст мембраны | `modules/membrane/membrane.service.ts:37` `serializeTariff` | `tariff.bufferQuotaBytes` в ответах о мембране | `membrane.tariff` = таблица `Tariff` | зависит от звена 4 |
| 7 | Кабинет: смена тарифа | `modules/tariff/tariff-transition.service.ts:181` `selectTariff` (транзакция) → `modules/tariff/tariff.controller.ts:132` `contextFanout.syncAllNodes(membrane.id)` **после успеха** | `{ ...outcome, contextSync: {updated, failed} }` | — | ✅ по коду: разноска идёт после смены, отказ media смену не отменяет и виден счётом |
| 8 | Кабинет → media: разноска | `modules/pair/membrane-context-fanout.service.ts:100` `bufferQuotaBytes: membrane.tariff.bufferQuotaBytes.toString()` → `modules/pair/media-bridge.service.ts:201` `PUT /v1/devices/:id/membrane` | тело `MediaMembraneContext.bufferQuotaBytes` | таблица `Tariff` | зависит от звена 4 |
| 9 | Media: приём контекста | `packages/background-media/src/modules/devices/devices.controller.ts:54` `parseMembraneContext` → `devices.service.ts:203` `bufferQuotaBytes: BigInt(membraneContext.bufferQuotaBytes)` | строка `Device.bufferQuotaBytes` в базе media | тело от кабинета | ✅ по коду |
| 10 | Media: предел прибора | `modules/devices/device-limits.ts:39` `resolveDeviceLimits` → `bigintToSafeInt(device.bufferQuotaBytes, config.MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE)` | число байт | строка прибора; **если у прибора значения нет — умолчание env `MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE` = 1073741824** (`config/env.schema.ts:34`) | ⚠ второй источник «1 ГБ» для приборов, зарегистрированных до контекста |
| 11 | Media: дверь квоты | `modules/devices/devices.controller.ts:176` `GET /v1/devices/:deviceId/quota` → `devices.service.ts:274` `buffer.limitBytes: limits.bufferQuotaBytes` | `{ buffer: { usedBytes, limitBytes, backend } }` | звено 10 | ✅ по коду |
| 12 | Клиент: чтение | `packages/services/media-library/src/backends/server-storage-backend.ts:372` `bufferLimitBytes: data.buffer.limitBytes` → `quota-status.ts:39` | `StorageQuota.bufferLimitBytes` | звено 11 | ✅ **поле живёт** |
| 13 | Прибор: показ и упор | `apps/client/src/modules/device-board/dutyPulseHost.ts:28` `capMb = bufferLimitBytes / 1048576` | `capMb` на дежурстве | звено 12 | ✅ по коду |

Последнее звено найдено: прибор берёт предел из `buffer.limitBytes` ответа `GET /v1/devices/:id/quota` сервера media, поле существует и читается. Обрыв не в приборе.

## Образ на проде — самый вероятный ответ на «1 ГБ»

Живой замер 18.09 14:57:22 UTC:

| Служба | `/health` | `uptime`, с | Старт процесса (UTC) |
|---|---|---:|---|
| `cabinet.membrana.space` | 200, `version 0.1.0` | 946460 | **2026-09-07 16:03** |
| `media.membrana.space` | 200, `version 0.1.0` | 946669 | **2026-09-07 15:59** |

- Сетка с новыми числами влита в ствол коммитом `f5dcc7f4` **09.09 08:35 UTC** — через двое суток после старта прода. Процесс, запущенный 07.09, её содержать не может.
- Сборки образа кабинета (`cabinet-images.yml`) 07.09: 13:40 `4d95e817`, 15:47 `17473545`, 16:38 `90b33b31`. На момент старта 16:03 тег `main` указывал на `17473545`. Сетка в этом коммите: `free-v1=1073741824 checkpoint-v1=1073741824 observatory-v1=1073741824`, `version 1` — та самая «1 ГиБ у всех» от 29.07.
- Образы собираются на каждый push в ствол (последняя сборка 18.09 14:08 UTC, `bac1180c`, с новой сеткой) — но выкатка ручная (`deploy/cabinet-stack.sh pull && up`), и с 07.09 её не было.

Отдельно про версию: `grid.version` остался `1` и в сетке 29.07, и в сетке 09.09. `tariffContractVersion` смену чисел не сигналит — ни кабинету, ни media, ни прибору не по чему заметить, что предел устарел.

## Где именно рвётся

1. **Звено 3–4, прод.** Образ кабинета на проде собран до сетки 09.09. Выкатка свежего образа принесёт новый файл сетки, но объём буфера в витрине и в разноске читается из таблицы `Tariff`, а её при выкатке никто не переписывает: `docker/entrypoint.sh` делает `prisma migrate deploy` и сид только при `CABINET_RUN_SEED=true` (регламент `docs/deploy/BACKGROUND_CABINET_DEPLOY.md:181` велит выключить после первого деплоя). Значит после выкатки нужен ещё ручной `yarn tariff:project-cabinet` в контуре кабинета — и проверка `yarn tariff:project-cabinet:check`, которая сравнивает базу с сеткой (`tariffGridBaseFindings`). Эта проверка и есть готовый зуб; в деплой не подключена.
2. **Звено 10, media.** Приборы, зарегистрированные до того, как кабинет стал разносить контекст, могут нести `NULL` в `bufferQuotaBytes` и получать умолчание 1 ГиБ из env. Смена тарифа лечит это разноской (звено 7–8), но только для приборов, до которых разноска доехала (`contextSync.failed` в ответе).
3. Сама смена тарифа (звено 7) по коду ведёт себя так, как ждёт владелец: тариф записан транзакцией, затем разноска на все приборы, счёт удач и отказов возвращается наружу. Но разносится значение из базы — то есть до починки п. 1 после перехода на старший тариф прибор получит те же 1073741824.

## Что не измерено и почему

- Числа в таблице `Tariff` прода — нет доступа к базе и нет пользовательского ключа для `GET /v1/tariffs`. Косвенно: сид в образе 07.09 (`prisma/seed.mjs` до `c82c36cd`) брал числа из `docs/tariffs/tariff-scalars.json`, где `bufferQuotaMiB` = 1024 для free и `null` для остальных; проекция из сетки появилась в сиде только 09.09.
- Значение `MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE` в env прода — не читалось (секреты), взято умолчание схемы.
- `media.mmbrn.tech` не отвечает по TLS (schannel handshake failed); живой адрес media — `media.membrana.space`.

## Кандидаты в билеты (правка — отдельным словом владельца)

- Выкатка кабинета: после `pull && up` — `tariff:project-cabinet` и `:check` как шаг деплоя (или сид, не выключаемый для таблицы `Tariff`), иначе матрица в базу не доезжает никогда.
- `grid.version` при пересеве чисел: либо инкремент, либо отдельный `ratifiedAt`/digest в сетке, чтобы `tariffContractVersion` перестал молчать о смене.
- Media: приборы с `NULL bufferQuotaBytes` — либо разовая разноска по всем мембранам (`syncAllNodes`), либо красный на умолчание 1 ГиБ для прибора с известной мембраной.

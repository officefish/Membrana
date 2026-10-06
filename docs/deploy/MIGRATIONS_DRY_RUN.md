# Сухой прогон миграций к выкатке #2588 (кабинет · media) — 06.10.2026

Снятие главного риска выкатки холодного архива: обе новые миграции были написаны снимками SQL и
до этого прогона ни разу не применялись к живому Postgres.

- Кабинет: `packages/background-cabinet/prisma/migrations/20261005160000_membrane_archive_retention` (#2588 b1, PR #2592).
- Media: `packages/background-media/prisma/migrations/20261005200000_downgrade_archive` (#2587 b2, PR #2594).

Ствол на момент прогона: `68e6abb0`. Исполнитель — сессия блока 2, по слову владельца (запуск Docker Desktop).

## Вердикт

| Миграция | Применяется на пустую БД | Снимки ≡ `schema.prisma` | Живые проверки | Вердикт |
|---|---|---|---|---|
| media `20261005200000_downgrade_archive` | **да** — вся цепочка из 14 миграций через `prisma migrate deploy` | **да** — `migrate diff --from-migrations … --to-schema-datamodel --exit-code` → «No difference detected» | enum `DowngradeArchiveState` = `{frozen,restored,deleted,failed}`, значение вне enum отбито; индексы `expiresAt`, `(deviceId, state)`, UNIQUE `(deviceId, planDigest)` на месте; FK на `Device` работает; дубль плана отбит | **ГОДНА К ВЫКАТКЕ** |
| кабинет `20261005160000_membrane_archive_retention` | **сама — да**; но цепочка кабинета на пустую БД **не применяется** из-за дефекта ДО неё (см. находку К1) | **для этой таблицы — да** (в разностях её нет); цепочка в целом ≠ схема (находки К2, К3 — не этой миграции) | `CHECK ("days" IN (1,7,14,30,90))`: `days=2` отбит, `14` прошёл; второй срок той же мембране отбит UNIQUE `membraneId`; backfill нет | **ГОДНА К ВЫКАТКЕ на прод инкрементально** (прод уже прошёл цепочку); **бутстрап пустой БД кабинета сломан независимо от неё** |

Расхождений внутри двух новых снимков не найдено — исправлять нечего, SQL не правился. Три
находки ниже (К1–К3) — **о старых миграциях кабинета**, они предшествуют #2588 и решаются словом
владельца: править применённые на проде миграции в этом PR нельзя (Prisma сверяет имена с
`_prisma_migrations`).

## Условия прогона

- Docker Desktop (демон 29.2.0) запущен по слову владельца; после прогона **не остановлен**.
- Временный контейнер `postgres:16-alpine` (тот же образ, что в `docker-compose.yml` обоих пакетов), имя `membrana-mig-dryrun`, порт только `127.0.0.1:54329`, пользователь `dryrun`, пароль — `openssl rand -hex 24`, в вывод не попадал; контейнер снесён после прогона (`docker rm -f`).
- Базы: `cabinet_dryrun`, `cabinet_shadow`, `cabinet_dryrun2`, `media_dryrun`, `media_shadow` — все пустые на старте.
- Prisma CLI 6.19.3 (из дерева, без `yarn install`). В выводах ниже пароль заменён на `<pw>`, где он мог появиться.

## До базы (статика)

- `npx prisma validate` — обе схемы валидны. (`prisma format --check` жалуется на форматирование — косметика, не трогалась.)
- Снимок media (82 строки): `CREATE TYPE "DowngradeArchiveState" AS ENUM ('frozen','restored','deleted','failed')`; таблицы `DowngradeArchiveBatch`, `DowngradeArchivedSample`; `UNIQUE (deviceId, planDigest)`; индексы `(expiresAt)`, `(deviceId, state)`, `(batchId)`, `(deviceId)`; FK на `Device` (`ON DELETE CASCADE`) и на партию (`NO ACTION`).
- Снимок кабинета: `CREATE TABLE "MembraneArchiveRetention"`, `UNIQUE INDEX … ("membraneId")`, `CHECK ("days" IN (1, 7, 14, 30, 90))`, без `INSERT INTO` (отсутствие строки = умолчание 14 — закон домена). Текстовые зубы P6/P7 (`archive-retention.store.test.ts`) зелёные в стволе.

## На базе — media

```
cd packages/background-media
DATABASE_URL=postgresql://dryrun:<pw>@127.0.0.1:54329/media_dryrun npx prisma migrate deploy
  Datasource "db": PostgreSQL database "media_dryrun", schema "public" at "127.0.0.1:54329"
  14 migrations found in prisma/migrations
  … 20261005200000_downgrade_archive/migration.sql
  All migrations have been successfully applied.                       → exit 0

npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma \
  --shadow-database-url postgresql://dryrun:<pw>@127.0.0.1:54329/media_shadow --exit-code
  No difference detected.                                               → exit 0
```

Живые проверки (`psql` в контейнере, БД `media_dryrun`):

```
SELECT enum_range(NULL::"DowngradeArchiveState");      → {frozen,restored,deleted,failed}
INSERT … state='melted'                                 → ERROR: invalid input value for enum "DowngradeArchiveState": "melted"
INSERT … state='frozen', deviceId без строки Device     → ERROR: violates foreign key constraint "DowngradeArchiveBatch_deviceId_fkey"
INSERT Device(kind='other') + INSERT batch state='frozen', expiresAt=now()+14d → INSERT 0 1
повтор с тем же (deviceId, planDigest)                  → ERROR: duplicate key value violates unique constraint "DowngradeArchiveBatch_deviceId_planDigest_key"
\d "DowngradeArchiveBatch"  Indexes:
    "DowngradeArchiveBatch_pkey" PRIMARY KEY, btree (id)
    "DowngradeArchiveBatch_deviceId_planDigest_key" UNIQUE, btree ("deviceId", "planDigest")
    "DowngradeArchiveBatch_deviceId_state_idx" btree ("deviceId", state)
    "DowngradeArchiveBatch_expiresAt_idx" btree ("expiresAt")
\d "DowngradeArchivedSample" Indexes: pkey · (batchId) · (deviceId); FK batchId → батч (NO ACTION), deviceId → Device (CASCADE)
EXPLAIN SELECT id FROM "DowngradeArchiveBatch" WHERE state='frozen' AND "expiresAt" <= now()
  → Index Scan using "DowngradeArchiveBatch_deviceId_state_idx"; Filter: ("expiresAt" <= now())
SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL → 14
```

Замечание (не дефект): на пустой таблице планировщик берёт индекс `(deviceId, state)`, а не
`expiresAt` — выбор по статистике; индекс `expiresAt` существует, на живых объёмах план пересчитается.

## На базе — кабинет

### К1. Цепочка кабинета на пустую БД не применяется (дефект до #2588)

```
cd packages/background-cabinet
DATABASE_URL=…/cabinet_dryrun npx prisma migrate deploy
  20 migrations found in prisma/migrations
  Applying migration `20260612120000_tariff_quota_rename`
  Error: P3018 … Database error code: 42P01
  ERROR: relation "Tariff" does not exist                              → exit 1
npx prisma migrate diff --from-migrations … --exit-code
  Error: P3006 Migration `20260612120000_tariff_quota_rename` failed to apply cleanly to the shadow database.
  The underlying table for model `Tariff` does not exist.              → exit 1
```

Причина: папка `20260612120000_tariff_quota_rename` (создана 14.06, коммит `71ca3538`) датирована
**раньше** `20260613120000_init` и `20260614120000_mp2_domain` (которая и создаёт `Tariff`). Prisma
применяет снимки в лексикографическом порядке имён, поэтому на пустой базе переименование идёт
первым и падает. Прод не пострадал: там `mp2_domain` была применена раньше, а переименование
доехало инкрементально. **Следствие:** бутстрап кабинета на пустую БД (staging, восстановление,
`migrate diff --from-migrations`) сломан с 14.06.2026. Лекарство — слово владельца: переименовать
папку в `20260614120001_…` **с одновременной** правкой строки `migration_name` в `_prisma_migrations`
прода (иначе Prisma сочтёт применённую миграцию пропавшей, а переименованную — новой), либо
`prisma migrate resolve` по плану выкатки. В этом PR не трогалось.

### Обход для проверки остальных снимков (временная копия вне репозитория)

Чтобы проверить **все** 20 снимков, включая `20261005160000`, папка переименования была
скопирована в каталог вне репозитория под именем `2026061412001_tariff_quota_rename` (сразу после
`mp2_domain`), и снимки применены по одному через `psql -v ON_ERROR_STOP=1` в пустую `cabinet_dryrun2`:

```
applied all 20 snapshots
npx prisma migrate diff --from-url …/cabinet_dryrun2 --to-schema-datamodel ./prisma/schema.prisma --exit-code
  [+] Added enum DeviceCaptureMode
  [+] Added tables: NodeDeviceCapture
  [*] Changed the `NodeDeviceCapture` table: + unique (nodeId), + index (expiresAt), + unique (membraneId, mediaDeviceId), + FK membraneId/nodeId/sessionId
  [*] Changed the `Tariff` table: altered column `datasetCatalogId` (default changed from 'free-v1-catalog' to None)
                                                                        → exit 2 (разности есть)
```

В разностях **нет ни строки** про `MembraneArchiveRetention` — снимок #2588 b1 совпадает со схемой.

### К2. `NodeDeviceCapture` и enum `DeviceCaptureMode` есть в `schema.prisma`, но ни одна миграция их не создаёт (дефект до #2588)

Модель добавлена 02.07.2026 (`becd70ee`, CT2 gateway capture lifecycle); `grep NodeDeviceCapture
prisma/migrations/*/migration.sql` → 0 файлов. Либо на проде таблица создана не миграцией (`db
push`), либо захват устройства работает на отсутствующей таблице — проверить на проде словом владельца
(`\d "NodeDeviceCapture"`). Исправление — новая миграция `CREATE TABLE … IF NOT EXISTS`/по факту
прода — отдельный билет, не этот PR.

### К3. `Tariff.datasetCatalogId`: снимок задаёт `DEFAULT 'free-v1-catalog'`, схема — без умолчания

Разность безвредна для чтения/записи через Prisma (клиент значение задаёт сам), но снимок ≠ схема,
и `migrate dev` при следующей миграции предложит `ALTER COLUMN … DROP DEFAULT`. Решить при К1/К2.

### Живые проверки миграции #2588 b1 (БД `cabinet_dryrun2`)

```
INSERT INTO "MembraneArchiveRetention" (…, days=2, …)   → ERROR: new row … violates check constraint "MembraneArchiveRetention_days_check"
INSERT … days=14                                         → INSERT 0 1
INSERT … days=7 той же membraneId                        → ERROR: duplicate key value violates unique constraint "MembraneArchiveRetention_membraneId_key"
SELECT days FROM "MembraneArchiveRetention"               → 14
\d "MembraneArchiveRetention"
    membraneId uuid not null · days integer not null · updatedBy text not null · updatedAt timestamp(3) not null
    Indexes: pkey (id) · "MembraneArchiveRetention_membraneId_key" UNIQUE ("membraneId")
    Check constraints: "MembraneArchiveRetention_days_check" CHECK (days = ANY (ARRAY[1, 7, 14, 30, 90]))
```

## Что НЕ проверено

- Прод-состояние `_prisma_migrations` и наличие `NodeDeviceCapture` на проде кабинета (серверы не трогались).
- Прогон на данных: обе БД пустые; поведение `markPurged`/`restoreBatch` на живых строках — зубы на стабах (b3a #2604, b5 #2608).
- Откат миграций (down) — Prisma их не генерирует; снимки написаны вперёд.

## Снос

`docker rm -f membrana-mig-dryrun` — контейнер и его том удалены; временная копия миграций и файл с
паролем в scratchpad удалены. Docker Desktop оставлен работающим (машина владельца).

## Закрытие (ведущая, 06.10)

- **Задача** [#2611](https://github.com/officefish/Membrana/issues/2611) заведена на К1–К3. Правка истории применённых миграций (переименование `tariff_quota_rename`, миграция для `NodeDeviceCapture`, умолчание `datasetCatalogId`) — только словом владельца.
- **Прод кабинета проверен ведущей чтением 06.10** (значений секретов нет):
  - `to_regclass('"NodeDeviceCapture"')` → таблица есть (создана не миграцией) — К2 на проде не дыра, а расхождение истории;
  - `_prisma_migrations`: `20260612120000_tariff_quota_rename` применена 1 раз — К1 на проде не проявляется;
  - `Tariff.datasetCatalogId` `column_default` — нет: прод ≡ схема, расходится только снимок (К3);
  - последняя применённая миграция — `20260908172033_tariff_contract_version` → миграции #2587 (media) и #2588 (`20261005160000_membrane_archive_retention`) поедут инкрементально.
- **Вывод:** К1–К3 не блокируют выкатку холодного архива.

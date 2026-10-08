-- #2632 блок g1a (консилиум archive-gc-journal-2026-10-08, вердикт 1): журнал уборщика холодного
-- архива живёт в media рядом с архивом. Прогон ("ColdArchivePurgeRun") пишется всегда, когда уборка
-- включена, в том числе пустой; задание ("ColdArchivePurgeJob") — партия или осиротевший файл, со
-- СНИМКОМ путей до `markPurged` и исходом по каждому пути. purge-journal ≠ downgrade-archive.
--
-- СНИМОК SQL НАПИСАН РУКОЙ ПО ОБРАЗЦУ СОСЕДЕЙ и сверен с `prisma migrate diff --from-schema-datamodel
-- <схема с Restrict> --to-schema-datamodel <схема с журналом> --script` (без БД) — тот же набор
-- операторов. `prisma migrate deploy` на пустую БД в этом блоке НЕ гонялся (демон Docker не запущен).
--
-- Литералы enum'ов — `src/modules/downgrade-archive/purge-journal.vocabulary.ts`; равенство словаря,
-- схемы и этого файла держит `purge-journal.schema.test.ts`.

CREATE TYPE "ColdArchivePurgeTrigger" AS ENUM ('cron', 'panel', 'manual');
CREATE TYPE "ColdArchivePurgeMode" AS ENUM ('dry_run', 'live');
CREATE TYPE "ColdArchivePurgeRunStatus" AS ENUM ('running', 'succeeded', 'failed', 'abandoned');
CREATE TYPE "ColdArchivePurgeTarget" AS ENUM ('batch', 'orphan_blob');
CREATE TYPE "ColdArchivePurgeJobStatus" AS ENUM ('pending', 'claimed', 'succeeded', 'retry', 'dead_letter');

-- Прогон. Пустой прогон = строка `succeeded` с нулями (вердикт 5); оборванный рестартом помечается
-- `abandoned` на старте следующего. Снимки флагов office — что было на момент пуска.
CREATE TABLE "ColdArchivePurgeRun" (
    "id" UUID NOT NULL,
    "trigger" "ColdArchivePurgeTrigger" NOT NULL,
    "mode" "ColdArchivePurgeMode" NOT NULL,
    "status" "ColdArchivePurgeRunStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "enabledSnapshot" BOOLEAN NOT NULL,
    "dryRunSnapshot" BOOLEAN NOT NULL,
    "jobsTotal" INTEGER NOT NULL DEFAULT 0,
    "jobsSucceeded" INTEGER NOT NULL DEFAULT 0,
    "jobsFailed" INTEGER NOT NULL DEFAULT 0,
    "jobsDeadLetter" INTEGER NOT NULL DEFAULT 0,
    "bytesFreed" BIGINT NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "ColdArchivePurgeRun_pkey" PRIMARY KEY ("id")
);

-- Задание. "storageRefs" — снимок путей ДО markPurged; "outcomes" — по каждому пути
-- { beforeExists, afterExists, action: removed | already_absent | failed }. Захват по лизу
-- ("leaseUntil"), повтор по "nextAttemptAt". "deviceId" — снимок, не внешний ключ.
CREATE TABLE "ColdArchivePurgeJob" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "targetType" "ColdArchivePurgeTarget" NOT NULL,
    "batchId" UUID,
    "deviceId" UUID,
    "storageRefs" TEXT[],
    "status" "ColdArchivePurgeJobStatus" NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "leaseUntil" TIMESTAMP(3),
    "outcomes" JSONB NOT NULL DEFAULT '{}',
    "bytesFreed" BIGINT NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "ColdArchivePurgeJob_pkey" PRIMARY KEY ("id")
);

-- Пульс (g4/g5b): последний завершённый и последний успешный прогон; журнал — по времени старта.
CREATE INDEX "ColdArchivePurgeRun_status_finishedAt_idx" ON "ColdArchivePurgeRun"("status", "finishedAt");
CREATE INDEX "ColdArchivePurgeRun_startedAt_idx" ON "ColdArchivePurgeRun"("startedAt");

-- Выборка долга: status IN ('pending', 'retry') AND "nextAttemptAt" <= now.
CREATE INDEX "ColdArchivePurgeJob_status_nextAttemptAt_idx" ON "ColdArchivePurgeJob"("status", "nextAttemptAt");
CREATE INDEX "ColdArchivePurgeJob_batchId_idx" ON "ColdArchivePurgeJob"("batchId");
-- Одна партия — одно задание в прогоне: повтор той же партии в прогоне получает отказ БД.
-- "orphan_blob" идёт с "batchId" = NULL (NULL различны) и различается по "storageRefs".
CREATE UNIQUE INDEX "ColdArchivePurgeJob_runId_batchId_key" ON "ColdArchivePurgeJob"("runId", "batchId");

-- Прогоны не удаляются, пока у них есть задания (журнал — след). Партия — NO ACTION: партии не
-- удаляются, уборка переводит их в `deleted`.
ALTER TABLE "ColdArchivePurgeJob" ADD CONSTRAINT "ColdArchivePurgeJob_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "ColdArchivePurgeRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ColdArchivePurgeJob" ADD CONSTRAINT "ColdArchivePurgeJob_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "DowngradeArchiveBatch"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

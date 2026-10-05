-- #2587 блок b2, ADR-0031 (решения 2 и 4): архив понижения — ОТДЕЛЬНЫЕ таблицы, не пометка на "Sample".
--
-- СНИМОК SQL НАПИСАН РУКОЙ ПО ОБРАЗЦУ СОСЕДЕЙ; `prisma migrate dev` локально НЕ гонялся (живой БД в
-- дереве нет). Первый `prisma migrate deploy` на стенде — проверка снимка против схемы; расхождение
-- чинится здесь, а не правкой схемы под снимок.
--
-- Почему две таблицы, а не статус у пробы: подсчёт квоты (`getQuota`), списки, витрины и путь
-- воспроизведения читают "Sample" и не меняются — замороженной строки там просто нет. Файл блоба
-- остаётся на месте: заморозка — перенос метаданных, не копирование байт.

CREATE TYPE "DowngradeArchiveState" AS ENUM ('frozen', 'restored', 'deleted', 'failed');

-- Партия — единица заморозки, возврата и удаления. `expiresAt` — СНИМОК (frozenAt + retentionDays
-- суток), смена срока на мембране старые партии не трогает (решение 4).
CREATE TABLE "DowngradeArchiveBatch" (
    "id" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'tariff_downgrade',
    "fromTariffId" TEXT NOT NULL,
    "toTariffId" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "planDigest" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "state" "DowngradeArchiveState" NOT NULL DEFAULT 'frozen',
    "restoredAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "keptBytes" BIGINT NOT NULL,
    "frozenBytes" BIGINT NOT NULL,

    CONSTRAINT "DowngradeArchiveBatch_pkey" PRIMARY KEY ("id")
);

-- Идемпотентность freeze держит СХЕМА: второй приказ с тем же planDigest на тот же прибор получает
-- отказ БД, а не вторую партию.
CREATE UNIQUE INDEX "DowngradeArchiveBatch_deviceId_planDigest_key" ON "DowngradeArchiveBatch"("deviceId", "planDigest");
-- Предикат уборки #2588: state = 'frozen' AND expiresAt <= now.
CREATE INDEX "DowngradeArchiveBatch_expiresAt_idx" ON "DowngradeArchiveBatch"("expiresAt");
CREATE INDEX "DowngradeArchiveBatch_deviceId_state_idx" ON "DowngradeArchiveBatch"("deviceId", "state");

-- Строка пробы, перенесённая из "Sample" ЦЕЛИКОМ под ТЕМ ЖЕ id: возврат восстанавливает прежний
-- адрес, и ссылки журнала кабинета на sampleId переживают заморозку.
CREATE TABLE "DowngradeArchivedSample" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "label" "SampleLabel" NOT NULL,
    "source" "SampleSource" NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "sampleRate" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL,
    "audioFormat" "AudioFormat" NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageRef" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "modeRank" INTEGER,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DowngradeArchivedSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DowngradeArchivedSample_batchId_idx" ON "DowngradeArchivedSample"("batchId");
CREATE INDEX "DowngradeArchivedSample_deviceId_idx" ON "DowngradeArchivedSample"("deviceId");

ALTER TABLE "DowngradeArchiveBatch" ADD CONSTRAINT "DowngradeArchiveBatch_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Партия не удаляется, пока в ней есть строки: NO ACTION, а не RESTRICT. RESTRICT проверяется
-- немедленно и ломает каскад от "Device" (порядок каскадов между двумя внешними ключами не
-- гарантирован); NO ACTION проверяется в конце оператора — каскад прибора проходит, а явное
-- удаление живой партии получает отказ. Смысл ADR-0031 («партия остаётся следом») тот же.
ALTER TABLE "DowngradeArchivedSample" ADD CONSTRAINT "DowngradeArchivedSample_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "DowngradeArchiveBatch"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "DowngradeArchivedSample" ADD CONSTRAINT "DowngradeArchivedSample_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

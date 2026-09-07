-- #2308, вердикт M1 заседания `buffer-full-stop` (06.09): политика переполнения буфера в кабинете —
-- origin команды оператора. Мембрана несёт политику + галочку-ПРИВЯЗКУ «применить ко всем»;
-- прибор несёт собственную политику, которая при стоящей привязке не перезаписывается и
-- возвращается ему при снятии (T13/T17: привязка, не снимок).
--
-- ПОЛИТИКА МЕМБРАНЫ — ОТДЕЛЬНОЙ ТАБЛИЦЕЙ, а не колонками "Membrane": замер 06.09 показал, что
-- любая новая колонка "Membrane" рушит перегрузку в чужом модуле (sample-library); настройка
-- по образцу TrackKeyTtlSetting media живёт рядом, уникальность на мембрану держит схема.
--
-- Порядок несущий для "Device": колонка добавляется БЕЗ NOT NULL → backfill 'stop' по всем
-- рядам → DEFAULT/NOT NULL. Для мембран backfill — явная строка 'stop' / привязка снята на
-- КАЖДУЮ существующую мембрану: включение привязки — движение человека с подтверждением, а не
-- следствие миграции.
CREATE TYPE "BufferPolicyMode" AS ENUM ('stop', 'smart_cleanup');

CREATE TABLE "MembraneBufferPolicy" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "mode" "BufferPolicyMode" NOT NULL DEFAULT 'stop',
    "params" JSONB,
    "binding" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembraneBufferPolicy_pkey" PRIMARY KEY ("id")
);

-- Одна строка на мембрану — держит схема, а не порядок вызовов upsert.
CREATE UNIQUE INDEX "MembraneBufferPolicy_membraneId_key" ON "MembraneBufferPolicy"("membraneId");

-- Backfill мембран: каждая существующая — 'stop', привязка снята.
-- gen_random_uuid() — ядро PostgreSQL с 13; образ здесь postgres:16-alpine.
INSERT INTO "MembraneBufferPolicy" ("id", "membraneId", "mode", "binding", "updatedAt")
  SELECT gen_random_uuid(), "id", 'stop', false, CURRENT_TIMESTAMP
  FROM "Membrane";

ALTER TABLE "Device"
  ADD COLUMN "bufferPolicy" "BufferPolicyMode",
  ADD COLUMN "bufferPolicyParams" JSONB;

UPDATE "Device"
  SET "bufferPolicy" = 'stop'
  WHERE "bufferPolicy" IS NULL;

ALTER TABLE "Device"
  ALTER COLUMN "bufferPolicy" SET DEFAULT 'stop',
  ALTER COLUMN "bufferPolicy" SET NOT NULL;

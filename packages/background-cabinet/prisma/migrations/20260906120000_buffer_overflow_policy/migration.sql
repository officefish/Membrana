-- #2308, вердикт M1 заседания `buffer-full-stop` (06.09): политика переполнения буфера в кабинете —
-- origin команды оператора. Мембрана несёт политику + галочку-ПРИВЯЗКУ «применить ко всем»;
-- прибор несёт собственную политику, которая при стоящей привязке не перезаписывается и
-- возвращается ему при снятии (T13/T17: привязка, не снимок).
--
-- Порядок несущий: колонки добавляются БЕЗ NOT NULL → backfill 'stop' по всем рядам →
-- DEFAULT/NOT NULL. Все мембраны и приборы, жившие до миграции, — 'stop'; привязка снята:
-- включение — движение человека с подтверждением, а не следствие миграции.
CREATE TYPE "BufferPolicyMode" AS ENUM ('stop', 'smart_cleanup');

ALTER TABLE "Membrane"
  ADD COLUMN "bufferPolicy" "BufferPolicyMode",
  ADD COLUMN "bufferPolicyParams" JSONB,
  ADD COLUMN "bufferPolicyBinding" BOOLEAN;

UPDATE "Membrane"
  SET "bufferPolicy" = 'stop'
  WHERE "bufferPolicy" IS NULL;

UPDATE "Membrane"
  SET "bufferPolicyBinding" = false
  WHERE "bufferPolicyBinding" IS NULL;

ALTER TABLE "Membrane"
  ALTER COLUMN "bufferPolicy" SET DEFAULT 'stop',
  ALTER COLUMN "bufferPolicy" SET NOT NULL,
  ALTER COLUMN "bufferPolicyBinding" SET DEFAULT false,
  ALTER COLUMN "bufferPolicyBinding" SET NOT NULL;

ALTER TABLE "Device"
  ADD COLUMN "bufferPolicy" "BufferPolicyMode",
  ADD COLUMN "bufferPolicyParams" JSONB;

UPDATE "Device"
  SET "bufferPolicy" = 'stop'
  WHERE "bufferPolicy" IS NULL;

ALTER TABLE "Device"
  ALTER COLUMN "bufferPolicy" SET DEFAULT 'stop',
  ALTER COLUMN "bufferPolicy" SET NOT NULL;

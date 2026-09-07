-- #2308, вердикт M1 заседания `buffer-full-stop` (06.09): политика переполнения буфера — поле
-- прибора на сервере записей. Ночь 05→06.09 прибор сам решал судьбу вещдоков локальной
-- автоочисткой; отныне режим задаёт сервер, а прибор читает и подчиняется (T1).
--
-- ТРОЙНАЯ СКОБА fail-closed (Математик, M1): backfill → DEFAULT/NOT NULL → effective() на чтении.
-- Здесь первые две. Порядок несущий: колонка добавляется БЕЗ NOT NULL, все существующие ряды
-- получают 'stop', и только потом ставится NOT NULL — иначе миграция упала бы на живой базе с
-- приборами, а «упала» значит «прибор остался на автоочистке ещё на сутки».
--
-- Легаси 'auto-cleanup' в тип НЕ входит: неизвестное значение отвергает сам Postgres.
CREATE TYPE "BufferPolicyMode" AS ENUM ('stop', 'smart_cleanup');

ALTER TABLE "Device"
  ADD COLUMN "bufferPolicy" "BufferPolicyMode",
  ADD COLUMN "bufferPolicyParams" JSONB;

-- Backfill: каждый прибор, живший до этой миграции, — 'stop'. Не «умная очистка с пустыми
-- параметрами» и не NULL, который старый бинарник мог бы прочитать как «делай как раньше».
UPDATE "Device"
  SET "bufferPolicy" = 'stop'
  WHERE "bufferPolicy" IS NULL;

ALTER TABLE "Device"
  ALTER COLUMN "bufferPolicy" SET DEFAULT 'stop',
  ALTER COLUMN "bufferPolicy" SET NOT NULL;

-- #2632 блок g1a (Т3, консилиум archive-gc-journal-2026-10-08 вердикт 4, Д6): немой каскад архива от
-- прибора снят. Было `ON DELETE CASCADE` у обеих связей архива понижения с "Device" — удаление прибора
-- молча уносило партии и строки архива, а файлы блобов на диске оставались сиротами без следа.
-- Стало `ON DELETE RESTRICT`: прибор с архивом (в любом состоянии партии — следы `deleted` тоже)
-- удаляется только после явного решения об архиве. Глагола удаления прибора в media нет, дыра была
-- схемная и латентная; эта миграция её закрывает ДО появления исполнителя уборки (правка резчика (в)).
--
-- Отдельной миграцией от журнала уборщика — по плану: смена поведения существующих таблиц не прячется
-- внутри создания новых.
--
-- СНИМОК SQL НАПИСАН РУКОЙ ПО ОБРАЗЦУ СОСЕДЕЙ и сверен с `prisma migrate diff --from-schema-datamodel
-- <схема ствола> --to-schema-datamodel <схема с Restrict> --script` (без БД) — совпадает построчно.
-- `prisma migrate deploy` на пустую БД в этом блоке НЕ гонялся (демон Docker не запущен).
--
-- Связь строк архива с партией ("DowngradeArchivedSample_batchId_fkey", NO ACTION) не меняется.

ALTER TABLE "DowngradeArchiveBatch" DROP CONSTRAINT "DowngradeArchiveBatch_deviceId_fkey";
ALTER TABLE "DowngradeArchivedSample" DROP CONSTRAINT "DowngradeArchivedSample_deviceId_fkey";

ALTER TABLE "DowngradeArchiveBatch" ADD CONSTRAINT "DowngradeArchiveBatch_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DowngradeArchivedSample" ADD CONSTRAINT "DowngradeArchivedSample_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

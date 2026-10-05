-- #2588 (блок 2, b1), ADR-0031 п.4 (консилиум 05.10, ратификация владельца 05.10 15:45Z):
-- срок хранения архива понижения живёт в КАБИНЕТЕ, на мембране, в днях. Office показывает и
-- меняет значение через служебную дверь (b2), media получает число снимком в приказе заморозки
-- (`expiresAt = frozenAt + retentionDays`) и за сроком никуда не ходит.
--
-- ОТДЕЛЬНОЙ ТАБЛИЦЕЙ, не колонкой "Membrane" — та же причина, что у "MembraneBufferPolicy"
-- (20260906120000): новая скалярная колонка "Membrane" рушит перегрузки requireOwnedMembrane
-- в чужом модуле (sample-library, TS2394).
--
-- БЕЗ BACKFILL — сознательно. Отсутствие строки = умолчание 14 дней (закон домена,
-- src/domain/archive-retention.ts), и именно по отсутствию строки дверь office отвечает
-- isDefault: true. Строка рождается только движением владельца в панели.
--
-- CHECK — первый пояс закрытого списка (решение владельца 05.10, развилка P7a): ручная запись
-- «2» отбивается самим Postgres. Домен — второй пояс: значение вне списка на чтении → 14
-- (fail-safe в сторону ХРАНЕНИЯ, не удаления). Смена списка значений = новая миграция.
CREATE TABLE "MembraneArchiveRetention" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "days" INTEGER NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembraneArchiveRetention_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembraneArchiveRetention_days_check" CHECK ("days" IN (1, 7, 14, 30, 90))
);

-- Одна строка на мембрану — держит схема, а не порядок вызовов upsert.
CREATE UNIQUE INDEX "MembraneArchiveRetention_membraneId_key" ON "MembraneArchiveRetention"("membraneId");

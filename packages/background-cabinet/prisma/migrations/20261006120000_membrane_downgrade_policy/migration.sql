-- #2587 b4a, ADR-0031 (решения владельца 05.10 п.3): режим отбора живого при понижении тарифа —
-- настройка МЕМБРАНЫ в кабинете; умолчание «превышение над фоном».
--
-- СНИМОК SQL НАПИСАН РУКОЙ ПО ОБРАЗЦУ СОСЕДЕЙ ("MembraneArchiveRetention", 20261005160000);
-- `prisma migrate dev` локально не гонялся (живой БД в дереве нет) — первый `migrate deploy` на
-- стенде сверит снимок со схемой.
--
-- ОТДЕЛЬНОЙ ТАБЛИЦЕЙ, не колонкой "Membrane" — та же причина, что у "MembraneBufferPolicy" и
-- "MembraneArchiveRetention": скалярная колонка "Membrane" рушит перегрузки requireOwnedMembrane
-- в чужом модуле (sample-library, TS2394).
--
-- БЕЗ BACKFILL — сознательно. Нет строки = умолчание (закон домена, src/domain/downgrade-policy.ts);
-- строка рождается только движением пользователя в кабинете, и по её отсутствию дверь отвечает
-- isDefault: true.
--
-- CHECK — первый пояс закрытого списка (зеркало словаря сервера записей, b3a); домен — второй:
-- значение вне списка на чтении → умолчание. Четвёртый режим = новая миграция, не строка.
CREATE TABLE "MembraneDowngradePolicy" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "criterion" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembraneDowngradePolicy_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembraneDowngradePolicy_criterion_check" CHECK ("criterion" IN ('loudness-over-floor', 'spectral-variety', 'drone-likeness'))
);

-- Одна строка на мембрану — держит схема, а не порядок вызовов upsert.
CREATE UNIQUE INDEX "MembraneDowngradePolicy_membraneId_key" ON "MembraneDowngradePolicy"("membraneId");

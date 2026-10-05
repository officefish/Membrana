import { Module } from '@nestjs/common';

import { ARCHIVE_RETENTION_READER, ArchiveRetentionStore } from './archive-retention.store';

/**
 * Модуль срока хранения архива понижения (#2588 b1).
 *
 * Отдаёт наружу класс store (для двери office→кабинет, b2) и ПОРТ `ARCHIVE_RETENTION_READER`
 * (для потока понижения блока 1, #2587) — один и тот же экземпляр под двумя именами, чтобы
 * блок 1 зависел от интерфейса, а не от класса. `PrismaModule` глобален — импортировать не надо.
 *
 * В `app.module.ts` НЕ регистрируется этим блоком: зона b1 — только таблица, домен и store;
 * провод в граф приложения тянет b2 вместе с дверью.
 */
@Module({
  providers: [ArchiveRetentionStore, { provide: ARCHIVE_RETENTION_READER, useExisting: ArchiveRetentionStore }],
  exports: [ArchiveRetentionStore, ARCHIVE_RETENTION_READER],
})
export class ArchiveRetentionModule {}

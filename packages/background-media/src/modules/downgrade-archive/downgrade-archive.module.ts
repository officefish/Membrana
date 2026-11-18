/**
 * Модуль архива понижения (#2587: хранилище — b2, двери — b3b; #2588 b5: уборка по сроку; ADR-0031).
 *
 * `DevicesModule` отдаёт сторож маршрута (`MediaDeviceAccessGuard` → `DeviceGuard`, `NodeKeyService`,
 * `APP_CONFIG`) и `DevicesService` для квоты при возврате; `BlobModule` — чтение байт проб для
 * измерителя (b3) и удаление файлов при уборке (b5). Смоук DI (#2009) судит dist: под vitest на
 * исходниках esbuild не пишет `design:paramtypes`, и зелёный там граф не удостоверяет.
 *
 * Массивы — по элементу на строку: два блока (#2587 двери, #2588 уборка) добавляют свои строки,
 * и слияние остаётся построчным. #2632 g3b: журнал уборщика (`PurgeJournalStore`) и исполнитель
 * (`PurgeGcRunner`) — провайдеры модуля; дверь уборки зовёт исполнителя через сервис.
 * Дверь уборки `purge-expired` — под `ApiTokenGuard` (служебная,
 * для cron office), двери понижения — под `MediaDeviceAccessGuard` (прибор).
 */
import { Module } from '@nestjs/common';

import { BlobModule } from '../../blob/blob.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DevicesModule } from '../devices/devices.module';

import { DowngradeArchivePurgeController } from './downgrade-archive-purge.controller';
import { DowngradeArchivePurgeService } from './downgrade-archive-purge.service';
import { DowngradeArchiveController } from './downgrade-archive.controller';
import { DowngradeArchiveService } from './downgrade-archive.service';
import { DowngradeArchiveStore } from './downgrade-archive.store';
import { PurgeGcRunner } from './purge-gc.runner';
import { PurgeJournalStore } from './purge-journal.store';

@Module({
  imports: [
    PrismaModule,
    DevicesModule,
    BlobModule,
  ],
  controllers: [
    DowngradeArchiveController,
    DowngradeArchivePurgeController,
  ],
  providers: [
    DowngradeArchiveStore,
    DowngradeArchiveService,
    DowngradeArchivePurgeService,
    PurgeJournalStore,
    PurgeGcRunner,
  ],
  exports: [
    DowngradeArchiveStore,
    DowngradeArchiveService,
  ],
})
export class DowngradeArchiveModule {}

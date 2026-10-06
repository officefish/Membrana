/**
 * Модуль архива понижения (#2587: хранилище — b2, двери — b3b; ADR-0031).
 *
 * `DevicesModule` отдаёт сторож маршрута (`MediaDeviceAccessGuard` → `DeviceGuard`, `NodeKeyService`,
 * `APP_CONFIG`) и `DevicesService` для квоты при возврате; `BlobModule` — чтение байт проб для
 * измерителя. Смоук DI (#2009) судит dist: под vitest на исходниках esbuild не пишет
 * `design:paramtypes`, и зелёный там граф не удостоверяет.
 *
 * Массивы — по элементу на строку: соседний блок (#2588, уборка `downgrade-archive-purge.*`)
 * добавляет свои строки, и слияние остаётся построчным.
 */
import { Module } from '@nestjs/common';

import { BlobModule } from '../../blob/blob.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DevicesModule } from '../devices/devices.module';

import { DowngradeArchiveController } from './downgrade-archive.controller';
import { DowngradeArchiveService } from './downgrade-archive.service';
import { DowngradeArchiveStore } from './downgrade-archive.store';

@Module({
  imports: [
    PrismaModule,
    DevicesModule,
    BlobModule,
  ],
  controllers: [
    DowngradeArchiveController,
  ],
  providers: [
    DowngradeArchiveStore,
    DowngradeArchiveService,
  ],
  exports: [
    DowngradeArchiveStore,
    DowngradeArchiveService,
  ],
})
export class DowngradeArchiveModule {}

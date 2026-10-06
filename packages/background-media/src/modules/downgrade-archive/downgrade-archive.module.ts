/**
 * Модуль архива понижения (#2587 блок b2, ADR-0031).
 *
 * В b2 — только хранилище. Двери (preview / freeze / restore) и провод в `AppModule` — блок b3 по
 * ратифицированному плану: модуль без контроллера в сборку не включается намеренно, чтобы в стволе
 * не жила дверь без сторожа.
 */
import { Module } from '@nestjs/common';

import { BlobModule } from '../../blob/blob.module';
import { PrismaModule } from '../../prisma/prisma.module';

import { DowngradeArchivePurgeController } from './downgrade-archive-purge.controller';
import { DowngradeArchivePurgeService } from './downgrade-archive-purge.service';
import { DowngradeArchiveStore } from './downgrade-archive.store';

@Module({
  // #2588 b5: уборка по сроку — BlobModule ради удаления файлов, своя дверь purge-expired под ApiTokenGuard.
  imports: [PrismaModule, BlobModule],
  controllers: [DowngradeArchivePurgeController],
  providers: [DowngradeArchiveStore, DowngradeArchivePurgeService],
  exports: [DowngradeArchiveStore],
})
export class DowngradeArchiveModule {}

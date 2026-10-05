/**
 * Модуль архива понижения (#2587 блок b2, ADR-0031).
 *
 * В b2 — только хранилище. Двери (preview / freeze / restore) и провод в `AppModule` — блок b3 по
 * ратифицированному плану: модуль без контроллера в сборку не включается намеренно, чтобы в стволе
 * не жила дверь без сторожа.
 */
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { DowngradeArchiveStore } from './downgrade-archive.store';

@Module({
  imports: [PrismaModule],
  providers: [DowngradeArchiveStore],
  exports: [DowngradeArchiveStore],
})
export class DowngradeArchiveModule {}

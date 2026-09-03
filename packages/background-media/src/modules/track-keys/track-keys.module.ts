/**
 * Модуль ключей треков (#2271).
 *
 * Блок `key-ttl` коворка модуля не заводил намеренно: он строился в изоляции и не имел права
 * трогать точки сборки. Модуль появляется здесь, на интеграции двери, — и это ровно тот
 * «носитель вместо обещания», о котором говорит разбор резки.
 */
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { PrismaTrackKeyStore, PrismaTrackKeyTtlSettingsStore } from './prisma-track-key.store';
import { TrackKeyTtlController } from './track-key-ttl.controller';
import { TrackKeyTtlSettingsService } from './track-key-ttl.settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [TrackKeyTtlController],
  providers: [PrismaTrackKeyStore, PrismaTrackKeyTtlSettingsStore, TrackKeyTtlSettingsService],
  exports: [PrismaTrackKeyStore, PrismaTrackKeyTtlSettingsStore],
})
export class TrackKeysModule {}

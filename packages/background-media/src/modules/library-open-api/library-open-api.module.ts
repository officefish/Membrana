/**
 * Модуль двери открытого API (#2271).
 *
 * ЭТО И ЕСТЬ ТОТ НОСИТЕЛЬ, КОТОРОГО НЕ БЫЛО В РЕЗКЕ КОВОРКА. При нарезке дверь записали как
 * «строки сборки вносит координатор» — и слово занизило её размер до строк. На деле у неё своё
 * поведение: порядок проверок, коды отказа, заголовки связки ключей, монтирование. Модуль
 * назван здесь явно, чтобы следующий читатель видел носителя, а не обещание.
 */
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SamplesModule } from '../samples/samples.module';
import { TrackKeysModule } from '../track-keys/track-keys.module';
import { TrackKeyGenerator } from '../track-keys/track-key.generator';
import { PrismaTrackKeyStore, PrismaTrackKeyTtlSettingsStore } from '../track-keys/prisma-track-key.store';

import { LibraryOpenApiController } from './library-open-api.controller';
import { LibraryOpenApiService } from './library-open-api.service';
import { NoStoreInterceptor } from './no-store.interceptor';

/** Базовый адрес ссылок. Развёртывание — не забота ни одного блока коворка. */
export const OPEN_API_BASE_URL = 'OPEN_API_BASE_URL';

@Module({
  imports: [PrismaModule, SamplesModule, TrackKeysModule],
  controllers: [LibraryOpenApiController],
  providers: [
    LibraryOpenApiService,
    NoStoreInterceptor,
    {
      provide: OPEN_API_BASE_URL,
      useFactory: () => process.env.OPEN_API_BASE_URL ?? 'http://localhost:3000/v1/open/tracks',
    },
    {
      // Генератор собирается ЗДЕСЬ, потому что только здесь известны оба хранилища и часы.
      // Блок `key-ttl` намеренно не тянул Prisma в изоляции — его порт остаётся чистым.
      provide: TrackKeyGenerator,
      inject: [PrismaTrackKeyStore, PrismaTrackKeyTtlSettingsStore],
      useFactory: (keys: PrismaTrackKeyStore, settings: PrismaTrackKeyTtlSettingsStore) =>
        new TrackKeyGenerator({ keys, settings, now: () => new Date() }),
    },
  ],
  exports: [LibraryOpenApiService],
})
export class LibraryOpenApiModule {}

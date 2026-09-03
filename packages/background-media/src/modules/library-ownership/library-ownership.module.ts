/**
 * Модуль оси владения.
 *
 * Провайдер читателя вносится СНАРУЖИ (`withReader`): в изолированной фазе блок не тянет
 * `PrismaModule` и вообще ничего, кроме себя. Строку подключения в `app.module.ts` вносит
 * координатор на интеграции — этот файл её не трогает.
 *
 * Ожидаемая сборка на интеграции:
 *
 *   LibraryOwnershipModule.withReader({
 *     provide: OWNERSHIP_SAMPLE_READER,
 *     inject: [PrismaService],
 *     useFactory: (prisma: OwnershipPrismaLike) => new PrismaOwnershipSampleReader(prisma),
 *   })
 */

import { Module, type DynamicModule, type Provider } from '@nestjs/common';

import { LibraryOwnershipService } from './library-ownership.service';

@Module({})
export class LibraryOwnershipModule {
  /** `readerProvider` обязан отдавать `OwnershipSampleReader` по токену `OWNERSHIP_SAMPLE_READER`. */
  static withReader(readerProvider: Provider): DynamicModule {
    return {
      module: LibraryOwnershipModule,
      providers: [readerProvider, LibraryOwnershipService],
      exports: [LibraryOwnershipService],
    };
  }
}

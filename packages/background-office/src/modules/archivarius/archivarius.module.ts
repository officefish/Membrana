import { Module } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { ArchivariusController } from './archivarius.controller';
import { MemoryArchivariusStore } from './archivarius.memory-store';
import { MongoArchivariusStore } from './archivarius.mongo-store';
import { ARCHIVARIUS_STORE, ArchivariusService } from './archivarius.service';

@Module({
  controllers: [ArchivariusController],
  providers: [
    MemoryArchivariusStore,
    MongoArchivariusStore,
    ArchivariusService,
    {
      provide: ARCHIVARIUS_STORE,
      inject: [APP_CONFIG, MemoryArchivariusStore, MongoArchivariusStore],
      useFactory: (
        config: AppConfig,
        memoryStore: MemoryArchivariusStore,
        mongoStore: MongoArchivariusStore,
      ) => (config.ARCHIVARIUS_MONGO_URI ? mongoStore : memoryStore),
    },
  ],
  exports: [ArchivariusService],
})
export class ArchivariusModule {}

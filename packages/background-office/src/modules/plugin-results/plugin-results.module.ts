import { Module } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { MemoryPluginResultsStore } from './plugin-results.memory-store';
import { MongoPluginResultsStore } from './plugin-results.mongo-store';
import { PLUGIN_RESULTS_STORE, PluginResultsService } from './plugin-results.service';

@Module({
  providers: [
    MemoryPluginResultsStore,
    MongoPluginResultsStore,
    PluginResultsService,
    {
      provide: PLUGIN_RESULTS_STORE,
      inject: [APP_CONFIG, MemoryPluginResultsStore, MongoPluginResultsStore],
      useFactory: (config: AppConfig, memoryStore: MemoryPluginResultsStore, mongoStore: MongoPluginResultsStore) =>
        config.ARCHIVARIUS_MONGO_URI ? mongoStore : memoryStore,
    },
  ],
  exports: [PluginResultsService],
})
export class PluginResultsModule {}

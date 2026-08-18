import { Module } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { MemoryPluginResultsStore } from './plugin-results.memory-store';
import { MongoPluginResultsStore } from './plugin-results.mongo-store';
import { PLUGIN_RESULTS_STORE, PluginResultsService } from './plugin-results.service';

@Module({
  providers: [
    PluginResultsService,
    {
      provide: PLUGIN_RESULTS_STORE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.ARCHIVARIUS_MONGO_URI ? new MongoPluginResultsStore(config) : new MemoryPluginResultsStore(),
    },
  ],
  exports: [PluginResultsService],
})
export class PluginResultsModule {}

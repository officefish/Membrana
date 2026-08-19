import { Logger, Module } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { PluginResultsController } from './plugin-results.controller';
import { MemoryPluginResultsStore } from './plugin-results.memory-store';
import { MongoPluginResultsStore } from './plugin-results.mongo-store';
import { PLUGIN_RESULTS_STORE, PluginResultsService } from './plugin-results.service';

@Module({
  controllers: [PluginResultsController],
  providers: [
    PluginResultsService,
    {
      provide: PLUGIN_RESULTS_STORE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        if (config.PLUGIN_RESULTS_MONGO_URI || config.ARCHIVARIUS_MONGO_URI) return new MongoPluginResultsStore(config);
        Logger.warn('PLUGIN_RESULTS: no Mongo URI, using volatile memory store', PluginResultsModule.name);
        return new MemoryPluginResultsStore();
      },
    },
  ],
  exports: [PluginResultsService],
})
export class PluginResultsModule {}
// Writes enter through PluginResultsService: in-process callers and the media → office bridge
// (PluginResultsController, блок b2 спринта plugin-results-bridge, #1961).

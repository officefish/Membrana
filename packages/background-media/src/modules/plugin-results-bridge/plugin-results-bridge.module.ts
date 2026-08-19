import { Module } from '@nestjs/common';

import { PluginResultsBridgeService } from './plugin-results-bridge.service';

/** Мост media → office для результатов плагинов (b3, #1961). Потребитель — сид `onResult` в CollectionsModule. */
@Module({
  providers: [PluginResultsBridgeService],
  exports: [PluginResultsBridgeService],
})
export class PluginResultsBridgeModule {}

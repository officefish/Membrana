import { Module } from '@nestjs/common';

import { PanelAuthModule } from '../panel-auth/panel-auth.module';
import { LlmProcedureController, LlmUsageController } from './llm-channels.controller';
import { LlmChannelsService } from './llm-channels.service';
import { LlmProcedureOverlayStore } from './llm-procedure-overlay.store';
import { LlmUsageStore } from './llm-usage.store';

@Module({
  imports: [PanelAuthModule],
  controllers: [LlmProcedureController, LlmUsageController],
  providers: [LlmChannelsService, LlmProcedureOverlayStore, LlmUsageStore],
  exports: [LlmChannelsService],
})
export class LlmChannelsModule {}

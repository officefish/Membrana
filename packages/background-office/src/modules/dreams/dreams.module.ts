import { Module } from '@nestjs/common';

import { DeepSeekModule } from '../deepseek/deepseek.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { DreamsController } from './dreams.controller';
import { DreamsScheduler } from './dreams.scheduler';
import { DreamsService } from './dreams.service';

@Module({
  imports: [DeepSeekModule, OpenRouterModule],
  controllers: [DreamsController],
  providers: [DreamsService, DreamsScheduler],
  exports: [DreamsService],
})
export class DreamsModule {}

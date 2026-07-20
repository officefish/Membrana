import { Module } from '@nestjs/common';

import { DeepSeekModule } from '../deepseek/deepseek.module';
import { DreamsController } from './dreams.controller';
import { DreamsScheduler } from './dreams.scheduler';
import { DreamsService } from './dreams.service';

@Module({
  imports: [DeepSeekModule],
  controllers: [DreamsController],
  providers: [DreamsService, DreamsScheduler],
  exports: [DreamsService],
})
export class DreamsModule {}

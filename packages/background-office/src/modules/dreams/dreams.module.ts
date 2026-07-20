import { Module } from '@nestjs/common';

import { DreamsController } from './dreams.controller';
import { DreamsScheduler } from './dreams.scheduler';
import { DreamsService } from './dreams.service';

@Module({
  controllers: [DreamsController],
  providers: [DreamsService, DreamsScheduler],
  exports: [DreamsService],
})
export class DreamsModule {}

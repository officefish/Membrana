import { Module } from '@nestjs/common';

import { DriftAnchorController } from './drift-anchor.controller';
import { DriftAnchorService } from './drift-anchor.service';

@Module({
  controllers: [DriftAnchorController],
  providers: [DriftAnchorService],
})
export class DriftAnchorModule {}

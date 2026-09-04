import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaBridgeService } from './media-bridge.service';
import { MembraneContextFanoutService } from './membrane-context-fanout.service';
import { PairController } from './pair.controller';
import { PairService } from './pair.service';

@Module({
  imports: [AuthModule],
  controllers: [PairController],
  providers: [PairService, MediaBridgeService, MembraneContextFanoutService],
  exports: [MediaBridgeService, MembraneContextFanoutService],
})
export class PairModule {}

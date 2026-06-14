import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaBridgeService } from './media-bridge.service';
import { PairController } from './pair.controller';
import { PairService } from './pair.service';

@Module({
  imports: [AuthModule],
  controllers: [PairController],
  providers: [PairService, MediaBridgeService],
  exports: [MediaBridgeService],
})
export class PairModule {}

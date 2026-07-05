import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NodeRealtimeModule } from '../node-realtime/node-realtime.module';
import { NodeLivenessController } from './node-liveness.controller';
import { NodeLinkStateService } from './node-liveness.service';

@Module({
  imports: [AuthModule, NodeRealtimeModule],
  controllers: [NodeLivenessController],
  providers: [NodeLinkStateService],
  exports: [NodeLinkStateService],
})
export class NodeLivenessModule {}

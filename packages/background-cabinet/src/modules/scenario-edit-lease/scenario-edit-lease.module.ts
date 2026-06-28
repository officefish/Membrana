import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NodeRealtimeModule } from '../node-realtime/node-realtime.module';
import { ScenarioEditLeaseController } from './scenario-edit-lease.controller';
import { ScenarioEditLeaseService } from './scenario-edit-lease.service';

@Module({
  imports: [AuthModule, NodeRealtimeModule],
  controllers: [ScenarioEditLeaseController],
  providers: [ScenarioEditLeaseService],
  exports: [ScenarioEditLeaseService],
})
export class ScenarioEditLeaseModule {}

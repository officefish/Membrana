import { Module } from '@nestjs/common';
import { MembraneController } from './membrane.controller';
import { MembraneService } from './membrane.service';
import { AuthModule } from '../auth/auth.module';
import { NodeRealtimeModule } from '../node-realtime/node-realtime.module';

@Module({
  imports: [AuthModule, NodeRealtimeModule],
  controllers: [MembraneController],
  providers: [MembraneService],
  exports: [MembraneService],
})
export class MembraneModule {}

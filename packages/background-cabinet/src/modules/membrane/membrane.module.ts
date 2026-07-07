import { Module } from '@nestjs/common';
import { MembraneController } from './membrane.controller';
import { MembraneService } from './membrane.service';
import { AuthModule } from '../auth/auth.module';
import { NodeRealtimeModule } from '../node-realtime/node-realtime.module';
import { DeviceCaptureModule } from '../device-capture/device-capture.module';

@Module({
  // PL4: DeviceCaptureModule — для форс-release захвата при отзыве/удалении ключа.
  imports: [AuthModule, NodeRealtimeModule, DeviceCaptureModule],
  controllers: [MembraneController],
  providers: [MembraneService],
  exports: [MembraneService],
})
export class MembraneModule {}

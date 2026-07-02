import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NodeRealtimeModule } from '../node-realtime/node-realtime.module';
import { DeviceCaptureController } from './device-capture.controller';
import { DeviceCaptureService } from './device-capture.service';

@Module({
  imports: [AuthModule, NodeRealtimeModule],
  controllers: [DeviceCaptureController],
  providers: [DeviceCaptureService],
  exports: [DeviceCaptureService],
})
export class DeviceCaptureModule {}

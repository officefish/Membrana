import { Module } from '@nestjs/common';
import { DeviceGuard } from '../../common/guards/device.guard';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DeviceGuard],
  exports: [DevicesService, DeviceGuard],
})
export class DevicesModule {}

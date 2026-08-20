import { Module } from '@nestjs/common';
import { DeviceGuard } from '../../common/guards/device.guard';
import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';
import { NodeKeyService } from '../firebat-node/node-key.service';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DeviceGuard, MediaDeviceAccessGuard, NodeKeyService],
  exports: [DevicesService, DeviceGuard, MediaDeviceAccessGuard, NodeKeyService],
})
export class DevicesModule {}

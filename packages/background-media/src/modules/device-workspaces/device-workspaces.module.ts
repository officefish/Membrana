import { Module } from '@nestjs/common';
import { DevicesModule } from '../devices/devices.module';
import { DeviceWorkspacesController } from './device-workspaces.controller';
import { DeviceWorkspacesService } from './device-workspaces.service';

@Module({
  imports: [DevicesModule],
  controllers: [DeviceWorkspacesController],
  providers: [DeviceWorkspacesService],
  exports: [DeviceWorkspacesService],
})
export class DeviceWorkspacesModule {}

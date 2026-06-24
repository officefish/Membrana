import { Module } from '@nestjs/common';
import { DeviceWorkspacesController } from './device-workspaces.controller';
import { DeviceWorkspacesService } from './device-workspaces.service';

@Module({
  controllers: [DeviceWorkspacesController],
  providers: [DeviceWorkspacesService],
  exports: [DeviceWorkspacesService],
})
export class DeviceWorkspacesModule {}

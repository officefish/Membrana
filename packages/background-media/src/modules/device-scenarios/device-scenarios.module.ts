import { Module } from '@nestjs/common';

import { DevicesModule } from '../devices/devices.module';
import { DeviceScenariosController } from './device-scenarios.controller';
import { DeviceScenariosService } from './device-scenarios.service';

@Module({
  imports: [DevicesModule],
  controllers: [DeviceScenariosController],
  providers: [DeviceScenariosService],
  exports: [DeviceScenariosService],
})
export class DeviceScenariosModule {}

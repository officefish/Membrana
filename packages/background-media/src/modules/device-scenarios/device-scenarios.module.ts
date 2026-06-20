import { Module } from '@nestjs/common';

import { DeviceScenariosController } from './device-scenarios.controller';
import { DeviceScenariosService } from './device-scenarios.service';

@Module({
  controllers: [DeviceScenariosController],
  providers: [DeviceScenariosService],
  exports: [DeviceScenariosService],
})
export class DeviceScenariosModule {}

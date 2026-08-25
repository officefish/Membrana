import { Module } from '@nestjs/common';

import { DeployPreflightController } from './deploy-preflight.controller';
import { DeployPreflightService } from './deploy-preflight.service';

@Module({
  controllers: [DeployPreflightController],
  providers: [DeployPreflightService],
})
export class DeployPreflightModule {}

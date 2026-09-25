import { Module } from '@nestjs/common';

import { OfficeRegistrationBridgeService } from './office-registration-bridge.service';

@Module({
  providers: [OfficeRegistrationBridgeService],
  exports: [OfficeRegistrationBridgeService],
})
export class OfficeRegistrationModule {}

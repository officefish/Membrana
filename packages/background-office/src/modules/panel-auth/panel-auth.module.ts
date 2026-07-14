import { Module } from '@nestjs/common';

import { PanelAuthController } from './panel-auth.controller';
import { PanelAuthGuard } from './panel-auth.guard';
import { PanelAuthService } from './panel-auth.service';

@Module({
  controllers: [PanelAuthController],
  providers: [PanelAuthService, PanelAuthGuard],
  exports: [PanelAuthService, PanelAuthGuard],
})
export class PanelAuthModule {}

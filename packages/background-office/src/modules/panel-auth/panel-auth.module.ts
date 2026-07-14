import { Module } from '@nestjs/common';

import { PanelUsersStoreModule } from '../panel-users/panel-users.store.module';
import { PanelAuthController } from './panel-auth.controller';
import { PanelAuthGuard } from './panel-auth.guard';
import { PanelAuthService } from './panel-auth.service';

@Module({
  // Store нужен /me для сверки permVersion-эпохи партнёра (PU1, ADR 0005).
  imports: [PanelUsersStoreModule],
  controllers: [PanelAuthController],
  providers: [PanelAuthService, PanelAuthGuard],
  exports: [PanelAuthService, PanelAuthGuard],
})
export class PanelAuthModule {}

import { Module } from '@nestjs/common';

import { PanelAuthModule } from '../panel-auth/panel-auth.module';
import { PanelUsersInternalController } from './panel-users-internal.controller';
import { PanelUsersController } from './panel-users.controller';
import { PanelUsersStoreModule } from './panel-users.store.module';

@Module({
  imports: [PanelAuthModule, PanelUsersStoreModule],
  controllers: [PanelUsersController, PanelUsersInternalController],
})
export class PanelUsersModule {}

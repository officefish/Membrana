import { Module } from '@nestjs/common';

import { CabinetUsersModule } from '../cabinet-users/cabinet-users.module';
import { PanelAuthModule } from '../panel-auth/panel-auth.module';
import { PanelUsersInternalController } from './panel-users-internal.controller';
import { PanelUsersController } from './panel-users.controller';
import { PanelUsersStoreModule } from './panel-users.store.module';

@Module({
  // #2588 b3: вторая таблица раздела «Пользователи» — пользователи кабинета через дверь кабинета.
  imports: [PanelAuthModule, PanelUsersStoreModule, CabinetUsersModule],
  controllers: [PanelUsersController, PanelUsersInternalController],
})
export class PanelUsersModule {}

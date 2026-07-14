import { Module } from '@nestjs/common';

import { PanelUsersStore } from './panel-users.store';

/**
 * Отдельный модуль store (PU1): его импортируют И PanelAuthModule (/me сверяет
 * эпоху), И PanelUsersModule (register/admin) — без цикла между ними.
 */
@Module({
  providers: [PanelUsersStore],
  exports: [PanelUsersStore],
})
export class PanelUsersStoreModule {}

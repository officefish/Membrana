import { Module } from '@nestjs/common';

import { PanelAuthModule } from '../panel-auth/panel-auth.module';
import { CabinetUsersClient } from './cabinet-users.client';
import { CabinetUsersController } from './cabinet-users.controller';

/**
 * Модуль ручек «Пользователи кабинета» (#2588 b3). Подключается из `PanelUsersModule` — раздел
 * «Пользователи» панели один, у него две таблицы: партнёры панели (store office) и пользователи
 * кабинета (дверь кабинета). `PanelAuthModule` даёт охрану; `AppConfigModule` глобален.
 * Подменный транспорт `CABINET_FETCH` здесь не провайдится: в графе приложения клиент берёт
 * прокси-обвязку из `lib/proxy-fetch` сам (`@Optional`).
 */
@Module({
  imports: [PanelAuthModule],
  controllers: [CabinetUsersController],
  providers: [CabinetUsersClient],
})
export class CabinetUsersModule {}

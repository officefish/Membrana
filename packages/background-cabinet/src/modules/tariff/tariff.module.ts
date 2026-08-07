import { Module } from '@nestjs/common';

import { TariffTransitionService } from './tariff-transition.service';

/**
 * Дом перехода тарифа. Контроллера в модуле НЕТ и это объявлено, а не забыто:
 * эндпойнт погашения — блок C, вынесенный из спринта `tariff-transition-wiring`
 * (окно короткое; и блок, объявляющий движок, не режется раньше блока,
 * рождающего его). Сервис уже вызываем из кода и зубов.
 */
@Module({
  providers: [TariffTransitionService],
  exports: [TariffTransitionService],
})
export class TariffModule {}

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MembraneModule } from '../membrane/membrane.module';
import { TariffController } from './tariff.controller';
import { TariffTransitionService } from './tariff-transition.service';

/**
 * Дом перехода тарифа. Контроллер погашения — блок b1 спринта
 * `tariff-promo-server-wiring` (#1761): блок C, вынесенный из
 * `tariff-transition-wiring`, доехал. AuthModule — для SessionGuard,
 * MembraneModule — публичная резолюция user → membrane тем же путём,
 * что `membranes/me`.
 */
@Module({
  imports: [AuthModule, MembraneModule],
  controllers: [TariffController],
  providers: [TariffTransitionService],
  exports: [TariffTransitionService],
})
export class TariffModule {}

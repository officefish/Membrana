import { Module } from '@nestjs/common';

import { ArchiveRetentionModule } from '../archive-retention/archive-retention.module';
import { AuthModule } from '../auth/auth.module';
import { MembraneModule } from '../membrane/membrane.module';
import { PairModule } from '../pair/pair.module';
import { PromoRedemptionRateLimiter } from './promo-redemption-rate-limit';
import { TariffCatalogService } from './tariff-catalog.service';
import { TariffController } from './tariff.controller';
import { TariffDowngradeService } from './tariff-downgrade.service';
import { TariffTransitionService } from './tariff-transition.service';

/**
 * Дом перехода тарифа. Контроллер погашения — блок b1 спринта
 * `tariff-promo-server-wiring` (#1761): блок C, вынесенный из
 * `tariff-transition-wiring`, доехал. AuthModule — для SessionGuard,
 * MembraneModule — публичная резолюция user → membrane тем же путём,
 * что `membranes/me`.
 *
 * PairModule (#2281) — за `MembraneContextFanoutService`: после смены тарифа новый предел надо
 * доставить приборам, а мост в media живёт там. Импортируем МОДУЛЬ, а не копируем провайдера:
 * копия дала бы второй мост со своей конфигурацией адреса media.
 */
@Module({
  // ArchiveRetentionModule (#2588 b1) — порт ARCHIVE_RETENTION_READER: срок хранения в приказ
  // заморозки едет снимком (#2587 b4, ADR-0031 п.4).
  imports: [AuthModule, MembraneModule, PairModule, ArchiveRetentionModule],
  controllers: [TariffController],
  providers: [PromoRedemptionRateLimiter, TariffTransitionService, TariffCatalogService, TariffDowngradeService],
  exports: [TariffTransitionService],
})
export class TariffModule {}

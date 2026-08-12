/**
 * HTTP-адаптер погашения промокода (блок b1 спринта `tariff-promo-server-wiring`,
 * магистраль #1761) — блок C, вынесенный из `tariff-transition-wiring`, доехал.
 *
 * Контроллер — ТОНКАЯ обёртка: правила перехода живут в домене, состояние читает
 * сервис; здесь только сессия, валидация формы кода и передача исхода как есть.
 *
 * **Статус-коды (разбор Ожегова 12.08).** Доменный отказ — НЕ транспортная ошибка:
 * успех и отказ из закрытого списка уезжают `200 { ok, ... }`, клиент читает
 * `reason`, а не HTTP-код. 4xx оставлены транспорту/контракту: 400 — невалидная
 * форма кода, 401 — нет сессии (гвард). Смешать домен с HTTP значило бы завести
 * второй словарь ошибок поверх закрытого списка домена.
 *
 * **Мембрана — из сессии, не из тела.** `membraneId`/`actorId` в DTO запрещены:
 * это подмена сессии телом. Резолюция user → membrane — публичным
 * `MembraneService.getOrCreateMembraneForUser`, тем же путём, что `membranes/me`.
 *
 * **Кода в логах нет** — промокод является секретом на предъявителя; контроллер
 * его не логирует вовсе (и сервис логирует только id мембраны).
 *
 * **Тело ответа = `TransitionOutcome` ДОСЛОВНО** (ревью Ожегова 12.08): доменный
 * исход и есть публичный HTTP-контракт ручки, транспортной DTO-обёртки нет
 * сознательно. Менять его форму — значит менять контракт клиента: через ADR.
 */
import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { MembraneService } from '../membrane/membrane.service';
import { TariffTransitionService, type TransitionOutcome } from './tariff-transition.service';

/** DTO погашения: РОВНО код. Всё остальное о попытке знает сессия и сервер. */
export interface RedeemPromoDto {
  code: string;
}

/**
 * Форма кода: 3–64 символа [A-Za-z0-9_-], без пробелов. Это граница ТРАНСПОРТА
 * (мусор не доезжает до базы), не правило домена: существует ли код — судит
 * сервис причиной `promo_unknown` из своего закрытого списка.
 */
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;

@Controller('v1')
@UseGuards(SessionGuard)
export class TariffController {
  constructor(
    private readonly membraneService: MembraneService,
    private readonly tariffTransition: TariffTransitionService,
  ) {}

  @Post('membranes/me/tariff/promo-redemptions')
  async redeemPromo(
    @Req() req: AuthenticatedRequest,
    @Body() body: RedeemPromoDto,
  ): Promise<TransitionOutcome> {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!CODE_RE.test(code)) {
      throw new BadRequestException(
        'promo code must be 3-64 characters of [A-Za-z0-9_-]',
      );
    }
    const userId = req.authUser!.id;
    const membrane = await this.membraneService.getOrCreateMembraneForUser(userId);
    return this.tariffTransition.redeemPromo({
      membraneId: membrane.id,
      code,
      actorId: userId,
    });
  }
}

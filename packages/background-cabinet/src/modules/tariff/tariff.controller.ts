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
import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { MembraneService } from '../membrane/membrane.service';
import {
  MembraneContextFanoutService,
  type MembraneContextFanoutResult,
} from '../pair/membrane-context-fanout.service';
import { PromoRedemptionRateLimiter } from './promo-redemption-rate-limit';
import { TariffCatalogService, type TariffCatalogView } from './tariff-catalog.service';
import { TariffTransitionService, type TransitionOutcome } from './tariff-transition.service';

/** DTO выбора тарифа: РОВНО цель. Мембрана и актор — из сессии, не из тела (см. шапку). */
export interface SelectTariffDto {
  toTariffId: string;
}

/**
 * Исход выбора тарифа = исход перехода ПЛЮС счёт разноски по приборам.
 *
 * Счёт добавлен к `TransitionOutcome`, а не влит в него: смена тарифа и доставка контекста —
 * разные события с разной судьбой. Смена либо состоялась, либо нет; разноска может состояться
 * частично, и это законно. Свести их в одно `ok` значило бы назвать успешную смену неудачей
 * из-за одного неотвечающего прибора.
 *
 * При отказе перехода разноски не было вовсе, и поля нет — отсутствие честнее нуля, который
 * читался бы как «пробовали, ни один не принял».
 */
export type SelectTariffResponse =
  | (Extract<TransitionOutcome, { ok: true }> & { contextSync: MembraneContextFanoutResult })
  | Extract<TransitionOutcome, { ok: false }>;

/**
 * Форма id тарифа: SKU сетки (`free-v1`, `observatory-v1`). Граница ТРАНСПОРТА — существует ли
 * такой тариф, судит домен причиной `unknown_target_tariff`, а не этот шаблон.
 */
const TARIFF_ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

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

function clientIpOf(req: AuthenticatedRequest): string | null {
  const forwarded = req.headers?.['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ip = typeof firstForwarded === 'string' ? firstForwarded.split(',')[0]?.trim() : req.ip;
  return ip || null;
}

@ApiTags('Tariffs')
@Controller('v1')
@UseGuards(SessionGuard)
export class TariffController {
  constructor(
    private readonly membraneService: MembraneService,
    private readonly tariffTransition: TariffTransitionService,
    private readonly tariffCatalog: TariffCatalogService,
    private readonly contextFanout: MembraneContextFanoutService,
    private readonly promoRateLimiter: PromoRedemptionRateLimiter,
  ) {}

  @Get('tariffs')
  @ApiOperation({ summary: 'List tariffs the authenticated user membrane can select' })
  async listTariffs(@Req() req: AuthenticatedRequest): Promise<TariffCatalogView> {
    const userId = req.authUser!.id;
    const membrane = await this.membraneService.getOrCreateMembraneForUser(userId);
    return this.tariffCatalog.listForMembrane(membrane.id);
  }

  /**
   * СМЕНА ТАРИФА СОБСТВЕННЫМ ВЫБОРОМ (#2281, слово владельца 04.09).
   *
   * Ручка знает о переходе ровно то же, что ручка промокода: сессия, форма цели, исход как есть.
   * Права решать здесь нет — ворота живут в `selfTransitionGate`, правила в домене.
   *
   * **Разноска идёт ПОСЛЕ успеха и только после него.** Отказ media смену не отменяет: тариф
   * сменён и записан в журнал. Наружу уезжает счёт, чтобы страница могла сказать правду
   * «обновлено N, не удалось M», а не молча показать новый тариф при старом пределе на приборе.
   */
  @Post('membranes/me/tariff')
  @ApiOperation({ summary: 'Switch the authenticated user membrane to another tariff' })
  async selectTariff(
    @Req() req: AuthenticatedRequest,
    @Body() body: SelectTariffDto,
  ): Promise<SelectTariffResponse> {
    const toTariffId = typeof body?.toTariffId === 'string' ? body.toTariffId.trim() : '';
    if (!TARIFF_ID_RE.test(toTariffId)) {
      throw new BadRequestException('toTariffId must be 2-64 characters of [a-z0-9-]');
    }
    const userId = req.authUser!.id;
    const membrane = await this.membraneService.getOrCreateMembraneForUser(userId);

    const outcome = await this.tariffTransition.selectTariff({
      membraneId: membrane.id,
      toTariffId,
      actorId: userId,
    });
    if (!outcome.ok) return outcome;

    const contextSync = await this.contextFanout.syncAllNodes(membrane.id);
    return { ...outcome, contextSync };
  }

  @Post('membranes/me/tariff/promo-redemptions')
  @ApiOperation({ summary: 'Redeem a tariff promo code for the authenticated user membrane' })
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
    this.promoRateLimiter.assertAllowed({ accountId: userId, ip: clientIpOf(req) });
    const membrane = await this.membraneService.getOrCreateMembraneForUser(userId);
    return this.tariffTransition.redeemPromo({
      membraneId: membrane.id,
      code,
      actorId: userId,
    });
  }
}

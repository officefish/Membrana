/**
 * Ручки панели «Пользователи кабинета» (#2588 b3) — тонкий прокси к двери кабинета (PR #2595).
 *
 * РОВНО ДВЕ, обе `@OwnerAdmin` (не-owner → 404, как всё admin-семейство панели):
 *   GET  /v1/panel/admin/cabinet-users?cursor&limit
 *   PUT  /v1/panel/admin/cabinet-users/:membraneId/archive-retention {days}
 *
 * Логики списка здесь НЕТ: страница и срок — ответ кабинета как есть. Исходы клиента переводятся
 * в HTTP своим кодом, а не 500: пара env не задана → 503 `cabinet_not_configured` с именами
 * недостающих переменных (значений нет); кабинет недоступен → 502 `cabinet_unreachable`; кабинет
 * отказал → его статус и его код (`invalid_retention_days` → 400, `membrane_not_found` → 404 …).
 * Актёр — `panelIdentity.sub` владельца; уезжает в кабинет как `updatedBy`.
 */
import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Param, Put, Query, Req, UseGuards } from '@nestjs/common';

import { OwnerAdmin } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard, type PanelRequest } from '../panel-auth/panel-auth.guard';
import { CabinetUsersClient, type CabinetOutcome } from './cabinet-users.client';

export const CABINET_USERS_ROUTE_PREFIX = 'v1/panel/admin/cabinet-users';

/** Коды отказа ручек панели — закрытый список; коды кабинета пробрасываются сверх него как есть. */
export const CABINET_USERS_PANEL_REFUSALS = ['cabinet_not_configured', 'cabinet_unreachable'] as const;

/** Исход клиента → данные или HttpException с кодом. Экспорт — ради зуба на каждый исход словаря. */
export function unwrapCabinetOutcome<T>(outcome: CabinetOutcome<T>): T {
  switch (outcome.kind) {
    case 'ok':
      return outcome.data;
    case 'cabinet-not-configured':
      throw new HttpException(
        { code: 'cabinet_not_configured', missing: [...outcome.missing], reason: 'кабинет не подключён: задайте пару env в office' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    case 'cabinet-unreachable':
      // Тело 502 — только код (ревью #2596 P1): detail сети остаётся в логе office, в браузер не едет.
      throw new HttpException({ code: 'cabinet_unreachable' }, HttpStatus.BAD_GATEWAY);
    case 'cabinet-rejected':
      throw new HttpException({ code: outcome.code ?? 'cabinet_rejected', status: outcome.status }, outcome.status);
    default: {
      const never: never = outcome;
      void never;
      throw new HttpException({ code: 'cabinet_unreachable' }, HttpStatus.BAD_GATEWAY);
    }
  }
}

@Controller(CABINET_USERS_ROUTE_PREFIX)
@UseGuards(PanelAuthGuard)
export class CabinetUsersController {
  constructor(private readonly client: CabinetUsersClient) {}

  @Get()
  @OwnerAdmin()
  async list(@Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    return unwrapCabinetOutcome(await this.client.listMembranes({ cursor, limit }));
  }

  @Put(':membraneId/archive-retention')
  @HttpCode(HttpStatus.OK)
  @OwnerAdmin()
  async setArchiveRetention(
    @Param('membraneId') membraneId: string,
    @Body() body: { days?: unknown },
    @Req() req: PanelRequest,
  ) {
    const actor = `panel:${req.panelIdentity?.sub ?? 'owner'}`;
    return unwrapCabinetOutcome(await this.client.setArchiveRetention(membraneId, body?.days, actor));
  }
}

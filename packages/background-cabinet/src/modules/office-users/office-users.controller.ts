/**
 * Служебная дверь кабинета для office (#2588 b2; ADR-0031 п.3, вердикт консилиума 05.10).
 *
 * РОВНО ДВА МАРШРУТА под `v1/internal/office/membranes` — зуб P13 держит список:
 *   GET  ?cursor&limit                       — страница мембран минимумом полей;
 *   PUT  :membraneId/archive-retention {days, actor} — срок архива понижения на мембрану.
 * Office НЕ получает admin-API кабинета; третий маршрут здесь — только новым ADR.
 *
 * Охрана — `OfficeTokenGuard` по отдельному ключу `CABINET_OFFICE_TOKEN` (не сессия, не
 * `API_INTERNAL_TOKEN`). Префикс `v1/internal/…` — как у двери office для кабинета (#2393).
 *
 * PUT отвечает 200 явно: клиент-office сверяет успех с 200, и 24.09 умолчание Nest «201 на
 * запись» уже стоило живой регистрации (прецедент двери #2393) — номер ответа — часть контракта.
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { OfficeTokenGuard } from '../../common/guards/office-token.guard';
import type { OfficeMembranesPage, SetArchiveRetentionDto, SetArchiveRetentionResult } from './office-users.dto';
import { OfficeUsersService } from './office-users.service';

export const OFFICE_USERS_ROUTE_PREFIX = 'v1/internal/office/membranes';

@ApiTags('Internal: office')
@Controller(OFFICE_USERS_ROUTE_PREFIX)
@UseGuards(OfficeTokenGuard)
export class OfficeUsersController {
  constructor(private readonly service: OfficeUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Office view of cabinet membranes: id, login as label, tariff, archive retention (no PII)' })
  list(@Query('cursor') cursor?: string, @Query('limit') limit?: string): Promise<OfficeMembranesPage> {
    return this.service.listMembranes(cursor, limit);
  }

  @Put(':membraneId/archive-retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the downgrade-archive retention (days) of a membrane; idempotent' })
  setArchiveRetention(
    @Param('membraneId') membraneId: string,
    @Body() body: SetArchiveRetentionDto,
  ): Promise<SetArchiveRetentionResult> {
    return this.service.setArchiveRetention(membraneId, body ?? {});
  }
}

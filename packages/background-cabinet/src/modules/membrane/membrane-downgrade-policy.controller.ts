/**
 * Двери настройки режима отбора при понижении (#2587 b4a): `GET`/`PUT /v1/membranes/me/downgrade-policy`.
 *
 * Отдельный контроллер, а не правки `membrane.controller.ts`: соседний блок правит тот файл
 * параллельно, а мембрана берётся тем же путём — из сессии через `MembraneService`.
 */
import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

import type { SetDowngradePolicyDto } from './membrane.dto';
import { MembraneDowngradePolicyService } from './membrane-downgrade-policy.service';
import { MembraneService } from './membrane.service';

/** Двери режима отбора при понижении для мембраны сессии (`GET`/`PUT membranes/me/downgrade-policy`). */
@ApiTags('Membranes')
@Controller('v1')
@UseGuards(SessionGuard)
export class MembraneDowngradePolicyController {
  constructor(
    private readonly membraneService: MembraneService,
    private readonly policy: MembraneDowngradePolicyService,
  ) {}

  @Get('membranes/me/downgrade-policy')
  @ApiOperation({ summary: 'Selection mode applied on tariff downgrade (loudness-over-floor | spectral-variety | drone-likeness); isDefault when never set' })
  async read(@Req() req: AuthenticatedRequest) {
    const membrane = await this.membraneService.getOrCreateMembraneForUser(req.authUser!.id);
    return this.policy.read(membrane.id);
  }

  @Put('membranes/me/downgrade-policy')
  @ApiOperation({ summary: 'Set the selection mode applied on tariff downgrade; 200 { ok:false, reason:"unknown_criterion" } outside the closed list' })
  async set(@Req() req: AuthenticatedRequest, @Body() body: SetDowngradePolicyDto) {
    const membrane = await this.membraneService.getOrCreateMembraneForUser(req.authUser!.id);
    return this.policy.set(membrane.id, body?.criterion);
  }
}

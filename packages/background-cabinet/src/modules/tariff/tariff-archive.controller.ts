/**
 * Двери возврата из архива понижения для мембраны сессии (#2619): `GET membranes/me/archive/batches`
 * и `POST membranes/me/archive/batches/:batchId/restore`.
 *
 * Тонкая обёртка, как у соседней двери тарифа: мембрана — из сессии, не из пути; доменный исход
 * (`ok` / `reason`) уезжает `200` как есть — клиент читает `reason`, а не HTTP-код. 400 — только
 * форма `batchId` (граница транспорта: мусор не доезжает до media).
 */
import { BadRequestException, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import { MembraneService } from '../membrane/membrane.service';

import { TariffArchiveService, type ArchiveNodeView, type ArchiveRestoreOutcome } from './tariff-archive.service';

/** id партии media — uuid. */
const BATCH_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Двери архива понижения мембраны сессии. */
@ApiTags('Tariffs')
@Controller('v1')
@UseGuards(SessionGuard)
export class TariffArchiveController {
  constructor(
    private readonly membraneService: MembraneService,
    private readonly archive: TariffArchiveService,
  ) {}

  @Get('membranes/me/archive/batches')
  @ApiOperation({ summary: 'Downgrade archive batches per node of the session membrane (expiresAt = deletion day); a node media did not answer is marked unavailable' })
  async batches(@Req() req: AuthenticatedRequest): Promise<{ readonly nodes: readonly ArchiveNodeView[] }> {
    const membrane = await this.membraneService.getOrCreateMembraneForUser(req.authUser!.id);
    return this.archive.list(membrane.id);
  }

  @Post('membranes/me/archive/batches/:batchId/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Return a whole downgrade-archive batch of the session membrane to the live buffer; media refusals (archive_expired, batch_not_frozen, insufficient_quota, batch_not_found) as is' })
  async restore(@Req() req: AuthenticatedRequest, @Param('batchId') batchId: string): Promise<ArchiveRestoreOutcome> {
    if (!BATCH_ID_RE.test(batchId ?? '')) throw new BadRequestException('batchId must be a uuid');
    const membrane = await this.membraneService.getOrCreateMembraneForUser(req.authUser!.id);
    return this.archive.restore(membrane.id, batchId);
  }
}

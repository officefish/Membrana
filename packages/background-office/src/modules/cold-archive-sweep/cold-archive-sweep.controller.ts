/**
 * Ручка панели «что удалил бы» (#2588 b6; вердикт Верстальщика консилиума 05.10: таблица
 * кандидатов без кнопки удаления в том же жесте).
 *
 * РОВНО ОДНА ручка, `@OwnerAdmin` (не-owner → 404): `GET /v1/panel/admin/cold-archive/sweep-preview`
 * → вызов media в dryRun и отчёт как есть. От флагов `COLD_ARCHIVE_SWEEP_*` НЕ зависит (решение
 * владельца 05.10: выключенный cron — тишина, а кнопка владельца остаётся). Боевой уборки из панели
 * нет — её делает только cron при явной паре флагов.
 *
 * Исходы клиента → HTTP своим кодом, не 500: 503 `media_not_configured`, 502 `media_unreachable`,
 * отказ media — его статус и код.
 */
import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';

import { OwnerAdmin } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import { ColdArchiveSweepClient, type SweepOutcome, type SweepReport } from './cold-archive-sweep.client';

export const SWEEP_PREVIEW_ROUTE_PREFIX = 'v1/panel/admin/cold-archive';

export function unwrapSweepOutcome(outcome: SweepOutcome): SweepReport {
  switch (outcome.kind) {
    case 'ok':
      return outcome.report;
    case 'media-not-configured':
      throw new HttpException({ code: 'media_not_configured', missing: [...outcome.missing] }, HttpStatus.SERVICE_UNAVAILABLE);
    case 'media-unreachable':
      // Тело 502 — только код: detail сети остаётся в логе office.
      throw new HttpException({ code: 'media_unreachable' }, HttpStatus.BAD_GATEWAY);
    case 'media-rejected':
      throw new HttpException({ code: outcome.code ?? 'media_rejected', status: outcome.status }, outcome.status);
    default: {
      const never: never = outcome;
      void never;
      throw new HttpException({ code: 'media_unreachable' }, HttpStatus.BAD_GATEWAY);
    }
  }
}

@Controller(SWEEP_PREVIEW_ROUTE_PREFIX)
@UseGuards(PanelAuthGuard)
export class ColdArchiveSweepController {
  constructor(private readonly client: ColdArchiveSweepClient) {}

  @Get('sweep-preview')
  @OwnerAdmin()
  async sweepPreview(): Promise<SweepReport> {
    // dryRun ЖЁСТКО true: эта ручка не умеет удалять, какие бы флаги ни стояли.
    return unwrapSweepOutcome(await this.client.purgeExpired(true));
  }
}

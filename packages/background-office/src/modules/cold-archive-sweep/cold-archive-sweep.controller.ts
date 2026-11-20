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
 *
 * #2632 g5a — прокси журнала уборщика, ТОЛЬКО ЧТЕНИЕ и только владельцу (`@OwnerAdmin`, не-owner → 404):
 * `GET purge-runs?limit`, `GET purge-runs/:id`, `GET purge-schedule?limit` (Т5), `GET purge-runs/:id/verify`
 * (Т4) → двери media g4a/g4b, ответ как есть (адресов файлов в нём нет). Кнопок удаления нет: боевую
 * уборку по-прежнему делает только cron. Превью теперь помечает свой прогон в журнале `trigger=panel`.
 */
import { Controller, Get, HttpException, HttpStatus, Inject, Param, Query, UseGuards } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { OwnerAdmin } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import { ColdArchiveSweepClient, type JournalOutcome, type SweepOutcome, type SweepReport } from './cold-archive-sweep.client';

export const SWEEP_PREVIEW_ROUTE_PREFIX = 'v1/panel/admin/cold-archive';

export function unwrapSweepOutcome(outcome: SweepOutcome): SweepReport {
  return outcome.kind === 'ok' ? outcome.report : refuse(outcome);
}

/** Исход чтения журнала → тело media как есть или HTTP-отказ тем же словарём, что у превью. */
export function unwrapJournalOutcome(outcome: JournalOutcome): unknown {
  return outcome.kind === 'ok' ? outcome.body : refuse(outcome);
}

function refuse(outcome: Exclude<SweepOutcome, { readonly kind: 'ok' }>): never {
  switch (outcome.kind) {
    case 'media-not-configured':
      throw new HttpException({ code: 'media_not_configured', missing: [...outcome.missing] }, HttpStatus.SERVICE_UNAVAILABLE);
    case 'media-unreachable':
      // Тело 502 — только код: detail сети остаётся в логе office.
      throw new HttpException({ code: 'media_unreachable' }, HttpStatus.BAD_GATEWAY);
    case 'media-rejected':
      // 5xx media — сбой соседа, не наш: 502, а не проброс 500 (DoD g5a). 4xx — статус и код media.
      if (outcome.status >= 500) throw new HttpException({ code: 'media_rejected', status: outcome.status }, HttpStatus.BAD_GATEWAY);
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
  constructor(
    @Inject(ColdArchiveSweepClient) private readonly client: ColdArchiveSweepClient,
    @Inject(APP_CONFIG) private readonly config: Pick<AppConfig, 'COLD_ARCHIVE_SWEEP_ENABLED' | 'COLD_ARCHIVE_SWEEP_DRY_RUN'>,
  ) {}

  @Get('sweep-preview')
  @OwnerAdmin()
  async sweepPreview(): Promise<SweepReport> {
    // dryRun ЖЁСТКО true: эта ручка не умеет удалять, какие бы флаги ни стояли. Флаги (g5b) только
    // читаются в снимок журнала — превью при выключенной уборке не выдаёт себя за «включено».
    const snapshot = { enabledSnapshot: this.config.COLD_ARCHIVE_SWEEP_ENABLED, dryRunSnapshot: this.config.COLD_ARCHIVE_SWEEP_DRY_RUN };
    return unwrapSweepOutcome(await this.client.purgeExpired(true, 'panel', snapshot));
  }

  @Get('purge-runs')
  @OwnerAdmin()
  async purgeRuns(@Query('limit') limit?: string): Promise<unknown> {
    return unwrapJournalOutcome(await this.client.runs(limit));
  }

  @Get('purge-runs/:id')
  @OwnerAdmin()
  async purgeRun(@Param('id') id: string): Promise<unknown> {
    return unwrapJournalOutcome(await this.client.run(id));
  }

  @Get('purge-runs/:id/verify')
  @OwnerAdmin()
  async purgeRunVerify(@Param('id') id: string): Promise<unknown> {
    return unwrapJournalOutcome(await this.client.verify(id));
  }

  @Get('purge-schedule')
  @OwnerAdmin()
  async purgeSchedule(@Query('limit') limit?: string): Promise<unknown> {
    return unwrapJournalOutcome(await this.client.schedule(limit));
  }
}

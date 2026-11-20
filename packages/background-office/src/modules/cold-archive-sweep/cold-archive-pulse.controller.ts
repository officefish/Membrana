/**
 * Ручка панели «пульс и режим уборщика» (#2632 g5b; Т1, Т6) — отдельным контроллером (перерезка v2, п.2).
 *
 * `GET v1/panel/admin/cold-archive/pulse`, `@OwnerAdmin` (не-owner → 404): режим по флагам office
 * (`disabled` / `dry-run` / `live`) и пульс (`disabled` / `ok` / `stale`) по двери media `purge-pulse`.
 * Флаги здесь ТОЛЬКО ЧИТАЮТСЯ. Выключено → media не вызывается (Т6). Отказы media — тем же словарём,
 * что у прокси журнала g5a: 503 / 502 / статус media, не 500.
 */
import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { OwnerAdmin } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import { readPulse, type PulseView } from './cold-archive-pulse';
import { ColdArchiveSweepClient } from './cold-archive-sweep.client';
import { SWEEP_PREVIEW_ROUTE_PREFIX, unwrapJournalOutcome } from './cold-archive-sweep.controller';
import { sweepModeOf } from './cold-archive-sweep.scheduler';

@Controller(SWEEP_PREVIEW_ROUTE_PREFIX)
@UseGuards(PanelAuthGuard)
export class ColdArchivePulseController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(ColdArchiveSweepClient) private readonly client: ColdArchiveSweepClient,
  ) {}

  @Get('pulse')
  @OwnerAdmin()
  async pulse(): Promise<PulseView> {
    const outcome = await readPulse(sweepModeOf(this.config), this.client, new Date());
    return outcome.kind === 'ok' ? outcome.view : (unwrapJournalOutcome(outcome) as never);
  }
}

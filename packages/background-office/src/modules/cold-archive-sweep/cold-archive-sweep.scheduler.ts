/**
 * Ежечасный пусковик уборки холодного архива (#2588 b6; ADR-0031 п.4; решения владельца 05.10).
 *
 * ДВА ФЛАГА, И ВЫКЛЮЧЕННЫЙ ЗНАЧИТ ТИШИНУ. `COLD_ARCHIVE_SWEEP_ENABLED` выключен (умолчание) →
 * media не зовём вовсе; одна строка в лог на старте процесса, не каждый час. Включён →
 * каждый час `POST purge-expired`. `COLD_ARCHIVE_SWEEP_DRY_RUN` включён (умолчание) → в теле
 * `dryRun:true`, в лог — число кандидатов и байты; боевая уборка — ТОЛЬКО при ENABLED=true и
 * DRY_RUN=false, оба явно. Отказ media на тике — строка в лог, исключение наружу не летит,
 * следующий час пробует снова; отказ office = архив живёт ДОЛЬШЕ, не короче (безопасная сторона).
 *
 * Расписание `0 * * * *` UTC — образец `dreams.scheduler.ts`; погрешность ≤ 1 ч на сроке «1 день»
 * — объявлена в плане. В логах — только числа и id партий, ни адресов, ни токена.
 */
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { ColdArchiveSweepClient, type SweepOutcome } from './cold-archive-sweep.client';

export const SWEEP_CRON = '0 * * * *';

export type SweepMode = 'disabled' | 'dry-run' | 'live';

/** Режим тика по двум флагам — чистая функция, тестируется таблицей. */
export function sweepModeOf(config: Pick<AppConfig, 'COLD_ARCHIVE_SWEEP_ENABLED' | 'COLD_ARCHIVE_SWEEP_DRY_RUN'>): SweepMode {
  if (!config.COLD_ARCHIVE_SWEEP_ENABLED) return 'disabled';
  return config.COLD_ARCHIVE_SWEEP_DRY_RUN ? 'dry-run' : 'live';
}

/** Сводка исхода для лога — числа и id, без адресов. */
export function summarizeOutcome(outcome: SweepOutcome): Record<string, unknown> {
  if (outcome.kind !== 'ok') return { outcome: outcome.kind, ...('status' in outcome ? { status: outcome.status, code: outcome.code } : {}), ...('detail' in outcome ? { detail: outcome.detail } : {}) };
  const { report } = outcome;
  return {
    outcome: 'ok',
    dryRun: report.dryRun,
    candidates: report.candidates.length,
    frozenBytes: report.candidates.reduce((sum, c) => sum + (Number.isFinite(c.frozenBytes) ? c.frozenBytes : 0), 0),
    purged: report.purged.length,
    purgedIds: report.purged,
    refusal: report.refusal?.reason ?? null,
  };
}

@Injectable()
export class ColdArchiveSweepScheduler implements OnModuleInit {
  private readonly logger = new Logger(ColdArchiveSweepScheduler.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(ColdArchiveSweepClient) private readonly client: ColdArchiveSweepClient,
  ) {}

  mode(): SweepMode {
    return sweepModeOf(this.config);
  }

  /** Одна строка на старте: выключено — тишина до смены env; включено — каким режимом. */
  onModuleInit(): void {
    const mode = this.mode();
    if (mode === 'disabled') {
      this.logger.log('cold-archive sweep: выключена (COLD_ARCHIVE_SWEEP_ENABLED off) — media не вызывается');
      return;
    }
    this.logger.log({ mode, cron: SWEEP_CRON }, 'cold-archive sweep: включена');
  }

  @Cron(SWEEP_CRON, { name: 'cold-archive-sweep-hourly', timeZone: 'UTC' })
  async hourly(): Promise<void> {
    await this.tick();
  }

  /** Тик без расписания — для зубов и ручного вызова. Выключено → ни одного вызова media. */
  async tick(): Promise<SweepOutcome | null> {
    const mode = this.mode();
    if (mode === 'disabled') return null;
    const dryRun = mode === 'dry-run';
    let outcome: SweepOutcome;
    try {
      outcome = await this.client.purgeExpired(dryRun);
    } catch (error) {
      // Клиент исходов не бросает; это сторож от будущих правок — тик cron падать не должен.
      this.logger.error({ dryRun, error: error instanceof Error ? error.name : 'unknown' }, 'cold-archive sweep: tick failed');
      return null;
    }
    const summary = summarizeOutcome(outcome);
    if (outcome.kind === 'ok') this.logger.log(summary, dryRun ? 'cold-archive sweep: dry-run' : 'cold-archive sweep: purged');
    else this.logger.warn(summary, 'cold-archive sweep: media did not answer ok — retry next hour');
    return outcome;
  }
}

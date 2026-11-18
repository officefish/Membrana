/**
 * Уборка холодного архива понижения по сроку (#2588 b5; ADR-0031 п.4) — с #2632 g3b через журнал.
 *
 * Дверь `purge-expired` (b5) и её отчёт для пусковика office (b6) не меняются по форме: те же
 * `candidates[]`, `purged[]`/`purgedIds[]`, `refused[]`, `blobs`, `refusal`; добавлен `runId` —
 * ссылка на прогон журнала (`ColdArchivePurgeRun`). Сама работа — `PurgeGcRunner`: снимок путей в
 * задание → `markPurged` → удаление с доказательством (g2) → итог по политике g3a.
 *
 * `dryRun:true` — по-прежнему ни `markPurged`, ни rm; но прогон и задания со снимком путей теперь
 * пишутся (вердикт 5: пустой и сухой прогон — тоже строка).
 */
import { Injectable } from '@nestjs/common';

import type { ArchiveRefusal, PurgeCandidate } from './downgrade-archive.store';
import { PurgeGcRunner, type PurgeRunOptions } from './purge-gc.runner';

export { frozenBytesOf } from './purge-gc.runner';

export interface PurgeRefused {
  readonly batchId: string;
  readonly refusal: ArchiveRefusal;
}

/** Отказ всей операции: словарь архива или `purge_run_in_progress` (второй параллельный live-пуск). */
export interface PurgeReportRefusal {
  readonly reason: ArchiveRefusal['reason'] | 'purge_run_in_progress';
  readonly detail: string;
}

/** Отчёт двери — форма, которую читает пусковик office (b6, `SweepReport`): `candidates[]`, `purged[]`, `refusal`. */
export interface PurgeReport {
  readonly dryRun: boolean;
  readonly now: Date;
  /** Прогон журнала; `null` — прогон не открыт (отказ `purge_run_in_progress`). */
  readonly runId: string | null;
  readonly candidates: readonly PurgeCandidate[];
  /** Сумма байт кандидатов — «сколько освободил бы / освободил». */
  readonly frozenBytes: number;
  /** Партии, переведённые в `deleted` этим вызовом (dryRun — всегда пусто). */
  readonly purged: readonly string[];
  /** То же, что `purged`, под именем контракта b6. */
  readonly purgedIds: readonly string[];
  /** Партии, которые были кандидатами, но `markPurged` их не взял (вернули/не истекли между чтением и записью). */
  readonly refused: readonly PurgeRefused[];
  /** Пути: сняты (`removed`/`already_absent`) и не сняты (`failed` — долг задания, партия при этом уже `deleted`). */
  readonly blobs: { readonly deleted: number; readonly failed: number };
  readonly refusal: PurgeReportRefusal | null;
}

@Injectable()
export class DowngradeArchivePurgeService {
  constructor(private readonly runner: PurgeGcRunner) {}

  async purgeExpired(now: Date, options: PurgeRunOptions): Promise<PurgeReport> {
    return this.runner.run(now, options);
  }
}

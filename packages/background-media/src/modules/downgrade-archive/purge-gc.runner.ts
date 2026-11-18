/**
 * Исполнитель уборки холодного архива с журналом (#2632 блок g3b; консилиум archive-gc-journal-2026-10-08,
 * вердикты 2, 4, 5, 6). Оборачивает прежнюю уборку b5: кандидаты — тот же предикат хранилища
 * архива (`purgeExpired` с `dryRun`), строки — тот же `markPurged`; новое — журнал и доказательство.
 *
 * ПОРЯДОК ПО ПАРТИИ (вердикт 6): снимок путей в задание → `markPurged` (строки и `deleted` одной
 * транзакцией) → `removeWithProof` по каждому пути → итог задания от политики g3a. Снимок пишется
 * ДО удаления строк: после `markPurged` адресов уже негде взять, а рестарт посреди партии оставляет
 * задание со снимком — долг не теряется.
 *
 * ДОЛГ ПЕРЕД НОВЫМ. Live-прогон сначала берёт годные к захвату задания прошлых прогонов (`retry` по
 * сроку, `pending` и `claimed` с истёкшим лизом оборванного прогона), потом новые партии. Повтор
 * задания удаляет заново все пути снимка — уже снятые дают `already_absent` (g2). Если партия уже
 * `deleted` (рестарт после `markPurged`), файлы добираются; если её вернули — файлы не трогаются.
 *
 * ОДИН АКТИВНЫЙ LIVE-ПРОГОН — замок процесса: второй параллельный live-пуск получает отказ
 * `purge_run_in_progress`, прогона не открывает. Media — один процесс (замок одного процесса, как у
 * двери cabinet-register); при репликах нужен замок БД — долг к ADR о репликах. Оборванные рестартом
 * `running` помечаются `abandoned` на старте прогона, когда в процессе нет другого активного.
 *
 * DRY-RUN ПЕРСИСТИТ ПРОГОН: прогон и задания со снимком путей пишутся, `markPurged` и rm — нет;
 * задания dry-run закрываются сразу и live-прогоном не подбираются. Флаги office (ENABLED / DRY_RUN)
 * здесь не читаются: решение «будить ли и в каком режиме» остаётся за пусковиком office.
 */
import { Injectable, Logger } from '@nestjs/common';

import { BlobStorageService } from '../../blob/blob-storage.service';
import type { BlobRemovalOutcome } from '../../blob/blob-removal-proof';
import { PrismaService } from '../../prisma/prisma.service';

import type { PurgeRefused, PurgeReport } from './downgrade-archive-purge.service';
import { DowngradeArchiveStore } from './downgrade-archive.store';
import { PurgeJournalStore, type PurgeJobView } from './purge-journal.store';
import type { PurgePathOutcome, PurgeRunTrigger } from './purge-journal.vocabulary';
import { decideAfterAttempt, foldRunCounters, type RetryTransition } from './purge-retry-policy';

/** K: новых партий за прогон не больше — поток удаления не держит цикл событий media (реплика Музыканта). */
export const PURGE_BATCHES_PER_RUN = 20;
/** Долга прошлых прогонов за один прогон не больше. */
export const PURGE_DEBT_PER_RUN = 50;

export interface PurgeRunOptions {
  readonly dryRun: boolean;
  readonly trigger?: PurgeRunTrigger;
}

const DRY_TRANSITION: RetryTransition = { status: 'succeeded', attempt: 0, nextAttemptAt: null, bytesFreed: 0, lastError: null };

@Injectable()
export class PurgeGcRunner {
  private readonly logger = new Logger(PurgeGcRunner.name);
  private readonly activeRuns = new Set<string>();
  private liveActive = false;

  constructor(
    private readonly archive: DowngradeArchiveStore,
    private readonly journal: PurgeJournalStore,
    private readonly prisma: PrismaService,
    private readonly blobs: BlobStorageService,
  ) {}

  async run(now: Date, options: PurgeRunOptions): Promise<PurgeReport> {
    const listed = await this.archive.purgeExpired(now, { dryRun: true });
    const candidates = listed.candidates.slice(0, PURGE_BATCHES_PER_RUN);
    const empty = { dryRun: options.dryRun, now, candidates, frozenBytes: frozenBytesOf(candidates), purged: [], purgedIds: [], refused: [], blobs: { deleted: 0, failed: 0 } };
    if (!options.dryRun && this.liveActive) {
      return { ...empty, runId: null, refusal: { reason: 'purge_run_in_progress', detail: 'live-прогон уже идёт в этом процессе' } };
    }
    if (!options.dryRun) this.liveActive = true;
    const run = await this.journal
      .openRun({ trigger: options.trigger ?? 'cron', mode: options.dryRun ? 'dry_run' : 'live', enabledSnapshot: true, dryRunSnapshot: options.dryRun }, now)
      .catch((e: unknown) => {
        if (!options.dryRun) this.liveActive = false;
        throw e;
      });
    this.activeRuns.add(run.runId);
    try {
      if (this.activeRuns.size === 1) await this.journal.markAbandoned(run.runId, now);
      const body = options.dryRun ? await this.dry(run.runId, candidates, now) : await this.live(run.runId, candidates, now);
      await this.journal.closeRun(run.runId, { status: 'succeeded', counters: foldRunCounters(body.transitions) }, now);
      this.logger.log({ runId: run.runId, dryRun: options.dryRun, jobs: body.transitions.length, purged: body.purged.length, blobsFailed: body.failed }, 'cold-archive purge run: done');
      return { ...empty, runId: run.runId, purged: body.purged, purgedIds: body.purged, refused: body.refused, blobs: { deleted: body.deleted, failed: body.failed }, refusal: null };
    } catch (error) {
      const summary = error instanceof Error ? error.name : 'unknown';
      await this.journal.closeRun(run.runId, { status: 'failed', errorSummary: summary }, now).catch(() => undefined);
      throw error;
    } finally {
      this.activeRuns.delete(run.runId);
      if (!options.dryRun) this.liveActive = false;
    }
  }

  private async dry(runId: string, candidates: PurgeReport['candidates'], now: Date): Promise<RunBody> {
    const body = emptyBody();
    for (const c of candidates) {
      const job = await this.snapshotJob(runId, c.batchId, c.deviceId);
      if (!job) continue;
      const claimed = await this.journal.claimJob(job.jobId, now);
      if (!claimed.ok) continue;
      await this.journal.completeJob(job.jobId, claimed.value.leaseUntil!, DRY_TRANSITION, {});
      body.transitions.push(DRY_TRANSITION);
    }
    return body;
  }

  private async live(runId: string, candidates: PurgeReport['candidates'], now: Date): Promise<RunBody> {
    const body = emptyBody();
    const handled = new Set<string>();
    for (const job of await this.liveDebt(now)) {
      if (job.batchId) handled.add(job.batchId);
      await this.attempt(job, now, body);
    }
    for (const c of candidates) {
      if (handled.has(c.batchId)) continue;
      const job = await this.snapshotJob(runId, c.batchId, c.deviceId);
      if (job) await this.attempt(job, now, body);
    }
    return body;
  }

  /** Годный к захвату долг прошлых прогонов, кроме заданий dry-run. */
  private async liveDebt(now: Date): Promise<readonly PurgeJobView[]> {
    const jobs = await this.journal.listClaimable(now, PURGE_DEBT_PER_RUN);
    if (jobs.length === 0) return jobs;
    const runs = await this.prisma.coldArchivePurgeRun.findMany({ where: { id: { in: [...new Set(jobs.map((j) => j.runId))] } }, select: { id: true, mode: true } });
    const live = new Set(runs.filter((r) => r.mode === 'live').map((r) => r.id));
    return jobs.filter((j) => live.has(j.runId));
  }

  /** Снимок путей партии — ДО `markPurged`. Повтор партии в прогоне (`duplicate`) — не новая работа. */
  private async snapshotJob(runId: string, batchId: string, deviceId: string): Promise<PurgeJobView | null> {
    const rows = await this.prisma.downgradeArchivedSample.findMany({ where: { batchId }, select: { storageRef: true } });
    const added = await this.journal.addJob({ runId, targetType: 'batch', batchId, deviceId, storageRefs: rows.map((r) => r.storageRef) });
    return added.ok && !added.value.duplicate ? added.value.job : null;
  }

  private async attempt(job: PurgeJobView, now: Date, body: RunBody): Promise<void> {
    const claimed = await this.journal.claimJob(job.jobId, now);
    if (!claimed.ok) return;
    if (job.batchId) {
      const marked = await this.archive.markPurged(job.batchId, now);
      if (marked.ok) {
        body.purged.push(job.batchId);
      } else {
        const batch = await this.prisma.downgradeArchiveBatch.findUnique({ where: { id: job.batchId }, select: { state: true } });
        if (batch?.state !== 'deleted') {
          // Партию вернули или срок не вышел: файлы живые — не трогаем, задание закрыто без путей.
          body.refused.push({ batchId: job.batchId, refusal: marked.refusal });
          const t = decideAfterAttempt(claimed.value, [], now);
          await this.journal.completeJob(job.jobId, claimed.value.leaseUntil!, t, {});
          body.transitions.push(t);
          return;
        }
      }
    }
    const outcomes: BlobRemovalOutcome[] = [];
    for (const ref of claimed.value.storageRefs) outcomes.push(await this.removeOne(ref));
    const t = decideAfterAttempt(claimed.value, outcomes, now);
    const done = await this.journal.completeJob(job.jobId, claimed.value.leaseUntil!, t, outcomesRecord(outcomes));
    if (!done.ok) this.logger.warn({ jobId: job.jobId }, 'cold-archive purge: lease lost — outcome not recorded');
    body.transitions.push(t);
    for (const o of outcomes) {
      if (o.action === 'failed') body.failed += 1;
      else body.deleted += 1;
    }
  }

  /** `removeWithProof` бросает только на недопустимом пути — это тоже `failed`, а не обрыв прогона. */
  private async removeOne(storageRef: string): Promise<BlobRemovalOutcome> {
    try {
      return await this.blobs.removeWithProof(storageRef);
    } catch (error) {
      return { storageRef, beforeExists: true, afterExists: true, action: 'failed', bytesFreed: 0, error: error instanceof Error ? error.name : 'unknown' };
    }
  }
}

interface RunBody {
  readonly transitions: RetryTransition[];
  readonly purged: string[];
  readonly refused: PurgeRefused[];
  deleted: number;
  failed: number;
}

const emptyBody = (): RunBody => ({ transitions: [], purged: [], refused: [], deleted: 0, failed: 0 });

function outcomesRecord(outcomes: readonly BlobRemovalOutcome[]): Record<string, PurgePathOutcome> {
  return Object.fromEntries(outcomes.map((o) => [o.storageRef, { beforeExists: o.beforeExists, afterExists: o.afterExists, action: o.action }]));
}

export function frozenBytesOf(candidates: PurgeReport['candidates']): number {
  return candidates.reduce((sum, c) => sum + (Number.isFinite(c.frozenBytes) ? c.frozenBytes : 0), 0);
}

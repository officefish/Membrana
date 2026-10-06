/**
 * Уборка холодного архива понижения по сроку (#2588 b5; ADR-0031 п.4; план блока 2 v2).
 *
 * Поверх хранилища блока 1: предикат `isPurgeDue` и список кандидатов — `store.purgeExpired(now,
 * {dryRun:true})`, условное обновление `frozen → deleted` с удалением строк в транзакции —
 * `store.markPurged`. Здесь — только оркестровка и файлы.
 *
 * ДВА РЕЖИМА. `dryRun:true` — честный список «что удалил бы», побочных эффектов ноль. `dryRun:false`
 * — по каждой партии: (1) прочитать `storageRef` её строк, (2) `markPurged` (строки удалены, партия
 * `deleted` — в одной транзакции; `count ≠ 1` ⇒ партию успели вернуть или она не истекла — отказ,
 * файлы не трогаем), (3) удалить файлы блобов. ПОРЯДОК «СНАЧАЛА СТРОКИ, ПОТОМ ФАЙЛЫ» — решение
 * ведущей 06.10: повтор после сбоя на шаге (3) безопасен (строк нет — партия не кандидат), а
 * осиротевший файл — названный долг в отчёте (`blobs.failed`), не ложь схемы «удалено».
 *
 * `restored`, `failed`, `deleted` не трогаются никогда — их отсекает WHERE и предикат блока 1.
 * Идемпотентность: повтор ничего не находит и отвечает `purged: []`.
 */
import { Injectable, Logger } from '@nestjs/common';

import { BlobStorageService } from '../../blob/blob-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DowngradeArchiveStore, type ArchiveRefusal, type PurgeCandidate } from './downgrade-archive.store';

export interface PurgeRefused {
  readonly batchId: string;
  readonly refusal: ArchiveRefusal;
}

/** Отчёт двери — форма, которую читает пусковик office (b6, `SweepReport`): `candidates[]`, `purged[]`, `refusal`. */
export interface PurgeReport {
  readonly dryRun: boolean;
  readonly now: Date;
  readonly candidates: readonly PurgeCandidate[];
  /** Сумма байт кандидатов — «сколько освободил бы / освободил». */
  readonly frozenBytes: number;
  /** Партии, переведённые в `deleted` этим вызовом (dryRun — всегда пусто). */
  readonly purged: readonly string[];
  /** То же, что `purged`, под именем контракта b6. */
  readonly purgedIds: readonly string[];
  /** Партии, которые были кандидатами, но `markPurged` их не взял (вернули/не истекли между чтением и записью). */
  readonly refused: readonly PurgeRefused[];
  /** Файлы: удалено и не удалось (осиротевшие блобы — долг, партия при этом уже `deleted`). */
  readonly blobs: { readonly deleted: number; readonly failed: number };
  /** Отказ всей операции (словарь блока 1); у реализованной уборки — всегда `null`. */
  readonly refusal: ArchiveRefusal | null;
}

export function frozenBytesOf(candidates: readonly PurgeCandidate[]): number {
  return candidates.reduce((sum, c) => sum + (Number.isFinite(c.frozenBytes) ? c.frozenBytes : 0), 0);
}

@Injectable()
export class DowngradeArchivePurgeService {
  private readonly logger = new Logger(DowngradeArchivePurgeService.name);

  constructor(
    private readonly store: DowngradeArchiveStore,
    private readonly prisma: PrismaService,
    private readonly blobs: BlobStorageService,
  ) {}

  async purgeExpired(now: Date, options: { readonly dryRun: boolean }): Promise<PurgeReport> {
    // Кандидаты — всегда через dryRun хранилища: один предикат правды (`isPurgeDue`), без побочных эффектов.
    const listed = await this.store.purgeExpired(now, { dryRun: true });
    const candidates = listed.candidates;
    const base = { now, candidates, frozenBytes: frozenBytesOf(candidates), refusal: null } as const;
    if (options.dryRun) {
      return { ...base, dryRun: true, purged: [], purgedIds: [], refused: [], blobs: { deleted: 0, failed: 0 } };
    }

    const purged: string[] = [];
    const refused: PurgeRefused[] = [];
    let blobsDeleted = 0;
    let blobsFailed = 0;

    for (const candidate of candidates) {
      // (1) адреса файлов — ДО удаления строк: после markPurged их уже негде взять.
      const rows = await this.prisma.downgradeArchivedSample.findMany({
        where: { batchId: candidate.batchId },
        select: { storageRef: true },
      });
      // (2) строки и метка — одной транзакцией хранилища; count ≠ 1 ⇒ отказ, файлы целы.
      const marked = await this.store.markPurged(candidate.batchId, now);
      if (!marked.ok) {
        refused.push({ batchId: candidate.batchId, refusal: marked.refusal });
        continue;
      }
      purged.push(candidate.batchId);
      // (3) файлы — после строк; неудача файла не откатывает партию, а становится долгом в отчёте.
      for (const { storageRef } of rows) {
        try {
          await this.blobs.delete(storageRef);
          blobsDeleted += 1;
        } catch (error) {
          blobsFailed += 1;
          this.logger.warn(
            { batchId: candidate.batchId, error: error instanceof Error ? error.name : 'unknown' },
            'downgrade-archive purge: blob not deleted — orphan file, batch already deleted',
          );
        }
      }
    }

    this.logger.log(
      { candidates: candidates.length, purged: purged.length, refused: refused.length, blobsDeleted, blobsFailed, frozenBytes: base.frozenBytes },
      'downgrade-archive purge: done',
    );
    return { ...base, dryRun: false, purged, purgedIds: purged, refused, blobs: { deleted: blobsDeleted, failed: blobsFailed } };
  }
}

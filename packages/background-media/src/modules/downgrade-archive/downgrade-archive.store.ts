/**
 * Хранилище архива понижения — носитель замороженного (#2587 блок b2; ADR-0031, решения 2 и 4).
 *
 * ПЕРЕНОС, А НЕ ПОМЕТКА. Заморозка переносит строку из "Sample" в "DowngradeArchivedSample" под ТЕМ
 * ЖЕ id; файл блоба остаётся на месте. Поэтому `getQuota`, списки, витрины и путь воспроизведения
 * не меняются и не знают об архиве: замороженной строки в "Sample" нет — она не считается и не
 * показывается. Возврат — обратный перенос под прежним id: ссылки журнала на sampleId живы.
 *
 * ПАРТИЯ — ЕДИНИЦА. Заморозка, возврат и удаление идут партией (`DowngradeArchiveBatch`); её
 * `expiresAt` — СНИМОК `frozenAt + retentionDays` суток (решение 4): смена срока на мембране
 * старые партии не трогает.
 *
 * ЧАСТИЧНЫЙ ПЕРЕНОС = `failed`, НЕ «ЗАМОРОЗИЛИ ЧТО ЕСТЬ». Если между предпросмотром и приказом
 * проба исчезла, партия создаётся в `failed` с теми строками, что успели перенестись, и это
 * возвращается вызывающему как отказ `partial_freeze` — тариф коммитить нельзя (решение 5). Хвост
 * `failed`-партии подбирает СЛЕДУЮЩАЯ заморозка (слово владельца 05.10): её строки переносятся в
 * новую партию, `failed` остаётся следом с нулём строк. Уборка по сроку `failed` не трогает.
 *
 * ДВЕРЕЙ ЗДЕСЬ НЕТ (preview / freeze / restore как HTTP — блок b3), КВОТУ НЕ СУДИМ (бюджет и
 * post-condition — b3), БЛОБЫ НЕ УДАЛЯЕМ (уборка — #2588). Здесь только перенос строк, партия и
 * предикат уборки. `purgeExpired` без `dryRun` — названный отказ, не тихая заглушка.
 */
import { Inject, Injectable } from '@nestjs/common';

import type { DowngradeArchiveState, Prisma, Sample } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Единственное законное основание партии в v1. Второе — правка словаря, не строка. */
export const DOWNGRADE_ARCHIVE_REASON = 'tariff_downgrade' as const;

/** Миллисекунд в сутках — для снимка `expiresAt`. */
const DAY_MS = 86_400_000;

/** Что ушло в архив — адрес и ранг режима на момент заморозки (`null` — неизмеримая). */
export interface ArchivePick {
  readonly sampleId: string;
  readonly modeRank: number | null;
}

/** Приказ заморозки, как его принесёт дверь b3 после подтверждённого предпросмотра. */
export interface ArchiveSamplesInput {
  readonly deviceId: string;
  readonly membraneId: string;
  readonly fromTariffId: string;
  readonly toTariffId: string;
  readonly criterion: string;
  /** Хеш подтверждённого предпросмотра; уникален на прибор (`@@unique([deviceId, planDigest])`). */
  readonly planDigest: string;
  /** Срок в СУТКАХ, снимок от кабинета; целое ≥ 1. */
  readonly retentionDays: number;
  /** Сумма байт, оставшихся живыми по плану — вещдок post-condition для b3. */
  readonly keptBytes: number;
  readonly picks: readonly ArchivePick[];
}

export type ArchiveRefusalReason =
  | 'invalid_retention'
  | 'duplicate_plan'
  | 'partial_freeze'
  | 'concurrent_change'
  | 'batch_not_found'
  | 'batch_not_frozen'
  | 'archive_expired'
  | 'purge_not_implemented';

export interface ArchiveRefusal {
  readonly reason: ArchiveRefusalReason;
  readonly detail: string;
}

export interface ArchiveBatchView {
  readonly batchId: string;
  readonly deviceId: string;
  readonly membraneId: string;
  readonly state: DowngradeArchiveState;
  readonly frozenAt: Date;
  readonly expiresAt: Date;
  readonly retentionDays: number;
  readonly criterion: string;
  readonly planDigest: string;
  readonly frozenBytes: number;
  readonly keptBytes: number;
  readonly sampleCount: number;
}

export interface ArchiveSamplesOutcome {
  readonly batch: ArchiveBatchView;
  /** Пробы, которых в "Sample" прибора не оказалось; непусто ⇔ `batch.state === 'failed'`. */
  readonly missing: readonly string[];
  readonly refusal: ArchiveRefusal | null;
}

export interface RestoreBatchOutcome {
  readonly batch: ArchiveBatchView | null;
  readonly restored: readonly string[];
  readonly refusal: ArchiveRefusal | null;
}

export interface PurgeCandidate {
  readonly batchId: string;
  readonly deviceId: string;
  readonly expiresAt: Date;
  readonly sampleCount: number;
  readonly frozenBytes: number;
}

export interface PurgeOutcome {
  readonly dryRun: boolean;
  readonly now: Date;
  readonly candidates: readonly PurgeCandidate[];
  /** Партии, переведённые в `deleted` этим вызовом. В b2 всегда пусто — см. `refusal`. */
  readonly purged: readonly string[];
  readonly refusal: ArchiveRefusal | null;
}

const isPositiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1;

/** Снимок срока: `expiresAt = frozenAt + retentionDays` суток, без календарной арифметики. */
export function expiresAtOf(frozenAt: Date, retentionDays: number): Date {
  return new Date(frozenAt.getTime() + retentionDays * DAY_MS);
}

/** Предикат уборки #2588 — одно место правды: `frozen` и срок вышел. `failed` не трогается. */
export function isPurgeDue(batch: { readonly state: DowngradeArchiveState; readonly expiresAt: Date }, now: Date): boolean {
  return batch.state === 'frozen' && batch.expiresAt.getTime() <= now.getTime();
}

type BatchRow = Prisma.DowngradeArchiveBatchGetPayload<{ include: { _count: { select: { samples: true } } } }>;

function viewOf(row: BatchRow): ArchiveBatchView {
  return {
    batchId: row.id,
    deviceId: row.deviceId,
    membraneId: row.membraneId,
    state: row.state,
    frozenAt: row.frozenAt,
    expiresAt: row.expiresAt,
    retentionDays: row.retentionDays,
    criterion: row.criterion,
    planDigest: row.planDigest,
    frozenBytes: Number(row.frozenBytes),
    keptBytes: Number(row.keptBytes),
    sampleCount: row._count.samples,
  };
}

/** Код Prisma для нарушения уникальности — ловим именно его, как в `prisma-track-key.store.ts`. */
const isUniqueViolation = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';

/**
 * Гонка между чтением и удалением внутри транзакции заморозки (разбор Веснина, b2): при Read
 * Committed параллельный писатель мог удалить пробу после `findMany` — тогда `deleteMany` снёс бы
 * меньше, чем `createMany` положил в архив, и `frozenBytes` врал бы. Бросается ВНУТРИ транзакции,
 * чтобы откатить всё; снаружи превращается в отказ `concurrent_change`.
 */
class ConcurrentChange extends Error {
  constructor(readonly expected: number, readonly actual: number) {
    super(`между чтением и переносом буфер изменился: ожидали перенести ${expected}, удалено ${actual}`);
  }
}

const BATCH_INCLUDE = { _count: { select: { samples: true } } } as const;

@Injectable()
export class DowngradeArchiveStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Заморозить пробы одной партией: перенос строк "Sample" → "DowngradeArchivedSample" под тем же id
   * в ОДНОЙ транзакции. Файлы не трогаются.
   *
   * Повтор с тем же `planDigest` на тот же прибор — `duplicate_plan` с уже существующей партией
   * (идемпотентность держит уникальный индекс, не порядок вызовов). Исчезнувшие пробы — партия
   * `failed` + `partial_freeze`; перенесённые остаются в ней и подбираются следующей заморозкой.
   */
  async archiveSamples(input: ArchiveSamplesInput, now: Date = new Date()): Promise<ArchiveSamplesOutcome | { batch: null; missing: readonly string[]; refusal: ArchiveRefusal }> {
    if (!isPositiveInt(input.retentionDays)) {
      return {
        batch: null,
        missing: [],
        refusal: { reason: 'invalid_retention', detail: `retentionDays «${String(input.retentionDays)}» — не целое ≥ 1` },
      };
    }
    const ids = [...new Set(input.picks.map((p) => p.sampleId))];
    const rankOf = new Map(input.picks.map((p) => [p.sampleId, p.modeRank] as const));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.sample.findMany({ where: { deviceId: input.deviceId, id: { in: ids } } });
        const found = new Map(rows.map((r) => [r.id, r] as const));
        const missing = ids.filter((id) => !found.has(id));
        const frozenBytes = rows.reduce((s, r) => s + r.sizeBytes, 0);

        const batch = await tx.downgradeArchiveBatch.create({
          data: {
            deviceId: input.deviceId,
            membraneId: input.membraneId,
            reason: DOWNGRADE_ARCHIVE_REASON,
            fromTariffId: input.fromTariffId,
            toTariffId: input.toTariffId,
            criterion: input.criterion,
            planDigest: input.planDigest,
            retentionDays: input.retentionDays,
            frozenAt: now,
            expiresAt: expiresAtOf(now, input.retentionDays),
            state: missing.length > 0 ? 'failed' : 'frozen',
            keptBytes: BigInt(input.keptBytes),
            frozenBytes: BigInt(frozenBytes),
          },
        });

        if (rows.length > 0) {
          await tx.downgradeArchivedSample.createMany({
            data: rows.map((r) => archivedRowOf(r, batch.id, rankOf.get(r.id) ?? null, now)),
          });
          const { count } = await tx.sample.deleteMany({
            where: { deviceId: input.deviceId, id: { in: rows.map((r) => r.id) } },
          });
          // Сверка count — тот же приём, что в `markPurged`: удалено меньше прочитанного ⇒ сосед
          // успел снести пробу ⇒ в архиве лёг бы фантом без исходника. Откат, не «как получилось».
          if (count !== rows.length) throw new ConcurrentChange(rows.length, count);
        }

        const view = viewOf({ ...batch, _count: { samples: rows.length } });
        return {
          batch: view,
          missing,
          refusal:
            missing.length > 0
              ? { reason: 'partial_freeze', detail: `${missing.length} из ${ids.length} проб не найдено в буфере прибора; партия ${batch.id} — failed, тариф не коммитить` }
              : null,
        };
      });
    } catch (e) {
      if (e instanceof ConcurrentChange) {
        return {
          batch: null,
          missing: [],
          refusal: { reason: 'concurrent_change', detail: `${e.message}; транзакция откачена, партии нет — повторить предпросмотр` },
        };
      }
      if (!isUniqueViolation(e)) throw e;
      const existing = await this.prisma.downgradeArchiveBatch.findUnique({
        where: { deviceId_planDigest: { deviceId: input.deviceId, planDigest: input.planDigest } },
        include: BATCH_INCLUDE,
      });
      if (!existing) throw e;
      return {
        batch: viewOf(existing),
        missing: [],
        refusal: { reason: 'duplicate_plan', detail: `партия ${existing.id} по этому planDigest уже существует — повторной заморозки нет` },
      };
    }
  }

  /**
   * Вернуть партию целиком: строки едут обратно в "Sample" под прежним id. Только `frozen` и только
   * до `expiresAt` (решение: разморозка рукой, целой партией). ПОМЕСТИТСЯ ЛИ — судит дверь b3 по
   * квоте ДО вызова; здесь только перенос.
   */
  async restoreBatch(batchId: string, now: Date = new Date()): Promise<RestoreBatchOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.downgradeArchiveBatch.findUnique({ where: { id: batchId }, include: BATCH_INCLUDE });
      if (!batch) return { batch: null, restored: [], refusal: { reason: 'batch_not_found', detail: `партии ${batchId} нет` } };
      if (batch.state !== 'frozen') {
        return { batch: viewOf(batch), restored: [], refusal: { reason: 'batch_not_frozen', detail: `партия ${batchId} в состоянии ${batch.state}, вернуть можно только frozen` } };
      }
      if (batch.expiresAt.getTime() <= now.getTime()) {
        return { batch: viewOf(batch), restored: [], refusal: { reason: 'archive_expired', detail: `срок партии ${batchId} истёк ${batch.expiresAt.toISOString()}` } };
      }
      const rows = await tx.downgradeArchivedSample.findMany({ where: { batchId } });
      if (rows.length > 0) {
        await tx.sample.createMany({ data: rows.map(sampleRowOf) });
        await tx.downgradeArchivedSample.deleteMany({ where: { batchId } });
      }
      const updated = await tx.downgradeArchiveBatch.update({
        where: { id: batchId },
        data: { state: 'restored', restoredAt: now },
        include: BATCH_INCLUDE,
      });
      return { batch: viewOf({ ...updated, _count: { samples: 0 } }), restored: rows.map((r) => r.id), refusal: null };
    });
  }

  /** Одна партия — для предпросмотра возврата в b3. `null` — нет такой. */
  async getBatch(batchId: string): Promise<ArchiveBatchView | null> {
    const row = await this.prisma.downgradeArchiveBatch.findUnique({ where: { id: batchId }, include: BATCH_INCLUDE });
    return row ? viewOf(row) : null;
  }

  /** Партии прибора — для списка b3 и предпросмотра (хвост `failed` виден вызывающему). */
  async listBatches(deviceId: string): Promise<readonly ArchiveBatchView[]> {
    const rows = await this.prisma.downgradeArchiveBatch.findMany({
      where: { deviceId },
      orderBy: { frozenAt: 'desc' },
      include: BATCH_INCLUDE,
    });
    return rows.map(viewOf);
  }

  /** Адреса проб прибора, лежащих в `failed`-партиях, — хвост, который подбирает следующая заморозка. */
  async failedTailOf(deviceId: string): Promise<readonly string[]> {
    const rows = await this.prisma.downgradeArchivedSample.findMany({
      where: { deviceId, batch: { state: 'failed' } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * Уборка по сроку — КОНТРАКТ для #2588, не реализация.
   *
   * `dryRun: true` — честный отбор кандидатов предикатом `isPurgeDue` (`frozen` ∧ `expiresAt ≤ now`),
   * побочных эффектов ноль. Без `dryRun` в b2 — названный отказ `purge_not_implemented`: удалять
   * блобы здесь нечем, а пометить `deleted` при живых файлах значило бы солгать схемой. #2588
   * заменяет отказ на: удалить блобы → удалить строки → `markPurged` (условное обновление ниже).
   */
  async purgeExpired(now: Date, options: { readonly dryRun: boolean }): Promise<PurgeOutcome> {
    const rows = await this.prisma.downgradeArchiveBatch.findMany({
      where: { state: 'frozen', expiresAt: { lte: now } },
      orderBy: { expiresAt: 'asc' },
      include: BATCH_INCLUDE,
    });
    const candidates = rows.filter((r) => isPurgeDue(r, now)).map((r) => ({
      batchId: r.id,
      deviceId: r.deviceId,
      expiresAt: r.expiresAt,
      sampleCount: r._count.samples,
      frozenBytes: Number(r.frozenBytes),
    }));
    if (options.dryRun) return { dryRun: true, now, candidates, purged: [], refusal: null };
    return {
      dryRun: false,
      now,
      candidates,
      purged: [],
      refusal: { reason: 'purge_not_implemented', detail: 'удаление блобов и строк — блок #2588; в b2 боевой уборки нет, кандидаты только показаны' },
    };
  }

  /**
   * Условное обновление `frozen → deleted` для #2588: WHERE повторяет предикат уборки, и `count`
   * сверяется — если партию успели вернуть или она ещё не истекла, обновления нет и это отказ, а не
   * «наверное удалили». При `count === 1` в ТОЙ ЖЕ транзакции удаляются строки партии: партия
   * `deleted` с живыми строками была бы ложью схемой (разбор Веснина). Партия остаётся следом.
   * Вызывать ПОСЛЕ удаления блобов (их `storageRef` берётся из строк до вызова).
   */
  async markPurged(
    batchId: string,
    now: Date,
  ): Promise<{ ok: true; deletedRows: number } | { ok: false; refusal: ArchiveRefusal }> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.downgradeArchiveBatch.updateMany({
        where: { id: batchId, state: 'frozen', expiresAt: { lte: now } },
        data: { state: 'deleted', deletedAt: now },
      });
      if (count !== 1) {
        return {
          ok: false as const,
          refusal: { reason: 'batch_not_frozen' as const, detail: `партия ${batchId} не frozen или срок не вышел на ${now.toISOString()} — обновлено ${count} строк` },
        };
      }
      const deleted = await tx.downgradeArchivedSample.deleteMany({ where: { batchId } });
      return { ok: true as const, deletedRows: deleted.count };
    });
  }
}

function archivedRowOf(r: Sample, batchId: string, modeRank: number | null, now: Date): Prisma.DowngradeArchivedSampleCreateManyInput {
  return {
    id: r.id,
    batchId,
    deviceId: r.deviceId,
    collectionId: r.collectionId,
    title: r.title,
    class: r.class,
    label: r.label,
    source: r.source,
    durationSec: r.durationSec,
    sampleRate: r.sampleRate,
    channels: r.channels,
    audioFormat: r.audioFormat,
    contentType: r.contentType,
    sizeBytes: r.sizeBytes,
    storageRef: r.storageRef,
    notes: r.notes,
    createdAt: r.createdAt,
    modeRank,
    archivedAt: now,
  };
}

function sampleRowOf(r: Prisma.DowngradeArchivedSampleGetPayload<Record<string, never>>): Prisma.SampleCreateManyInput {
  return {
    id: r.id,
    deviceId: r.deviceId,
    collectionId: r.collectionId,
    title: r.title,
    class: r.class,
    label: r.label,
    source: r.source,
    durationSec: r.durationSec,
    sampleRate: r.sampleRate,
    channels: r.channels,
    audioFormat: r.audioFormat,
    contentType: r.contentType,
    sizeBytes: r.sizeBytes,
    storageRef: r.storageRef,
    notes: r.notes,
    createdAt: r.createdAt,
  };
}

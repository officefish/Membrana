/**
 * Двери архива понижения — предпросмотр, заморозка, список, возврат (#2587 блок b3; ADR-0031,
 * раздел «Контракт приказа freeze»; решения 5 и 6).
 *
 * ПРЕДПРОСМОТР НИЧЕГО НЕ МЕНЯЕТ и зовётся сколько угодно. Он меряет буфер ТЕМ ЖЕ измерителем, что
 * витрина chart-list (`measureSampleSet`), выстраивает порядок выбранного режима и режет его по
 * байтам (`selectKeepWithinBytes`, b1). Итог — состав keep/freeze и `planDigest`: детерминированный
 * хеш над составом и лимитом. Два предпросмотра на неизменном буфере дают один хеш.
 *
 * ЗАМОРОЗКА ПЕРЕСЧИТЫВАЕТ ПЛАН И СВЕРЯЕТ ХЕШ. Приказ без `planDigest` — `preview_required`; буфер
 * изменился после показа — `plan_stale`, а не «заморозим что есть»: человек подтверждал ДРУГОЙ
 * список. Перенос и post-condition `sum(active) ≤ limit` делает хранилище b2 в одной транзакции;
 * ложь post-condition или частичный перенос — партия `failed`, отказ, тариф не коммитить.
 *
 * ПОРЯДОК РЕЖИМА — АДАПТЕР, НЕ ЧЕТВЁРТАЯ ПРАВДА. `selectChartList` режет top-K из закрытого списка
 * объёмов (≤ 200), а буферу нужен ПОЛНЫЙ порядок. Поэтому порядок собирается раундами по 200:
 * для «громче фона» и «похожести на дрон» это ровно отсортированный список; для «разнообразия» —
 * раундовый отсев похожего (вытесненные уходят в следующие раунды). Компараторы пакета не
 * переписываются и не дублируются.
 *
 * ОХРАНЫ ЗДЕСЬ НЕТ — она в контроллере (`MediaDeviceAccessGuard`); принадлежность ПАРТИИ прибору
 * сервис проверяет сам: чужая партия для двери «не существует».
 */
import { Injectable } from '@nestjs/common';
import type {
  ChartListCandidate,
  ChartListCriterion,
  CollectionSampleReader,
  KeepCandidate,
  MeasuredCandidate,
  MeasureRefusalReason,
} from '@membrana/plugin-handlers' with { 'resolution-mode': 'import' };
import type { MediaSample } from '@membrana/media-library-service' with { 'resolution-mode': 'import' };

import { BlobStorageService } from '../../blob/blob-storage.service';
import { BUFFER_COLLECTION_ID } from '../../lib/collection-ids';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaSampleReader } from '../collections/first-wave.registrar';
import { DevicesService } from '../devices/devices.service';

import { DOWNGRADE_CRITERIA, type DowngradeArchiveRefusalReason } from './downgrade-archive.vocabulary';
import { DowngradeArchiveStore, type ArchiveBatchView } from './downgrade-archive.store';

// ESM-пакеты из CJS-сервера — только динамическим импортом (тот же приём, что у first-wave).
const loadHandlers = () => import('@membrana/plugin-handlers');
const loadCore = () => import('@membrana/media-library-service');
type Handlers = Awaited<ReturnType<typeof loadHandlers>>;

/** Объём одного раунда сборки порядка — наибольший из закрытого списка витрины. */
const ORDER_ROUND = 200;
/** Версия формы хеша: смена состава полей — смена версии, иначе старые отпечатки лгали бы. */
const PLAN_DIGEST_VERSION = 1;

export interface DoorRefusal {
  readonly ok: false;
  readonly reason: DowngradeArchiveRefusalReason;
  readonly detail: string;
  readonly batch?: ArchiveBatchView | null;
}

export interface PlanRow {
  readonly sampleId: string;
  readonly title: string;
  readonly bytes: number;
  readonly createdAt: string;
  readonly pinned: boolean;
  readonly modeRank: number | null;
}

export interface DowngradePreview {
  readonly ok: true;
  readonly deviceId: string;
  readonly criterion: ChartListCriterion;
  readonly bufferLimitBytes: number;
  readonly activeBufferBytes: number;
  readonly keep: readonly PlanRow[];
  readonly freeze: readonly PlanRow[];
  readonly keepBytes: number;
  readonly freezeBytes: number;
  readonly measured: number;
  readonly unmeasured: number;
  readonly failedTail: { readonly sampleIds: readonly string[]; readonly bytes: number };
  readonly planDigest: string;
  readonly measuredMs: number;
}

export interface FreezeOrder {
  readonly criterion: string;
  readonly bufferLimitBytes: number;
  readonly planDigest: string;
  readonly retentionDays: number;
  readonly membraneId: string;
  readonly fromTariffId: string;
  readonly toTariffId: string;
}

export interface FreezeAck {
  readonly ok: true;
  readonly idempotent: boolean;
  readonly batch: ArchiveBatchView;
  readonly adopted: number;
  readonly activeBufferBytes: number | null;
}

export interface RestoreAck {
  readonly ok: true;
  readonly batch: ArchiveBatchView;
  readonly restored: readonly string[];
}

const isNonNegativeInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/**
 * Отказ измерителя → причина двери, закрытым словарём `downgrade-archive.vocabulary.ts`. Карта
 * полная по типу: новая причина измерителя красит `tsc` здесь. `empty-set` сюда не доходит
 * (пустой буфер — пустой план до измерения), но и он — отказ, а не «всё неизмеримо».
 */
const MEASURE_REFUSAL_TO_DOOR: Readonly<Record<MeasureRefusalReason, DowngradeArchiveRefusalReason>> = {
  'empty-set': 'measure_nothing_decodable',
  'nothing-decodable': 'measure_nothing_decodable',
  'floor-not-measured': 'measure_floor_not_measured',
};

/** Строки для тела хеша плана: адрес, байты, момент — отсортированы по адресу, порядок входа не влияет. */
const digestRows = (rows: readonly KeepCandidate[]): readonly [string, number, number][] =>
  rows.map((c): [string, number, number] => [c.sampleId, c.bytes, c.createdAt]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
const refuse = (reason: DowngradeArchiveRefusalReason, detail: string, batch?: ArchiveBatchView | null): DoorRefusal => ({
  ok: false,
  reason,
  detail,
  ...(batch !== undefined ? { batch } : {}),
});

/**
 * Полный порядок режима раундами `selectChartList` по 200. Возвращает ранг с нуля для каждой
 * измеренной пробы; детерминирован при одном и том же составе (вход сортируется по `sampleId`,
 * порядок подачи не влияет).
 *
 * КОНТРАКТ РАУНДОВ (разбор Дынина, b3): для `loudness-over-floor` и `drone-likeness` раунды —
 * ровно срезы одной глобальной сортировки, итог совпадает с одним прогоном. Для `spectral-variety`
 * итог — РАУНДОВЫЙ отсев: похожие на лидеров раунда вытесняются в следующий раунд и получают
 * ранг ниже всех его лидеров; это НЕ один глобальный dedupe на весь буфер и не обещает его. Выбор
 * сознательный: ядро режет top-K ≤ 200, а буферу нужен полный порядок без копии компараторов.
 */
export function modeOrderOf(
  handlers: Pick<Handlers, 'selectChartList'>,
  candidates: readonly ChartListCandidate[],
  criterion: ChartListCriterion,
): ReadonlyMap<string, number> {
  const ranks = new Map<string, number>();
  let remaining = [...candidates].sort((a, b) => (a.sampleId < b.sampleId ? -1 : a.sampleId > b.sampleId ? 1 : 0));
  while (remaining.length > 0) {
    const selection = handlers.selectChartList(remaining, criterion, ORDER_ROUND);
    if (selection.refusal || selection.picks.length === 0) break;
    for (const pick of selection.picks) ranks.set(pick.sampleId, ranks.size);
    const taken = new Set(selection.picks.map((p) => p.sampleId));
    remaining = remaining.filter((c) => !taken.has(c.sampleId));
  }
  // Остаток возможен только при отказе ядра; порядок — стабильный, по адресу, в хвосте.
  for (const c of remaining) ranks.set(c.sampleId, ranks.size);
  return ranks;
}

/** Строка базы → проба ядра библиотеки, чтобы «хранить» судил тот же предикат, что у уборки. */
function toMediaSample(row: {
  id: string; collectionId: string; title: string; class: string; label: string; durationSec: number;
  sampleRate: number; channels: number; createdAt: Date; storageRef: string; notes: string | null; sizeBytes: number;
}): MediaSample {
  return {
    id: row.id,
    collectionId: row.collectionId,
    title: row.title,
    class: row.class,
    label: row.label as MediaSample['label'],
    source: 'mic-recording',
    durationSec: row.durationSec,
    sampleRate: row.sampleRate,
    channels: row.channels === 2 ? 2 : 1,
    createdAt: row.createdAt.toISOString(),
    storageRef: row.storageRef,
    notes: row.notes ?? undefined,
    sizeBytes: row.sizeBytes,
  };
}

@Injectable()
export class DowngradeArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blobs: BlobStorageService,
    private readonly devices: DevicesService,
    private readonly store: DowngradeArchiveStore,
  ) {}

  private reader: CollectionSampleReader | null = null;

  private readerOf(handlers: Handlers): CollectionSampleReader {
    this.reader ??= prismaSampleReader(this.prisma, this.blobs, handlers.sha256Hex);
    return this.reader;
  }

  /** Предпросмотр: что останется и что уйдёт при лимите нового тарифа. Ничего не меняет. */
  async preview(deviceId: string, input: { criterion: string; bufferLimitBytes: number }): Promise<DowngradePreview | DoorRefusal> {
    const handlers = await loadHandlers();
    if (!handlers.isChartListCriterion(input.criterion)) {
      return refuse('unknown_criterion', `режим «${input.criterion}» вне закрытой тройки ${DOWNGRADE_CRITERIA.join(' · ')}`);
    }
    if (!isNonNegativeInt(input.bufferLimitBytes)) {
      return refuse('invalid_limit', `bufferLimitBytes «${String(input.bufferLimitBytes)}» — не целое ≥ 0`);
    }
    const criterion = input.criterion;
    const core = await loadCore();

    const rows = await this.prisma.sample.findMany({
      where: { deviceId, collectionId: BUFFER_COLLECTION_ID },
      orderBy: { id: 'asc' },
    });
    const activeBufferBytes = rows.reduce((s, r) => s + r.sizeBytes, 0);

    const started = Date.now();
    let measured: readonly MeasuredCandidate[] = [];
    if (rows.length > 0) {
      const outcome = await handlers.measureSampleSet({ reader: this.readerOf(handlers) }, deviceId, BUFFER_COLLECTION_ID, rows.map((r) => r.id));
      // Отказ измерителя — отказ предпросмотра, а не «весь буфер неизмерим»: план по новизне вместо
      // меры человек не заказывал, и подтверждать его вслепую нельзя (#2587, прод 07.10).
      if (outcome.refusal) {
        return refuse(MEASURE_REFUSAL_TO_DOOR[outcome.refusal.reason], `измеритель: ${outcome.refusal.detail}`);
      }
      measured = outcome.candidates;
    }
    const measuredMs = Date.now() - started;

    const atOf = new Map(rows.map((r) => [r.id, r.createdAt.getTime()] as const));
    const asChartList: ChartListCandidate[] = measured.map((m) => ({
      entryId: m.sampleId,
      sampleId: m.sampleId,
      at: atOf.get(m.sampleId) ?? 0,
      deltaDb: m.deltaDb,
      peakDb: m.peakDb,
      flatness: m.flatness,
      structure: m.structure,
      durationSec: m.durationSec,
      features: m.features,
    }));
    const ranks = modeOrderOf(handlers, asChartList, criterion);

    const keepCandidates: KeepCandidate[] = rows.map((r) => ({
      sampleId: r.id,
      bytes: r.sizeBytes,
      createdAt: r.createdAt.getTime(),
      pinned: core.isPinnedByHuman(toMediaSample(r)),
      modeRank: ranks.get(r.id) ?? null,
    }));
    const split = handlers.selectKeepWithinBytes(keepCandidates, input.bufferLimitBytes);
    if (split.refusal) {
      // Вход уже проверен выше; сюда можно попасть только дублем id — ошибка данных, не человека.
      return refuse('invalid_limit', `${split.refusal.reason}: ${split.refusal.detail}`);
    }

    const byId = new Map(rows.map((r) => [r.id, r] as const));
    const rowOf = (c: KeepCandidate): PlanRow => {
      const r = byId.get(c.sampleId)!;
      return { sampleId: c.sampleId, title: r.title, bytes: c.bytes, createdAt: r.createdAt.toISOString(), pinned: c.pinned, modeRank: c.modeRank };
    };

    const tailRows = await this.prisma.downgradeArchivedSample.findMany({
      where: { deviceId, batch: { state: 'failed' } },
      select: { id: true, sizeBytes: true },
    });
    const failedTail = {
      sampleIds: tailRows.map((t) => t.id).sort(),
      bytes: tailRows.reduce((s, t) => s + t.sizeBytes, 0),
    };

    const planDigest = handlers.sha256Hex(
      JSON.stringify({
        v: PLAN_DIGEST_VERSION,
        deviceId,
        criterion,
        bufferLimitBytes: input.bufferLimitBytes,
        // Строки — с байтами и временем, не только адресом: проба, ПОДМЕНЁННАЯ под тем же id между
        // предпросмотром и приказом (другой размер или момент), меняет хеш → plan_stale (разбор Дынина, b3).
        keep: digestRows(split.keep),
        freeze: digestRows(split.freeze),
        tail: failedTail.sampleIds,
      }),
    );

    return {
      ok: true,
      deviceId,
      criterion,
      bufferLimitBytes: input.bufferLimitBytes,
      activeBufferBytes,
      keep: split.keep.map(rowOf),
      freeze: split.freeze.map(rowOf),
      keepBytes: split.keepBytes,
      freezeBytes: split.freezeBytes,
      measured: measured.length,
      unmeasured: rows.length - measured.length,
      failedTail,
      planDigest,
      measuredMs,
    };
  }

  /** Заморозка по подтверждённому предпросмотру. Порядок кабинета: ЭТО — до commit тарифа. */
  async freeze(deviceId: string, order: FreezeOrder, now: Date = new Date()): Promise<FreezeAck | DoorRefusal> {
    if (typeof order.planDigest !== 'string' || order.planDigest === '') {
      return refuse('preview_required', 'planDigest не задан — заморозка без подтверждённого предпросмотра запрещена');
    }
    // Идемпотентность — ДО пересчёта плана: после удавшейся заморозки буфер уже другой, и пересчёт
    // честно сказал бы plan_stale там, где кабинет лишь повторяет приказ после обрыва связи.
    const existing = await this.store.findByPlan(deviceId, order.planDigest);
    if (existing) {
      // Повтор — только ТОТ ЖЕ приказ. Тот же хеш плана с другими реквизитами (мембрана, срок,
      // тарифы) — не повтор, а другой приказ с чужим планом: отказ, не «та же партия» (урок #2313).
      const mismatch = [
        existing.membraneId !== order.membraneId && 'membraneId',
        existing.retentionDays !== order.retentionDays && 'retentionDays',
        existing.fromTariffId !== order.fromTariffId && 'fromTariffId',
        existing.toTariffId !== order.toTariffId && 'toTariffId',
      ].filter((f): f is string => typeof f === 'string');
      if (mismatch.length > 0) {
        return refuse('duplicate_plan', `приказ по этому planDigest уже исполнялся партией ${existing.batchId}, реквизиты расходятся: ${mismatch.join(', ')} — повторите предпросмотр`, existing);
      }
      if (existing.state === 'frozen') return { ok: true, idempotent: true, batch: existing, adopted: 0, activeBufferBytes: null };
      return refuse('duplicate_plan', `приказ по этому planDigest уже исполнялся, партия ${existing.batchId} в состоянии ${existing.state} — повторите предпросмотр`, existing);
    }
    const plan = await this.preview(deviceId, { criterion: order.criterion, bufferLimitBytes: order.bufferLimitBytes });
    if (!plan.ok) return plan;
    if (plan.planDigest !== order.planDigest) {
      return refuse('plan_stale', 'состав буфера или лимит изменились после предпросмотра — повторите предпросмотр и подтверждение');
    }

    const outcome = await this.store.archiveSamples(
      {
        deviceId,
        membraneId: order.membraneId,
        fromTariffId: order.fromTariffId,
        toTariffId: order.toTariffId,
        criterion: plan.criterion,
        planDigest: order.planDigest,
        retentionDays: order.retentionDays,
        keptBytes: plan.keepBytes,
        picks: plan.freeze.map((r) => ({ sampleId: r.sampleId, modeRank: r.modeRank })),
        postCondition: { bufferLimitBytes: order.bufferLimitBytes, bufferCollectionId: BUFFER_COLLECTION_ID },
      },
      now,
    );
    // `batch === null` — литеральный дискриминант союза исходов хранилища: партии нет вовсе
    // (invalid_retention, concurrent_change). Дальше TS знает полную форму исхода.
    if (outcome.batch === null) return refuse(outcome.refusal.reason, outcome.refusal.detail, null);
    if (outcome.refusal?.reason === 'duplicate_plan') {
      return { ok: true, idempotent: true, batch: outcome.batch, adopted: 0, activeBufferBytes: null };
    }
    if (outcome.refusal) return refuse(outcome.refusal.reason, outcome.refusal.detail, outcome.batch);
    return {
      ok: true,
      idempotent: false,
      batch: outcome.batch,
      adopted: outcome.adopted,
      activeBufferBytes: outcome.activeBufferBytes,
    };
  }

  async listBatches(deviceId: string): Promise<readonly ArchiveBatchView[]> {
    return this.store.listBatches(deviceId);
  }

  /**
   * Вернуть партию целиком — рукой пользователя, только если помещается под ТЕКУЩИЙ лимит прибора
   * (`insufficient_quota`), только `frozen` и только до `expiresAt`.
   */
  async restore(deviceId: string, batchId: string, now: Date = new Date()): Promise<RestoreAck | DoorRefusal> {
    const batch = await this.store.getBatch(batchId);
    // Чужая партия для этой двери не существует — адрес не подтверждается и не опровергается.
    if (!batch || batch.deviceId !== deviceId) return refuse('batch_not_found', `партии ${batchId} у прибора нет`);
    if (batch.state !== 'frozen') return refuse('batch_not_frozen', `партия в состоянии ${batch.state}; вернуть можно только frozen`, batch);
    if (batch.expiresAt.getTime() <= now.getTime()) return refuse('archive_expired', `срок партии истёк ${batch.expiresAt.toISOString()}`, batch);

    const quota = await this.devices.getQuota(deviceId);
    const after = quota.buffer.usedBytes + batch.frozenBytes;
    if (after > quota.buffer.limitBytes) {
      return refuse(
        'insufficient_quota',
        `партия ${batch.frozenBytes} байт не помещается: занято ${quota.buffer.usedBytes} из ${quota.buffer.limitBytes}, стало бы ${after}`,
        batch,
      );
    }
    const out = await this.store.restoreBatch(batchId, now);
    if (out.refusal) return refuse(out.refusal.reason, out.refusal.detail, out.batch);
    return { ok: true, batch: out.batch!, restored: out.restored };
  }
}

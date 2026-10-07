/**
 * Понижение тарифа FREEZE-FIRST (#2587 b4; ADR-0031, решение 5 консилиума 05.10).
 *
 * ПОРЯДОК НЕСУЩИЙ: подтверждённый предпросмотр → заморозка на каждом узле с избытком → commit
 * тарифа → рассылка лимитов. Любой отказ или молчание media ДО commit — тариф НЕ меняется, ответ
 * несёт причину и партии `failed` по id. Обратный порядок («тариф → потом заморозим») оставил бы
 * прибор с лимитом ниже занятого и без права писать — ровно то, что сегодня и происходит.
 *
 * ИЗБЫТКА НЕТ — ОБЫЧНЫЙ ПУТЬ. Повышение, равный тариф и понижение без переполнения идут через
 * `TariffTransitionService.selectTariff` как раньше: заморозка — исключение M5 для избытка, а не
 * новый обряд на каждую смену тарифа.
 *
 * ИЗБЫТОК ЕСТЬ — НУЖЕН `planDigest` ПО КАЖДОМУ ТАКОМУ УЗЛУ. Без него `preview_required` с самим
 * предпросмотром в ответе: кабинет показывает, сколько уйдёт, человек подтверждает, и приказ
 * заморозки несёт тот хеш, который он видел. Протухший хеш отвергает сам сервер записей
 * (`plan_stale`) — здесь он не пересчитывается второй раз.
 *
 * СРОК — СНИМОК из `ARCHIVE_RETENTION_READER` (#2588): читается один раз на понижение и едет в
 * каждый приказ; media пишет `expiresAt = frozenAt + retentionDays`.
 *
 * ПОВТОР ЗАПРОСА С ТЕМ ЖЕ planDigest идемпотентен на стороне media (та же партия) — поэтому
 * обрыв между заморозкой и commit лечится повтором того же запроса, а не ручной разморозкой.
 */
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { isDowngrade, type DowngradeCriterion } from '../../domain/downgrade-policy';
import { loadTariffGrid } from '../../domain/tariff-grid-source';
import { PrismaService } from '../../prisma/prisma.service';
import { ARCHIVE_RETENTION_READER, type ArchiveRetentionReader } from '../archive-retention/archive-retention.store';
import { MembraneDowngradePolicyService } from '../membrane/membrane-downgrade-policy.service';
import {
  MediaDowngradeArchiveClient,
  type MediaDowngradePreview,
  type MediaDowngradeRefusal,
  type MediaFreezeAck,
} from '../pair/media-downgrade-archive.port';
import { MembraneContextFanoutService, type MembraneContextFanoutResult } from '../pair/membrane-context-fanout.service';

import { TariffTransitionService, type TransitionOutcome } from './tariff-transition.service';

const DAY_MS = 86_400_000;

export interface DowngradeNodePreview {
  readonly nodeId: string;
  readonly mediaDeviceId: string;
  readonly activeBufferBytes: number;
  readonly keepCount: number;
  readonly keepBytes: number;
  readonly freezeCount: number;
  readonly freezeBytes: number;
  readonly unmeasured: number;
  readonly planDigest: string;
  /** Есть что морозить — узел требует подтверждения. */
  readonly excess: boolean;
}

export interface DowngradePreviewPlan {
  readonly ok: true;
  readonly downgrade: true;
  readonly fromTariffId: string;
  readonly toTariffId: string;
  readonly criterion: DowngradeCriterion;
  readonly retentionDays: number;
  /** Оценка для показа: срок от момента предпросмотра; настоящий `expiresAt` поставит media при заморозке. */
  readonly expiresAtEstimate: string;
  readonly bufferLimitBytes: number;
  readonly nodes: readonly DowngradeNodePreview[];
  readonly requiresConfirmation: boolean;
}

export type DowngradePreviewOutcome =
  | { readonly ok: true; readonly downgrade: false; readonly fromTariffId: string; readonly toTariffId: string }
  | DowngradePreviewPlan
  | { readonly ok: false; readonly reason: 'membrane_unknown' | 'unknown_target_tariff' | 'same_tariff' | 'grid_unavailable' | 'media_unavailable'; readonly detail?: string };

export interface FrozenNode {
  readonly nodeId: string;
  readonly mediaDeviceId: string;
  readonly batchId: string;
  readonly frozenBytes: number;
  readonly expiresAt: string;
  readonly idempotent: boolean;
}

export interface FreezeFailure {
  readonly nodeId: string;
  readonly mediaDeviceId: string;
  readonly reason: string;
  readonly detail: string;
  /** Партия `failed`, если media её завела — для журнала и повторной заморозки. */
  readonly batchId: string | null;
}

export type DowngradeSelectOutcome =
  | (Extract<TransitionOutcome, { ok: true }> & { readonly contextSync: MembraneContextFanoutResult; readonly frozen?: readonly FrozenNode[] })
  | (Extract<TransitionOutcome, { ok: false }> & { readonly frozen?: readonly FrozenNode[]; readonly detail?: string })
  | { readonly ok: false; readonly reason: 'preview_required'; readonly preview: DowngradePreviewPlan }
  | { readonly ok: false; readonly reason: 'freeze_failed'; readonly failures: readonly FreezeFailure[]; readonly frozen: readonly FrozenNode[] };

export interface DowngradeSelectInput {
  readonly membraneId: string;
  readonly toTariffId: string;
  readonly actorId: string;
  /** `nodeId → planDigest` из подтверждённого предпросмотра. */
  readonly previewDigests?: Readonly<Record<string, string>>;
  readonly now?: Date;
}

@Injectable()
export class TariffDowngradeService {
  private readonly logger = new Logger(TariffDowngradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaDowngradeArchiveClient,
    @Inject(ARCHIVE_RETENTION_READER) private readonly retention: ArchiveRetentionReader,
    private readonly policy: MembraneDowngradePolicyService,
    private readonly transition: TariffTransitionService,
    private readonly contextFanout: MembraneContextFanoutService,
  ) {}

  /**
   * Общая голова предпросмотра и понижения: мембрана, цель, сетка, направление, режим, срок, узлы.
   * Один источник для обоих глаголов — чтобы `select` не судил по другим данным, чем `preview`.
   */
  private async context(membraneId: string, toTariffId: string): Promise<DowngradeContext | DowngradeContextStop> {
    const [membrane, target] = await Promise.all([
      this.prisma.membrane.findUnique({ where: { id: membraneId }, select: { id: true, tariffId: true } }),
      this.prisma.tariff.findUnique({ where: { id: toTariffId }, select: { id: true, bufferQuotaBytes: true } }),
    ]);
    if (!membrane) return { ok: false, reason: 'membrane_unknown' };
    if (!target) return { ok: false, reason: 'unknown_target_tariff' };
    if (membrane.tariffId === toTariffId) return { ok: false, reason: 'same_tariff' };
    const grid = loadTariffGrid();
    if (!grid) return { ok: false, reason: 'grid_unavailable' };
    const downgrade = isDowngrade(grid, membrane.tariffId, toTariffId);
    if (downgrade === null) return { ok: false, reason: 'unknown_target_tariff' };
    if (!downgrade) return { ok: true, downgrade: false, fromTariffId: membrane.tariffId, toTariffId };

    const [{ criterion }, retentionDays, devices] = await Promise.all([
      this.policy.read(membraneId),
      this.retention.daysFor(membraneId),
      this.prisma.device.findMany({ where: { node: { membraneId } }, select: { mediaDeviceId: true, nodeId: true } }),
    ]);
    return {
      ok: true,
      downgrade: true,
      fromTariffId: membrane.tariffId,
      toTariffId,
      criterion,
      retentionDays,
      bufferLimitBytes: Number(target.bufferQuotaBytes),
      devices,
    };
  }

  /** Предпросмотр по перечисленным узлам — ничего не меняет в media. */
  private async previewNodes(ctx: DowngradeContextPlan, devices: readonly DeviceRef[]): Promise<readonly DowngradeNodePreview[] | DowngradeContextStop> {
    const nodes: DowngradeNodePreview[] = [];
    for (const device of devices) {
      let plan: MediaDowngradePreview | MediaDowngradeRefusal;
      try {
        plan = await this.media.preview(device.mediaDeviceId, { criterion: ctx.criterion, bufferLimitBytes: ctx.bufferLimitBytes });
      } catch (err) {
        return { ok: false, reason: 'media_unavailable', detail: `узел ${device.nodeId}: ${messageOf(err)}` };
      }
      if (!plan.ok) {
        // Отказ домена media на предпросмотре (режим неизвестен серверу записей, лимит негоден) —
        // расхождение словарей или данных, не состояние буфера; наружу — как недоступность с причиной.
        return { ok: false, reason: 'media_unavailable', detail: `узел ${device.nodeId}: ${plan.reason} — ${plan.detail}` };
      }
      nodes.push({
        nodeId: device.nodeId,
        mediaDeviceId: device.mediaDeviceId,
        activeBufferBytes: plan.activeBufferBytes,
        keepCount: plan.keep.length,
        keepBytes: plan.keepBytes,
        freezeCount: plan.freeze.length,
        freezeBytes: plan.freezeBytes,
        unmeasured: plan.unmeasured,
        planDigest: plan.planDigest,
        excess: plan.freeze.length > 0,
      });
    }
    return nodes;
  }

  /** Что уйдёт в архив по узлам при переходе на `toTariffId`. Ничего не меняет ни здесь, ни в media. */
  async preview(membraneId: string, toTariffId: string, now: Date = new Date()): Promise<DowngradePreviewOutcome> {
    const ctx = await this.context(membraneId, toTariffId);
    if (!ctx.ok || !ctx.downgrade) return ctx;
    const nodes = await this.previewNodes(ctx, ctx.devices);
    if (!Array.isArray(nodes)) return nodes as DowngradeContextStop;
    return {
      ok: true,
      downgrade: true,
      fromTariffId: ctx.fromTariffId,
      toTariffId,
      criterion: ctx.criterion,
      retentionDays: ctx.retentionDays,
      expiresAtEstimate: new Date(now.getTime() + ctx.retentionDays * DAY_MS).toISOString(),
      bufferLimitBytes: ctx.bufferLimitBytes,
      nodes,
      requiresConfirmation: nodes.some((n) => n.excess),
    };
  }

  /**
   * Смена тарифа с заморозкой избытка ДО commit. Без избытка — обычный переход + рассылка.
   *
   * ХЕШ ПОДТВЕРЖДЕНИЯ СВЕРЯЕТ MEDIA, НЕ КАБИНЕТ (разбор Веснина, b4). Пересчитывать предпросмотр
   * здесь и сравнивать с ним значило бы спрашивать подтверждение на хеш, которого человек не видел:
   * любая запись на узле между показом и приказом меняла бы состав — и подтверждение не сходилось бы
   * само с собой. Кабинет передаёт хеши как факт подтверждения; протухший отвергает сервер записей
   * (`plan_stale`), и это единственный барьер. Своя проверка у кабинета одна — узлы БЕЗ подтверждения:
   * есть ли там избыток. Есть — `preview_required` с полным предпросмотром, человек должен увидеть.
   */
  async select(input: DowngradeSelectInput): Promise<DowngradeSelectOutcome> {
    const now = input.now ?? new Date();
    const ctx = await this.context(input.membraneId, input.toTariffId);
    if (!ctx.ok) return ctx.reason === 'media_unavailable' ? { ok: false, reason: 'media_unavailable', detail: ctx.detail } : { ok: false, reason: ctx.reason };
    if (!ctx.downgrade) return this.commitAndFanout(input, now);

    const digests = input.previewDigests ?? {};
    const confirmed = ctx.devices.filter((d) => typeof digests[d.nodeId] === 'string');
    const unconfirmed = ctx.devices.filter((d) => typeof digests[d.nodeId] !== 'string');

    if (unconfirmed.length > 0) {
      const nodes = await this.previewNodes(ctx, unconfirmed);
      if (!Array.isArray(nodes)) return { ok: false, reason: 'media_unavailable', detail: (nodes as DowngradeContextStop).detail };
      if (nodes.some((n) => n.excess)) {
        const preview = await this.preview(input.membraneId, input.toTariffId, now);
        if (!preview.ok) return preview.reason === 'media_unavailable' ? { ok: false, reason: 'media_unavailable', detail: preview.detail } : { ok: false, reason: preview.reason };
        if (!preview.downgrade) return this.commitAndFanout(input, now);
        return { ok: false, reason: 'preview_required', preview };
      }
    }
    if (confirmed.length === 0) return this.commitAndFanout(input, now);

    const frozen: FrozenNode[] = [];
    for (const node of confirmed) {
      let ack: MediaFreezeAck | MediaDowngradeRefusal;
      try {
        ack = await this.media.freeze(node.mediaDeviceId, {
          criterion: ctx.criterion,
          bufferLimitBytes: ctx.bufferLimitBytes,
          planDigest: digests[node.nodeId]!,
          retentionDays: ctx.retentionDays,
          membraneId: input.membraneId,
          fromTariffId: ctx.fromTariffId,
          toTariffId: ctx.toTariffId,
        });
      } catch (err) {
        // Первый же сбой останавливает цепочку: морозить остальные узлы под тариф, который не
        // сменится, значило бы плодить партии без причины. Уже замороженные названы в ответе.
        return { ok: false, reason: 'freeze_failed', frozen, failures: [{ nodeId: node.nodeId, mediaDeviceId: node.mediaDeviceId, reason: 'media_unavailable', detail: messageOf(err), batchId: null }] };
      }
      if (!ack.ok) {
        this.logger.warn(`заморозка узла ${node.nodeId} отклонена media: ${ack.reason} — ${ack.detail}; тариф мембраны ${input.membraneId} не меняется`);
        return { ok: false, reason: 'freeze_failed', frozen, failures: [{ nodeId: node.nodeId, mediaDeviceId: node.mediaDeviceId, reason: ack.reason, detail: ack.detail, batchId: ack.batch?.batchId ?? null }] };
      }
      frozen.push({
        nodeId: node.nodeId,
        mediaDeviceId: node.mediaDeviceId,
        batchId: ack.batch.batchId,
        frozenBytes: ack.batch.frozenBytes,
        expiresAt: ack.batch.expiresAt,
        idempotent: ack.idempotent,
      });
    }

    const outcome = await this.commitAndFanout(input, now);
    return { ...outcome, frozen };
  }

  private async commitAndFanout(input: DowngradeSelectInput, now: Date): Promise<DowngradeSelectOutcome> {
    const outcome = await this.transition.selectTariff({
      membraneId: input.membraneId,
      toTariffId: input.toTariffId,
      actorId: input.actorId,
      now,
    });
    if (!outcome.ok) return outcome;
    const contextSync = await this.contextFanout.syncAllNodes(input.membraneId);
    return { ...outcome, contextSync };
  }
}

interface DeviceRef {
  readonly mediaDeviceId: string;
  readonly nodeId: string;
}

type DowngradeContextStop = Extract<DowngradePreviewOutcome, { ok: false }>;

interface DowngradeContextPlan {
  readonly ok: true;
  readonly downgrade: true;
  readonly fromTariffId: string;
  readonly toTariffId: string;
  readonly criterion: DowngradeCriterion;
  readonly retentionDays: number;
  readonly bufferLimitBytes: number;
  readonly devices: readonly DeviceRef[];
}

type DowngradeContext = DowngradeContextStop | Extract<DowngradePreviewOutcome, { downgrade: false }> | DowngradeContextPlan;

function messageOf(err: unknown): string {
  if (err instanceof ServiceUnavailableException) return err.message;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Возврат из архива понижения рукой пользователя (#2619, хвост b5 #2587; ADR-0031, решение
 * владельца 05.10: разморозка — целой партией, только пока не истёк срок и только если помещается).
 *
 * Кабинет партий НЕ хранит — дом истины о них сервер записей. Здесь две вещи: собрать партии по
 * узлам мембраны сессии и не дать вернуть чужую партию. ПРИНАДЛЕЖНОСТЬ судится дважды: партия
 * должна лежать на приборе узла этой мембраны И нести `membraneId` этой мембраны — прибор мог
 * сменить владельца, а его старые партии остаются за прежним. Чужая партия неотличима от
 * несуществующей (`batch_not_found`): иначе дверь подтверждала бы чужие id.
 *
 * Отказы media (`archive_expired`, `batch_not_frozen`, `insufficient_quota`, `batch_not_found`)
 * уходят наружу КАК ЕСТЬ; недоступность media — значение `media_unavailable`, не 5xx: страница
 * должна сказать «сервер записей не ответил», а не упасть.
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { MediaDowngradeArchiveClient, type MediaArchiveBatchRow } from '../pair/media-downgrade-archive.port';

/** Партия для страницы: только то, что рисуется; `expiresAt` — день удаления. */
export interface ArchiveBatchItem {
  readonly batchId: string;
  readonly state: string;
  readonly frozenAt: string;
  readonly expiresAt: string;
  readonly frozenBytes: number;
  readonly sampleCount: number;
}

/** Узел мембраны с партиями; `unavailable` — media не ответила по этому узлу (прочие показаны). */
export type ArchiveNodeView =
  | { readonly nodeId: string; readonly batches: readonly ArchiveBatchItem[] }
  | { readonly nodeId: string; readonly unavailable: string };

export type ArchiveRestoreOutcome =
  | { readonly ok: true; readonly nodeId: string; readonly batch: ArchiveBatchItem; readonly restored: number }
  | { readonly ok: false; readonly reason: string; readonly detail: string };

interface DeviceRef {
  readonly mediaDeviceId: string;
  readonly nodeId: string;
}

function itemOf(row: Pick<MediaArchiveBatchRow, keyof ArchiveBatchItem>): ArchiveBatchItem {
  return {
    batchId: row.batchId,
    state: row.state,
    frozenAt: row.frozenAt,
    expiresAt: row.expiresAt,
    frozenBytes: row.frozenBytes,
    sampleCount: row.sampleCount,
  };
}

function messageOf(err: unknown): string {
  if (err instanceof ServiceUnavailableException) return err.message;
  return err instanceof Error ? err.message : String(err);
}

/** Партии архива понижения по узлам мембраны и возврат партии целиком. */
@Injectable()
export class TariffArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaDowngradeArchiveClient,
  ) {}

  private devices(membraneId: string): Promise<DeviceRef[]> {
    return this.prisma.device.findMany({ where: { node: { membraneId } }, select: { mediaDeviceId: true, nodeId: true } });
  }

  /** Партии своей мембраны на приборе; чужие (прибор сменил владельца) отсеяны. */
  private async ownBatches(membraneId: string, device: DeviceRef): Promise<MediaArchiveBatchRow[]> {
    const rows = await this.media.listBatches(device.mediaDeviceId);
    return rows.filter((b) => b.membraneId === membraneId);
  }

  /** Партии по всем узлам мембраны; недоступность media по узлу — пометка узла, не отказ целиком. */
  async list(membraneId: string): Promise<{ readonly nodes: readonly ArchiveNodeView[] }> {
    const nodes: ArchiveNodeView[] = [];
    for (const device of await this.devices(membraneId)) {
      try {
        nodes.push({ nodeId: device.nodeId, batches: (await this.ownBatches(membraneId, device)).map(itemOf) });
      } catch (err) {
        nodes.push({ nodeId: device.nodeId, unavailable: messageOf(err) });
      }
    }
    return { nodes };
  }

  /**
   * Вернуть партию в живой буфер: только свою; отказ media — как есть.
   *
   * Молчание одного прибора не решает за остальных (разбор Дынина п.2): партию ищем на всех
   * приборах узлов; `media_unavailable` — только если её не нашли нигде, а кто-то не ответил.
   */
  async restore(membraneId: string, batchId: string): Promise<ArchiveRestoreOutcome> {
    let unavailable: string | null = null;
    for (const device of await this.devices(membraneId)) {
      let own: MediaArchiveBatchRow[];
      try {
        own = await this.ownBatches(membraneId, device);
      } catch (err) {
        unavailable ??= `узел ${device.nodeId}: ${messageOf(err)}`;
        continue;
      }
      if (!own.some((b) => b.batchId === batchId)) continue;
      try {
        const ack = await this.media.restore(device.mediaDeviceId, batchId);
        if (!ack.ok) return { ok: false, reason: ack.reason, detail: ack.detail };
        return { ok: true, nodeId: device.nodeId, batch: itemOf(ack.batch), restored: ack.restored.length };
      } catch (err) {
        return { ok: false, reason: 'media_unavailable', detail: `узел ${device.nodeId}: ${messageOf(err)}` };
      }
    }
    if (unavailable) return { ok: false, reason: 'media_unavailable', detail: unavailable };
    return { ok: false, reason: 'batch_not_found', detail: `партии ${batchId} у узлов мембраны нет` };
  }
}

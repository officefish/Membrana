/**
 * Порт дверей архива понижения сервера записей (#2587 b4; контракт — ADR-0031 и b3b:
 * `POST /v1/devices/:id/downgrade-archive/preview|freeze`).
 *
 * Отдельный класс рядом с `MediaBridgeService`, а не разбор ответов в нём: мост правится соседями,
 * а этот порт живёт и умирает с понижением. ТРАНСПОРТА ЗДЕСЬ НЕТ (зуб `network:bare-fetch`, как у
 * порта чарт-листа `media-run.port.ts`): запрос уходит через `MediaBridgeService.requestDowngradeArchive`
 * — тот же адрес, токен, правило заголовков и разбор недоступности, что у всего разговора кабинета
 * с media. ДВЕ ФОРМЫ ОТВЕТА дверей media читаются здесь по телу: `ok: false` + `reason` — доменный
 * отказ (возвращается как значение), не-2xx или тело без `ok` — транспорт (исключение
 * `ServiceUnavailableException`, оркестратор переводит в `media_unavailable`).
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { DowngradeCriterion } from '../../domain/downgrade-policy';

import { MediaBridgeService, type DowngradeArchiveDoor } from './media-bridge.service';

export interface MediaDowngradeRefusal {
  readonly ok: false;
  readonly reason: string;
  readonly detail: string;
  readonly batch?: MediaDowngradeBatch | null;
}

export interface MediaDowngradePlanRow {
  readonly sampleId: string;
  readonly title: string;
  readonly bytes: number;
  readonly createdAt: string;
  readonly pinned: boolean;
  readonly modeRank: number | null;
}

/** Ответ `preview` — ровно то, что рисует кабинет и что нужно приказу: состав, байты, хеш. */
export interface MediaDowngradePreview {
  readonly ok: true;
  readonly criterion: DowngradeCriterion;
  readonly bufferLimitBytes: number;
  readonly activeBufferBytes: number;
  readonly keep: readonly MediaDowngradePlanRow[];
  readonly freeze: readonly MediaDowngradePlanRow[];
  readonly keepBytes: number;
  readonly freezeBytes: number;
  readonly measured: number;
  readonly unmeasured: number;
  readonly failedTail: { readonly sampleIds: readonly string[]; readonly bytes: number };
  readonly planDigest: string;
  readonly measuredMs: number;
}

export interface MediaDowngradeBatch {
  readonly batchId: string;
  readonly state: string;
  readonly frozenAt: string;
  readonly expiresAt: string;
  readonly frozenBytes: number;
  readonly keptBytes: number;
  readonly sampleCount: number;
}

export interface MediaFreezeAck {
  readonly ok: true;
  readonly idempotent: boolean;
  readonly batch: MediaDowngradeBatch;
  readonly adopted: number;
  readonly activeBufferBytes: number | null;
}

/** Партия в списке media (`GET batches`): снимок с владельцем и сроком (#2619). */
export interface MediaArchiveBatchRow extends MediaDowngradeBatch {
  readonly membraneId: string;
  readonly retentionDays: number;
  readonly fromTariffId: string;
  readonly toTariffId: string;
}

/** Ответ `restore`: партия целиком вернулась в живой буфер. */
export interface MediaRestoreAck {
  readonly ok: true;
  readonly batch: MediaDowngradeBatch;
  readonly restored: readonly string[];
}

export interface MediaFreezeOrder {
  readonly criterion: DowngradeCriterion;
  readonly bufferLimitBytes: number;
  readonly planDigest: string;
  readonly retentionDays: number;
  readonly membraneId: string;
  readonly fromTariffId: string;
  readonly toTariffId: string;
}

/** Порт дверей архива понижения media (`preview`/`freeze`/`batches`/`restore`); транспорт — мост кабинета. */
@Injectable()
export class MediaDowngradeArchiveClient {
  constructor(private readonly bridge: MediaBridgeService) {}

  private async post<T>(deviceId: string, door: DowngradeArchiveDoor, body?: unknown): Promise<T | MediaDowngradeRefusal> {
    // Недоступность сети мост сам переводит в ServiceUnavailableException («Media server unreachable»).
    const res = await this.bridge.requestDowngradeArchive(deviceId, door, body);
    // 200 и 201 — обе законные формы (отказ домена и сделано); прочее — транспорт.
    if (res.status !== 200 && res.status !== 201) {
      const detail = await res.text().catch(() => res.statusText);
      throw new ServiceUnavailableException(`Media downgrade-archive ${door} failed (${res.status}): ${detail}`);
    }
    const parsed = (await res.json().catch(() => null)) as T | MediaDowngradeRefusal | null;
    if (!parsed || typeof parsed !== 'object' || !('ok' in parsed)) {
      throw new ServiceUnavailableException(`Media downgrade-archive ${door}: ответ без поля ok`);
    }
    return parsed;
  }

  /** Предпросмотр по одному прибору: ничего не меняет на сервере записей. */
  preview(deviceId: string, input: { criterion: DowngradeCriterion; bufferLimitBytes: number }): Promise<MediaDowngradePreview | MediaDowngradeRefusal> {
    return this.post<MediaDowngradePreview>(deviceId, 'preview', input);
  }

  /** Приказ заморозки по подтверждённому плану — ДО commit тарифа (решение 5). */
  freeze(deviceId: string, order: MediaFreezeOrder): Promise<MediaFreezeAck | MediaDowngradeRefusal> {
    return this.post<MediaFreezeAck>(deviceId, 'freeze', order);
  }

  /** Партии прибора (#2619). Отказа домена у списка нет: не-200 или тело без `batches` — транспорт. */
  async listBatches(deviceId: string): Promise<readonly MediaArchiveBatchRow[]> {
    const res = await this.bridge.requestDowngradeArchive(deviceId, 'batches');
    if (res.status !== 200) {
      const detail = await res.text().catch(() => res.statusText);
      throw new ServiceUnavailableException(`Media downgrade-archive batches failed (${res.status}): ${detail}`);
    }
    const parsed = (await res.json().catch(() => null)) as { batches?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.batches)) {
      throw new ServiceUnavailableException('Media downgrade-archive batches: ответ без списка batches');
    }
    return parsed.batches as MediaArchiveBatchRow[];
  }

  /** Возврат партии целиком (#2619): 201 — вернули, 200 — отказ домена media значением. */
  restore(deviceId: string, batchId: string): Promise<MediaRestoreAck | MediaDowngradeRefusal> {
    return this.post<MediaRestoreAck>(deviceId, `batches/${encodeURIComponent(batchId)}/restore`);
  }
}

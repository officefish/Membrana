import { Inject, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import type { ArchivariusSessionPassport, ArchivariusSpan, ArchivariusStore } from './archivarius.types';
import {
  compareSpanOrder,
  decodeSpanCursor,
  encodeSpanCursor,
  spanMetaOf,
  type ArchivariusPagedSearchQuery,
  type ArchivariusQueryableStore,
  type ArchivariusSearchPage,
} from './archivarius.service';

type MongoCursorLike<T> = { toArray(): Promise<T[]> };

type MongoClientLike = {
  db(name?: string): { collection(name: string): MongoCollectionLike };
  close(): Promise<void>;
  connect(): Promise<MongoClientLike>;
};

type MongoCollectionLike = {
  createIndex(keys: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  bulkWrite(ops: unknown[], options?: Record<string, unknown>): Promise<unknown>;
  findOne(query: Record<string, unknown>, options?: Record<string, unknown>): Promise<ArchivariusSpan | null>;
  find(query?: Record<string, unknown>, options?: Record<string, unknown>): MongoCursorLike<ArchivariusSpan>;
  aggregate(pipeline: Array<Record<string, unknown>>, options?: Record<string, unknown>): MongoCursorLike<Record<string, unknown>>;
};

async function loadMongoClientCtor(): Promise<new (uri: string) => MongoClientLike> {
  try {
    const loader = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<{ MongoClient: new (uri: string) => MongoClientLike }>;
    return (await loader('mongodb')).MongoClient;
  } catch (error) {
    throw new ServiceUnavailableException({
      code: 'ARCHIVARIUS_MONGODB_DRIVER_MISSING',
      message: 'MongoDB включен через ARCHIVARIUS_MONGO_URI, но пакет mongodb недоступен',
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Диапазонное условие «строго после тройки курсора» при сортировке {ts, sessionId, uuid}. */
function afterCursorFilter(after: { ts: string; sessionId: string; uuid: string }): Record<string, unknown> {
  return {
    $or: [
      { ts: { $gt: after.ts } },
      { ts: after.ts, sessionId: { $gt: after.sessionId } },
      { ts: after.ts, sessionId: after.sessionId, uuid: { $gt: after.uuid } },
    ],
  };
}

@Injectable()
export class MongoArchivariusStore implements ArchivariusStore, ArchivariusQueryableStore, OnModuleDestroy {
  private client: MongoClientLike | null = null;
  private collection: MongoCollectionLike | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private async spans(): Promise<MongoCollectionLike> {
    if (this.collection) return this.collection;
    if (!this.config.ARCHIVARIUS_MONGO_URI) {
      throw new ServiceUnavailableException('ARCHIVARIUS_MONGO_URI is required for MongoArchivariusStore');
    }
    const MongoClient = await loadMongoClientCtor();
    this.client = await new MongoClient(this.config.ARCHIVARIUS_MONGO_URI).connect();
    this.collection = this.client
      .db(this.config.ARCHIVARIUS_MONGO_DB ?? 'membrana_archivarius')
      .collection('spans');
    await this.collection.createIndex({ sessionId: 1, uuid: 1 }, { unique: true });
    await this.collection.createIndex({ ts: 1 });
    // Инвариант курсора (контекст Дынина 04.08): страница держится только на ПОЛНОЙ
    // трёхпольной сортировке — под неё составной индекс, равные ts — норма.
    await this.collection.createIndex({ ts: 1, sessionId: 1, uuid: 1 });
    await this.collection.createIndex({ actor: 1, ts: 1 });
    await this.collection.createIndex({ replyType: 1, ts: 1 });
    await this.collection.createIndex({ bytes: 'text' });
    return this.collection;
  }

  async upsertSpans(spans: ArchivariusSpan[]): Promise<{ accepted: number; maskedLines: number }> {
    if (spans.length === 0) return { accepted: 0, maskedLines: 0 };
    const collection = await this.spans();
    await collection.bulkWrite(
      spans.map((span) => ({
        updateOne: {
          filter: { sessionId: span.sessionId, uuid: span.uuid },
          update: { $set: span },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    return { accepted: spans.length, maskedLines: spans.filter((span) => span.masked).length };
  }

  async getSpan(sessionId: string, uuid: string): Promise<ArchivariusSpan | null> {
    return (await this.spans()).findOne({ sessionId, uuid }, { projection: { _id: 0 } });
  }

  async listSpans(): Promise<ArchivariusSpan[]> {
    return (await this.spans()).find({}, { projection: { _id: 0 } }).toArray();
  }

  /**
   * Поиск запросом по индексам, а не вычиткой корпуса (обзор 04.08, П2). Text-фильтр —
   * $text по индексу bytes:'text': слова со стеммингом, БЕЗ substring и БЕЗ префиксов
   * (семантика названа в контракте сервиса). Страница — мета без bytes.
   */
  async searchSpans(query: ArchivariusPagedSearchQuery & { limit: number }): Promise<ArchivariusSearchPage> {
    const collection = await this.spans();
    const clauses: Array<Record<string, unknown>> = [];
    if (query.text) clauses.push({ $text: { $search: query.text } });
    if (query.actor) clauses.push({ actor: query.actor });
    if (query.replyType) clauses.push({ replyType: query.replyType });
    if (query.from) clauses.push({ ts: { $gte: query.from } });
    if (query.to) clauses.push({ ts: { $lte: query.to } });
    const after = query.cursor ? decodeSpanCursor(query.cursor) : null;
    if (after) clauses.push(afterCursorFilter(after));
    const filter = clauses.length === 0 ? {} : { $and: clauses };
    const rows = await collection
      .find(filter, {
        projection: { _id: 0, bytes: 0, maskedCuts: 0 },
        sort: { ts: 1, sessionId: 1, uuid: 1 },
        limit: query.limit + 1,
      })
      .toArray();
    const items = rows.slice(0, query.limit).map((row) => spanMetaOf({ ...row, bytes: '' } as ArchivariusSpan));
    const nextCursor = rows.length > query.limit && items.length > 0 ? encodeSpanCursor(items[items.length - 1]!) : null;
    return { items, nextCursor };
  }

  async decomposeSpans(by: 'sessions' | 'days' | 'actors'): Promise<Array<{ key: string; spans: number; sessions: number; maskedLines: number }>> {
    const collection = await this.spans();
    const keyExpr =
      by === 'days'
        ? { $ifNull: [{ $substrCP: ['$ts', 0, 10] }, 'unknown-day'] }
        : by === 'actors'
          ? { $ifNull: ['$actor', 'unknown'] }
          : { $ifNull: ['$sessionId', 'unknown-session'] };
    const rows = await collection
      .aggregate([
        {
          $group: {
            _id: keyExpr,
            spans: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
            maskedLines: { $sum: { $cond: ['$masked', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    return rows.map((row) => ({
      key: String(row._id ?? ''),
      spans: Number(row.spans ?? 0),
      sessions: Array.isArray(row.sessions) ? row.sessions.length : 0,
      maskedLines: Number(row.maskedLines ?? 0),
    }));
  }

  async sessionPassport(sessionId: string): Promise<ArchivariusSessionPassport | null> {
    const collection = await this.spans();
    const rows = await collection
      .aggregate([
        { $match: { sessionId } },
        {
          $group: {
            _id: '$sessionId',
            spans: { $sum: 1 },
            firstTs: { $min: '$ts' },
            lastTs: { $max: '$ts' },
            actors: { $addToSet: '$actor' },
            replyTypes: { $addToSet: '$replyType' },
            maskedLines: { $sum: { $cond: ['$masked', 1, 0] } },
            sourcePaths: { $addToSet: '$sourcePath' },
          },
        },
      ])
      .toArray();
    const row = rows[0];
    if (!row) return null;
    return {
      sessionId,
      spans: Number(row.spans ?? 0),
      firstTs: (row.firstTs as string | undefined) ?? null,
      lastTs: (row.lastTs as string | undefined) ?? null,
      actors: (Array.isArray(row.actors) ? (row.actors as string[]) : []).filter(Boolean).sort(),
      replyTypes: (Array.isArray(row.replyTypes) ? (row.replyTypes as string[]) : []).filter(Boolean).sort(),
      maskedLines: Number(row.maskedLines ?? 0),
      sourcePaths: (Array.isArray(row.sourcePaths) ? (row.sourcePaths as Array<string | null>) : [])
        .filter((p): p is string => Boolean(p))
        .sort(),
    };
  }

  async auditTotals(): Promise<{ spans: number; sessions: number; maskedLines: number }> {
    const collection = await this.spans();
    const rows = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            spans: { $sum: 1 },
            sessions: { $addToSet: '$sessionId' },
            maskedLines: { $sum: { $cond: ['$masked', 1, 0] } },
          },
        },
      ])
      .toArray();
    const row = rows[0];
    return {
      spans: Number(row?.spans ?? 0),
      sessions: Array.isArray(row?.sessions) ? (row!.sessions as unknown[]).length : 0,
      maskedLines: Number(row?.maskedLines ?? 0),
    };
  }

  /** Дубликаты — отдельной агрегацией (приговор Дынина: не работа курсорного обхода). */
  async auditDuplicates(): Promise<string[]> {
    const collection = await this.spans();
    const rows = await collection
      .aggregate([
        { $group: { _id: { sessionId: '$sessionId', uuid: '$uuid' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();
    return rows.map((row) => {
      const id = row._id as { sessionId?: string; uuid?: string } | undefined;
      return `span://${id?.sessionId ?? ''}/${id?.uuid ?? ''}`;
    });
  }

  /** Целостность (sha256 требует чтения bytes) — батчами по курсорной тройке, не одним массивом. */
  async iterateIntegrity(
    onBatch: (batch: Array<Pick<ArchivariusSpan, 'sessionId' | 'uuid' | 'ts' | 'bytes' | 'sha256'>>) => void,
    batchSize = 1000,
  ): Promise<void> {
    const collection = await this.spans();
    let after: { ts: string; sessionId: string; uuid: string } | null = null;
    for (;;) {
      const filter: Record<string, unknown> = after ? afterCursorFilter(after) : {};
      const batch: ArchivariusSpan[] = await collection
        .find(filter, {
          projection: { _id: 0, sessionId: 1, uuid: 1, ts: 1, bytes: 1, sha256: 1 },
          sort: { ts: 1, sessionId: 1, uuid: 1 },
          limit: batchSize,
        })
        .toArray();
      if (batch.length === 0) return;
      onBatch(batch);
      const last: ArchivariusSpan = batch[batch.length - 1]!;
      const next: { ts: string; sessionId: string; uuid: string } = { ts: last.ts, sessionId: last.sessionId, uuid: last.uuid };
      // Страховка от зацикливания на данных, ломающих порядок (пустые ts у мусорных строк).
      if (after && compareSpanOrder(next, after) <= 0) return;
      after = next;
      if (batch.length < batchSize) return;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    await this.client?.close();
    this.client = null;
    this.collection = null;
  }
}

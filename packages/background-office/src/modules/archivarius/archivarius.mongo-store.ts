import { Inject, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import type { ArchivariusSpan, ArchivariusStore } from './archivarius.types';

type MongoClientLike = {
  db(name?: string): { collection(name: string): MongoCollectionLike };
  close(): Promise<void>;
  connect(): Promise<MongoClientLike>;
};

type MongoCollectionLike = {
  createIndex(keys: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  bulkWrite(ops: unknown[], options?: Record<string, unknown>): Promise<unknown>;
  findOne(query: Record<string, unknown>, options?: Record<string, unknown>): Promise<ArchivariusSpan | null>;
  find(query?: Record<string, unknown>, options?: Record<string, unknown>): { toArray(): Promise<ArchivariusSpan[]> };
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

@Injectable()
export class MongoArchivariusStore implements ArchivariusStore, OnModuleDestroy {
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

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    await this.client?.close();
    this.client = null;
    this.collection = null;
  }
}

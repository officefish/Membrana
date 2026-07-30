import { Inject, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';

import type { AppConfig } from '../../../config/env.schema';
import { APP_CONFIG } from '../../../config/config.tokens';
import type { StoredTaskClosureRecord, TaskClosureRecord } from '../contracts';
import type { TaskArchivePutResult, TaskArchiveStore } from './task-archive.store';

type MongoClientLike = {
  db(name?: string): { collection(name: string): MongoCollectionLike };
  close(): Promise<void>;
  connect(): Promise<MongoClientLike>;
};

type MongoCollectionLike = {
  createIndex(keys: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  insertOne(document: StoredTaskClosureRecord): Promise<unknown>;
  findOne(
    query: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<StoredTaskClosureRecord | null>;
  find(query?: Record<string, unknown>, options?: Record<string, unknown>): {
    sort(sort: Record<string, 1 | -1>): { toArray(): Promise<StoredTaskClosureRecord[]> };
  };
};

async function loadMongoClientCtor(): Promise<new (uri: string) => MongoClientLike> {
  try {
    const loader = new Function('specifier', 'return import(specifier)') as (
      specifier: string,
    ) => Promise<{ MongoClient: new (uri: string) => MongoClientLike }>;
    return (await loader('mongodb')).MongoClient;
  } catch (error) {
    throw new ServiceUnavailableException({
      code: 'TASK_ARCHIVE_MONGODB_DRIVER_MISSING',
      message: 'MongoDB включен через TASK_ARCHIVE_MONGO_URI, но пакет mongodb недоступен',
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

@Injectable()
export class MongoTaskArchiveStore implements TaskArchiveStore, OnModuleDestroy {
  private client: MongoClientLike | null = null;
  private collection: MongoCollectionLike | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private async closures(): Promise<MongoCollectionLike> {
    if (this.collection) return this.collection;
    if (!this.config.TASK_ARCHIVE_MONGO_URI) {
      throw new ServiceUnavailableException('TASK_ARCHIVE_MONGO_URI is required for MongoTaskArchiveStore');
    }
    const MongoClient = await loadMongoClientCtor();
    this.client = await new MongoClient(this.config.TASK_ARCHIVE_MONGO_URI).connect();
    this.collection = this.client
      .db(this.config.TASK_ARCHIVE_MONGO_DB ?? 'membrana_task_archive')
      .collection('task_closure_records');
    await this.collection.createIndex({ recordType: 1, taskId: 1 }, { unique: true });
    await this.collection.createIndex({ epic_id: 1, closedAt: 1 });
    await this.collection.createIndex({ actor: 1, notarizedAt: 1 });
    await this.collection.createIndex({ recordHash: 1 });
    return this.collection;
  }

  async putClosureRecord(
    record: TaskClosureRecord,
    recordHash: string,
    notarizedAt: string,
  ): Promise<TaskArchivePutResult> {
    const collection = await this.closures();
    const existing = await this.getClosureRecord(record.taskId);
    if (existing) {
      return existing.recordHash === recordHash
        ? { status: 'existing_equiv', record: existing }
        : { status: 'conflict', existing, incomingHash: recordHash };
    }

    const stored: StoredTaskClosureRecord = { ...record, recordHash, notarizedAt };
    try {
      await collection.insertOne(stored);
      return { status: 'created', record: stored };
    } catch (error) {
      const raced = await this.getClosureRecord(record.taskId);
      if (raced?.recordHash === recordHash) {
        return { status: 'existing_equiv', record: raced };
      }
      if (raced) {
        return { status: 'conflict', existing: raced, incomingHash: recordHash };
      }
      throw error;
    }
  }

  async listClosureRecords(): Promise<StoredTaskClosureRecord[]> {
    return (await this.closures())
      .find({}, { projection: { _id: 0 } })
      .sort({ closedAt: 1, taskId: 1 })
      .toArray();
  }

  async getClosureRecord(taskId: string): Promise<StoredTaskClosureRecord | null> {
    return (await this.closures()).findOne({ recordType: 'task_closure', taskId }, { projection: { _id: 0 } });
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

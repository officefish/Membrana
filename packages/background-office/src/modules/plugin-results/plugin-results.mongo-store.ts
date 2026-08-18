import { Inject, Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import type { PluginResultsStore, ReadRunsFilter, RunRecord, StateRecord } from './plugin-results.types';

const PLUGIN_RESULTS_COLLECTION = 'plugin-results';

type RunDocument = RunRecord & {
  pluginId: RunRecord['address']['pluginId'];
  version: string;
  collectionId: string;
  runId: string;
  mountTarget: RunRecord['address']['mountTarget'];
  stateRecord: StateRecord;
};

type MongoCollectionLike = {
  createIndex(keys: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  find(filter: Record<string, unknown>, options?: Record<string, unknown>): { toArray(): Promise<RunDocument[]> };
};

type MongoClientLike = { db(name?: string): { collection(name: string): MongoCollectionLike }; close(): Promise<void> };

async function loadMongoClientCtor(): Promise<new (uri: string) => { connect(): Promise<MongoClientLike> }> {
  const mod = (await import('mongodb')) as { MongoClient?: new (uri: string) => { connect(): Promise<MongoClientLike> } };
  if (!mod.MongoClient) throw new ServiceUnavailableException('mongodb package is not available');
  return mod.MongoClient;
}

@Injectable()
export class MongoPluginResultsStore implements PluginResultsStore, OnModuleDestroy {
  private client: MongoClientLike | null = null;
  private collection: MongoCollectionLike | null = null;
  private collectionPromise: Promise<MongoCollectionLike> | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  protected async connect(uri: string): Promise<MongoClientLike> {
    const MongoClient = await loadMongoClientCtor();
    return new MongoClient(uri).connect();
  }

  private async results(): Promise<MongoCollectionLike> {
    if (this.collection) return this.collection;
    if (this.collectionPromise) return this.collectionPromise;
    const mongoUri = this.config.PLUGIN_RESULTS_MONGO_URI ?? this.config.ARCHIVARIUS_MONGO_URI;
    if (!mongoUri) {
      throw new ServiceUnavailableException('PLUGIN_RESULTS_MONGO_URI or ARCHIVARIUS_MONGO_URI is required');
    }
    this.collectionPromise = this.initResults(mongoUri);
    return this.collectionPromise;
  }

  private async initResults(mongoUri: string): Promise<MongoCollectionLike> {
    this.client = await this.connect(mongoUri);
    const collection = this.client
      .db(this.config.PLUGIN_RESULTS_MONGO_DB ?? this.config.ARCHIVARIUS_MONGO_DB ?? 'membrana_archivarius')
      .collection(PLUGIN_RESULTS_COLLECTION);
    await collection.createIndex({ pluginId: 1, version: 1, collectionId: 1, runId: 1 }, { unique: true });
    await collection.createIndex({ pluginId: 1, version: 1, collectionId: 1, kind: 1, completedAt: -1 });
    this.collection = collection;
    return collection;
  }

  async writeRun(run: RunRecord, state: StateRecord): Promise<void> {
    const { pluginId, version, collectionId, runId, mountTarget } = run.address;
    await (await this.results()).updateOne(
      { pluginId, version, collectionId, runId },
      { $set: { ...run, pluginId, version, collectionId, runId, mountTarget, stateRecord: { ...state } } },
      { upsert: true },
    );
  }

  async readRuns(filter: ReadRunsFilter): Promise<RunRecord[]> {
    const query: Record<string, unknown> = { collectionId: filter.collectionId };
    if (filter.pluginId) query.pluginId = filter.pluginId;
    if (filter.version) query.version = filter.version;
    if (filter.kind) query.kind = filter.kind;
    const rows = await (await this.results())
      .find(query, {
        projection: { _id: 0, stateRecord: 0 },
        sort: { completedAt: -1 },
        limit: filter.limit ?? 50,
      })
      .toArray();
    return rows.map(({ pluginId, version, collectionId, runId, mountTarget, stateRecord: _stateRecord, ...run }) => ({
      ...run,
      address: { pluginId, version, collectionId, runId, mountTarget },
    }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
    this.client = null;
    this.collection = null;
    this.collectionPromise = null;
  }
}

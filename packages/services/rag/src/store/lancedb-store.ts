import { mkdir } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import * as lancedb from '@lancedb/lancedb';

import type { IndexedChunk, ScoredChunk } from '../types.js';

export const RAG_TABLE_NAME = 'membrana_rag_chunks';

export interface LanceDbRow {
  id: string;
  text: string;
  vector: number[];
  source: string;
  type: string;
  timestamp: string;
  tags: string;
  priority: number;
  chunkIndex: number;
  isHistorical: boolean;
  status: string;
  headingPath: string;
}

/** LanceDB JS API expects Record rows; our typed row lacks an index signature. */
function toLanceDbRecords(rows: readonly LanceDbRow[]): Record<string, unknown>[] {
  return rows as unknown as Record<string, unknown>[];
}

export class LanceDbStore {
  private readonly dbUri: string;

  constructor(repoRoot: string, lanceDbPath: string) {
    const root = resolve(repoRoot);
    this.dbUri = isAbsolute(lanceDbPath) ? lanceDbPath : resolve(root, lanceDbPath);
  }

  get databasePath(): string {
    return this.dbUri;
  }

  async connect(): Promise<lancedb.Connection> {
    await mkdir(this.dbUri, { recursive: true });
    return lancedb.connect(this.dbUri);
  }

  async hasIndex(): Promise<boolean> {
    const db = await this.connect();
    const names = await db.tableNames();
    if (!names.includes(RAG_TABLE_NAME)) {
      return false;
    }
    const table = await db.openTable(RAG_TABLE_NAME);
    const count = await table.countRows();
    return count > 0;
  }

  async recreateTable(rows: readonly LanceDbRow[]): Promise<void> {
    const db = await this.connect();
    const names = await db.tableNames();
    if (names.includes(RAG_TABLE_NAME)) {
      await db.dropTable(RAG_TABLE_NAME);
    }
    if (rows.length === 0) {
      return;
    }
    await db.createTable(RAG_TABLE_NAME, toLanceDbRecords(rows));
  }

  async deleteBySource(source: string): Promise<void> {
    const db = await this.connect();
    const names = await db.tableNames();
    if (!names.includes(RAG_TABLE_NAME)) {
      return;
    }
    const table = await db.openTable(RAG_TABLE_NAME);
    const escaped = source.replace(/'/g, "''");
    await table.delete(`source = '${escaped}'`);
  }

  async upsertSourceRows(rows: readonly LanceDbRow[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const db = await this.connect();
    const names = await db.tableNames();
    if (!names.includes(RAG_TABLE_NAME)) {
      await db.createTable(RAG_TABLE_NAME, toLanceDbRecords(rows));
      return;
    }
    const table = await db.openTable(RAG_TABLE_NAME);
    await table.add(toLanceDbRecords(rows));
  }

  async query(vector: readonly number[], topK: number): Promise<ScoredChunk[]> {
    const db = await this.connect();
    const table = await db.openTable(RAG_TABLE_NAME);
    const results = await table.search([...vector]).limit(topK).toArray();

    return results.map((row) => {
      const record = row as Record<string, unknown>;
      const distance = typeof record._distance === 'number' ? record._distance : 0;
      const score = 1 / (1 + distance);
      const tagsRaw = String(record.tags ?? '[]');
      let tags: string[] = [];
      try {
        const parsed: unknown = JSON.parse(tagsRaw);
        if (Array.isArray(parsed)) {
          tags = parsed.filter((tag): tag is string => typeof tag === 'string');
        }
      } catch {
        tags = [];
      }

      return {
        text: String(record.text ?? ''),
        score,
        metadata: {
          source: String(record.source ?? ''),
          type: String(record.type ?? 'doc') as ScoredChunk['metadata']['type'],
          timestamp: String(record.timestamp ?? ''),
          tags,
          priority: Number(record.priority ?? 1),
          chunkIndex: Number(record.chunkIndex ?? 0),
          isHistorical: Boolean(record.isHistorical),
          status: String(record.status ?? 'active') as ScoredChunk['metadata']['status'],
          headingPath: String(record.headingPath ?? '') || undefined,
        },
      };
    });
  }

  async close(): Promise<void> {
    // LanceDB embedded — no persistent connection to close in JS API.
  }
}

export function toLanceDbRow(chunk: IndexedChunk): LanceDbRow {
  return {
    id: chunk.id,
    text: chunk.text,
    vector: [...chunk.embedding],
    source: chunk.metadata.source,
    type: chunk.metadata.type,
    timestamp: chunk.metadata.timestamp,
    tags: JSON.stringify(chunk.metadata.tags),
    priority: chunk.metadata.priority,
    chunkIndex: chunk.metadata.chunkIndex,
    isHistorical: chunk.metadata.isHistorical,
    status: chunk.metadata.status,
    headingPath: chunk.metadata.headingPath ?? '',
  };
}

export function resolveManifestPath(repoRoot: string, lanceDbPath: string): string {
  const root = resolve(repoRoot);
  const base = isAbsolute(lanceDbPath) ? lanceDbPath : join(root, lanceDbPath);
  return join(base, 'file-hashes.json');
}

export function createLanceDbStore(repoRoot: string, lanceDbPath: string): LanceDbStore {
  return new LanceDbStore(repoRoot, lanceDbPath);
}

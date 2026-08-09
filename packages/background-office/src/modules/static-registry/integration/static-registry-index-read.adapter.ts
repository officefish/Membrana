import { BadRequestException } from '@nestjs/common';

import type {
  StaticRegistryLineageReadModel,
  StaticRegistryReadPort,
  StaticRegistryReadResult,
  StaticRegistryRecordReadModel,
} from '../static-registry-read.port';

const RECORD_ID_RE = /^[a-z0-9][a-z0-9-]{2,63}$/u;
const CANONICAL_PREFIX = 'urn:mmbrn:static:';

interface IndexedRecord {
  readonly id: string;
  readonly canonicalRef: string;
  readonly effectivePredecessor: string | null;
  readonly record: Readonly<{
    sha256: string;
    bytes: number;
    addedAt: string;
  }>;
}

interface IndexedLineage {
  readonly canonicalRef: string;
  readonly records: readonly IndexedRecord[];
  readonly tip: IndexedRecord;
}

export interface StaticRegistryIndexReader {
  lookupById(id: string): IndexedRecord;
  resolveCanonicalRef(canonicalRef: string): IndexedLineage;
}

function assertRecordId(recordId: string): void {
  if (!RECORD_ID_RE.test(recordId)) {
    throw new BadRequestException('recordId is malformed');
  }
}

function assertCanonicalRef(canonicalRef: string): void {
  if (!canonicalRef.startsWith(CANONICAL_PREFIX)
    || !RECORD_ID_RE.test(canonicalRef.slice(CANONICAL_PREFIX.length))) {
    throw new BadRequestException('canonicalRef is malformed');
  }
}

function isUnknown(error: unknown, code: 'UNKNOWN_ID' | 'UNKNOWN_CANONICAL_REF'): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}

export class StaticRegistryIndexReadAdapter implements StaticRegistryReadPort {
  constructor(
    private readonly index: StaticRegistryIndexReader,
  ) {}

  async getRecordById(
    recordId: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryRecordReadModel>> {
    assertRecordId(recordId);
    try {
      const indexed = this.index.lookupById(recordId);
      const lineage = this.index.resolveCanonicalRef(indexed.canonicalRef);
      const root = lineage.records[0];
      if (root === undefined) throw new Error('Static registry lineage has no root');

      return {
        kind: 'found',
        value: {
          id: indexed.id,
          sha256: indexed.record.sha256,
          bytes: indexed.record.bytes,
          addedAt: indexed.record.addedAt,
          canonicalRef: indexed.canonicalRef,
          effectivePredecessorId: indexed.effectivePredecessor,
          rootId: root.id,
          tip: lineage.tip.id === indexed.id,
        },
      };
    } catch (error) {
      if (isUnknown(error, 'UNKNOWN_ID')) return { kind: 'not-found' };
      throw error;
    }
  }

  async resolveCanonicalRef(
    canonicalRef: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryLineageReadModel>> {
    assertCanonicalRef(canonicalRef);
    try {
      const lineage = this.index.resolveCanonicalRef(canonicalRef);
      const root = lineage.records[0];
      if (root === undefined) throw new Error('Static registry lineage has no root');

      return {
        kind: 'found',
        value: {
          canonicalRef: lineage.canonicalRef,
          rootId: root.id,
          recordIds: lineage.records.map((record) => record.id),
          tipId: lineage.tip.id,
        },
      };
    } catch (error) {
      if (isUnknown(error, 'UNKNOWN_CANONICAL_REF')) return { kind: 'not-found' };
      throw error;
    }
  }
}

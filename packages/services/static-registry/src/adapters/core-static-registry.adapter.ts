import type {
  EvidenceLocationKind,
  EvidenceRecord,
  JsonValue,
  StaticRegistryEntry,
  StaticRegistrySnapshot,
} from '@membrana/core';

import { StaticRegistryIndex } from '../registry-index';
import type { RegistryIndexInput, RegistryRecordPayload } from '../types';

export type IntegratedEvidencePayload = RegistryRecordPayload & Readonly<{
  id: string;
  sha256: string;
  bytes: number;
  addedAt: string;
  source: string;
  location: Readonly<{
    kind: EvidenceLocationKind;
    ref: string;
  }>;
  about?: string;
  measured?: Readonly<Record<string, JsonValue>>;
  sensitive?: Readonly<{
    reason: string;
    decidedAt: string;
  }>;
  supersedes?: string;
}>;

function toIntegratedPayload(record: EvidenceRecord): IntegratedEvidencePayload {
  return Object.freeze({
    id: record.id,
    sha256: record.sha256,
    bytes: record.bytes,
    addedAt: record.addedAt,
    source: record.source,
    location: Object.freeze({ ...record.location }),
    ...(record.about === undefined ? {} : { about: record.about }),
    ...(record.measured === undefined ? {} : { measured: record.measured }),
    ...(record.sensitive === undefined
      ? {}
      : { sensitive: Object.freeze({ ...record.sensitive }) }),
    ...(record.supersedes === undefined ? {} : { supersedes: record.supersedes }),
  }) as IntegratedEvidencePayload;
}

export function toRegistryIndexInput(
  entry: StaticRegistryEntry,
): RegistryIndexInput<IntegratedEvidencePayload> {
  return Object.freeze({
    id: entry.recordId,
    canonicalRef: entry.canonicalRef,
    effectivePredecessor: entry.effectivePredecessor,
    record: toIntegratedPayload(entry.record),
  });
}

export function toRegistryIndexInputs(
  snapshot: StaticRegistrySnapshot,
): readonly RegistryIndexInput<IntegratedEvidencePayload>[] {
  return Object.freeze(snapshot.records.map(toRegistryIndexInput));
}

export function createIndexFromSnapshot(
  snapshot: StaticRegistrySnapshot,
): StaticRegistryIndex<IntegratedEvidencePayload> {
  return StaticRegistryIndex.fromRecords(toRegistryIndexInputs(snapshot));
}

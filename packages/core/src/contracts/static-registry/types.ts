export const EVIDENCE_LOCATION_KINDS = [
  'local',
  'affine',
  'url',
  'archivarius',
] as const;

export type EvidenceLocationKind = (typeof EVIDENCE_LOCATION_KINDS)[number];

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface EvidenceLocation {
  readonly kind: EvidenceLocationKind;
  readonly ref: string;
}

export interface EvidenceSensitive {
  readonly reason: string;
  readonly decidedAt: string;
}

export interface EvidenceRecord {
  readonly id: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly addedAt: string;
  readonly source: string;
  readonly location: EvidenceLocation;
  readonly about?: string;
  readonly measured?: Readonly<Record<string, JsonValue>>;
  readonly sensitive?: EvidenceSensitive;
  readonly supersedes?: string;
}

export type StaticRegistryErrorCode =
  | 'invalid-json'
  | 'invalid-record'
  | 'duplicate-id'
  | 'dangling-predecessor'
  | 'fork'
  | 'merge'
  | 'cycle';

export interface StaticRegistryError {
  readonly code: StaticRegistryErrorCode;
  readonly message: string;
  readonly line?: number;
  readonly field?: string;
  readonly recordId?: string;
  readonly relatedIds?: readonly string[];
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly StaticRegistryError[] };

export interface StaticRegistryEntry {
  readonly record: EvidenceRecord;
  readonly recordId: string;
  readonly effectivePredecessor: string | null;
  readonly rootId: string;
  readonly canonicalRef: string;
}

export interface StaticRegistryLineage {
  readonly rootId: string;
  readonly canonicalRef: string;
  readonly recordIds: readonly string[];
  readonly tip: string;
}

export interface StaticRegistrySnapshot {
  readonly records: readonly StaticRegistryEntry[];
  readonly lineages: readonly StaticRegistryLineage[];
}

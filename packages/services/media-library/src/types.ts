export type CollectionKind = 'buffer' | 'user' | 'system';

export type SampleLabel = 'drone' | 'not-drone' | 'unlabeled';

export type SampleSource =
  | 'mic-recording'
  | 'disk-import'
  | 'synthetic'
  | 'move'
  | 'copy'
  | 'catalog';

export interface Collection {
  id: string;
  name: string;
  kind: CollectionKind;
  createdAt: string;
  updatedAt: string;
  systemKey?: 'tariff-dataset';
  /** Server-reported count; may be set before samples are loaded into snapshot. */
  sampleCount?: number;
}

export interface MediaSample {
  id: string;
  collectionId: string;
  title: string;
  class: string;
  label: SampleLabel;
  source: SampleSource;
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  createdAt: string;
  storageRef: string;
  notes?: string;
  sizeBytes: number;
}

export type StorageBackendKind = 'server' | 'browser-limited' | 'electron-fs';

export interface StorageQuota {
  /** User collections quota (or combined quota for browser-limited). */
  usedBytes: number;
  limitBytes: number;
  backend: StorageBackendKind;
  serverReachable: boolean;
  /** Buffer collection quota — set when backend tracks buffer separately (server). */
  bufferUsedBytes?: number;
  bufferLimitBytes?: number;
}

export interface NewSampleMeta {
  title: string;
  class: string;
  label: SampleLabel;
  source: SampleSource;
  durationSec: number;
  sampleRate: number;
  channels?: 1 | 2;
  notes?: string;
}

/** Options for {@link MediaLibraryService.importBlob}. */
export interface ImportBlobOptions {
  /**
   * Skip full {@link MediaLibraryService.refresh} after upload.
   * Merges the new sample into snapshot + refreshes quota only (scenario runtime hot path).
   */
  readonly skipRefresh?: boolean;
}

/** Partial update for ground-truth curation (VDR1). */
export interface UpdateSampleLabelNotes {
  label?: SampleLabel;
  notes?: string | null;
}

export interface MediaLibrarySnapshot {
  collections: Collection[];
  samplesByCollection: Record<string, MediaSample[]>;
  quota: StorageQuota;
  version: number;
}

export interface PaginatedSamples<T = MediaSample> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

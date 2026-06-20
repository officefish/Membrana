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

export interface StorageQuota {
  usedBytes: number;
  limitBytes: number;
  backend: 'electron-fs';
  serverReachable: boolean;
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

export interface UpdateSampleLabelNotes {
  label?: SampleLabel;
  notes?: string | null;
}

export interface PaginatedSamples {
  items: MediaSample[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MediaLibraryManifest {
  version: 1;
  limitBytes: number;
  collections: Record<string, Collection>;
  samples: Record<string, MediaSample>;
}

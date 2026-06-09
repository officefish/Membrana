export type CollectionKind = 'buffer' | 'user' | 'system';

export type SampleLabel = 'drone' | 'not-drone' | 'unlabeled';

export type SampleSource =
  | 'mic-recording'
  | 'disk-import'
  | 'synthetic'
  | 'move'
  | 'copy';

export interface Collection {
  id: string;
  name: string;
  kind: CollectionKind;
  createdAt: string;
  updatedAt: string;
  systemKey?: 'benchmark';
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
  usedBytes: number;
  limitBytes: number;
  backend: StorageBackendKind;
  serverReachable: boolean;
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

export interface MediaLibrarySnapshot {
  collections: Collection[];
  samplesByCollection: Record<string, MediaSample[]>;
  quota: StorageQuota;
  version: number;
}

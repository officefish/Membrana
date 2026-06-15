import type { Collection, Sample, SampleLabel, SampleSource } from '../prisma/client';

const SOURCE_TO_API: Record<SampleSource, string> = {
  mic_recording: 'mic-recording',
  disk_import: 'disk-import',
  synthetic: 'synthetic',
  move: 'move',
  catalog: 'catalog',
};

const SOURCE_FROM_API: Record<string, SampleSource> = {
  'mic-recording': 'mic_recording',
  'disk-import': 'disk_import',
  synthetic: 'synthetic',
  move: 'move',
  catalog: 'catalog',
};

export function sampleSourceToApi(source: SampleSource): string {
  return SOURCE_TO_API[source];
}

export function sampleSourceFromApi(source: string): SampleSource {
  const mapped = SOURCE_FROM_API[source];
  if (!mapped) {
    return 'disk_import';
  }
  return mapped;
}

/** Prisma enum → public API kebab-case (matches @membrana/media-library-service SampleLabel). */
export function sampleLabelToApi(label: SampleLabel): string {
  if (label === 'not_drone') return 'not-drone';
  return label;
}

export interface SampleDto {
  id: string;
  collectionId: string;
  title: string;
  class: string;
  label: string;
  source: string;
  durationSec: number;
  sampleRate: number;
  channels: 1 | 2;
  createdAt: string;
  storageRef: string;
  notes?: string;
  audioFormat: string;
  contentType: string;
  sizeBytes: number;
}

export function sampleToDto(row: Sample): SampleDto {
  const channels = row.channels === 2 ? 2 : 1;
  return {
    id: row.id,
    collectionId: row.collectionId,
    title: row.title,
    class: row.class,
    label: sampleLabelToApi(row.label),
    source: sampleSourceToApi(row.source),
    durationSec: row.durationSec,
    sampleRate: row.sampleRate,
    channels,
    createdAt: row.createdAt.toISOString(),
    storageRef: row.storageRef,
    notes: row.notes ?? undefined,
    audioFormat: row.audioFormat,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
  };
}

export interface CollectionDto {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
  systemKey?: string;
}

export function collectionToDto(row: Collection): CollectionDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    systemKey: row.systemKey ?? undefined,
  };
}

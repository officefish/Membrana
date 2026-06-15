import {
  TARIFF_DATASET_COLLECTION_ID,
  type MediaSample,
  type SampleLabel,
} from '@membrana/media-library-service';

import type { MembraneCatalogSample } from '@/api/sampleLibrary';

export function catalogSampleToMedia(row: MembraneCatalogSample): MediaSample {
  return {
    id: row.id,
    collectionId: TARIFF_DATASET_COLLECTION_ID,
    title: row.title,
    class: row.class,
    label: row.label as SampleLabel,
    source: 'catalog',
    durationSec: row.durationSec,
    sampleRate: row.sampleRate,
    channels: 1,
    createdAt: row.createdAt,
    storageRef: row.id,
    sizeBytes: row.sizeBytes,
    notes: row.notes,
  };
}

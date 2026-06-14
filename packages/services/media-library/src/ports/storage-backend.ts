import type {
  Collection,
  MediaSample,
  NewSampleMeta,
  StorageQuota,
} from '../types.js';

/** Persistence port — web / Electron / server implementations. */
export interface IStorageBackend {
  getQuota(): Promise<StorageQuota>;
  listCollections(): Promise<Collection[]>;
  createCollection(name: string): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  listSamples(collectionId: string): Promise<MediaSample[]>;
  putSample(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
  ): Promise<MediaSample>;
  removeSample(sampleId: string): Promise<void>;
  moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample>;
  readBlob(sampleId: string): Promise<Blob>;
  ensureReservedCollections(): Promise<void>;
}

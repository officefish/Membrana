import type { IElectronMediaLibraryPort } from '../ports/electron-media-library-port.js';
import type { IStorageBackend } from '../ports/storage-backend.js';
import type {
  Collection,
  MediaSample,
  NewSampleMeta,
  StorageQuota,
} from '../types.js';

/** Filesystem backend via desktop shell port (Electron). */
export class ElectronFsStorageBackend implements IStorageBackend {
  constructor(private readonly port: IElectronMediaLibraryPort) {}

  async getQuota(): Promise<StorageQuota> {
    const quota = await this.port.getQuota();
    return {
      ...quota,
      backend: 'electron-fs',
      serverReachable: false,
      bufferUsedBytes: quota.bufferUsedBytes ?? quota.usedBytes,
      bufferLimitBytes: quota.bufferLimitBytes ?? quota.limitBytes,
    };
  }

  ensureReservedCollections(): Promise<void> {
    return this.port.ensureReservedCollections();
  }

  listCollections(): Promise<Collection[]> {
    return this.port.listCollections();
  }

  createCollection(name: string): Promise<Collection> {
    return this.port.createCollection(name);
  }

  deleteCollection(id: string): Promise<void> {
    return this.port.deleteCollection(id);
  }

  listSamples(collectionId: string): Promise<MediaSample[]> {
    return this.port.listSamples(collectionId);
  }

  putSample(collectionId: string, blob: Blob, meta: NewSampleMeta): Promise<MediaSample> {
    return this.port.putSample(collectionId, blob, meta);
  }

  removeSample(sampleId: string): Promise<void> {
    return this.port.removeSample(sampleId);
  }

  moveSample(sampleId: string, toCollectionId: string): Promise<MediaSample> {
    return this.port.moveSample(sampleId, toCollectionId);
  }

  updateSampleLabelNotes(
    sampleId: string,
    patch: import('../types.js').UpdateSampleLabelNotes,
  ): Promise<MediaSample> {
    return this.port.updateSampleLabelNotes(sampleId, patch);
  }

  readBlob(sampleId: string): Promise<Blob> {
    return this.port.readBlob(sampleId);
  }

  importCatalogSample?(
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
    fixedId: string,
  ): Promise<MediaSample> {
    return this.port.importCatalogSample?.(collectionId, blob, meta, fixedId) as Promise<MediaSample>;
  }
}

export function createElectronFsStorageBackend(
  port: IElectronMediaLibraryPort,
): ElectronFsStorageBackend {
  return new ElectronFsStorageBackend(port);
}

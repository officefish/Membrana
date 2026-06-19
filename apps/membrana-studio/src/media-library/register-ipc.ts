import { ipcMain } from 'electron';

import type { MediaLibraryFsStore } from './media-library-fs';
import type { NewSampleMeta, UpdateSampleLabelNotes } from './types';

const PREFIX = 'membrana:media-library';

function asUint8Array(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new Error('Expected binary payload');
}

/** Register IPC handlers for renderer preload (MS2). */
export function registerMediaLibraryIpc(store: MediaLibraryFsStore): void {
  ipcMain.handle(`${PREFIX}:getQuota`, () => store.getQuota());
  ipcMain.handle(`${PREFIX}:ensureReservedCollections`, () => store.ensureReservedCollections());
  ipcMain.handle(`${PREFIX}:listCollections`, () => store.listCollections());
  ipcMain.handle(`${PREFIX}:createCollection`, (_e, name: string) => store.createCollection(name));
  ipcMain.handle(`${PREFIX}:deleteCollection`, (_e, id: string) => store.deleteCollection(id));
  ipcMain.handle(`${PREFIX}:listSamples`, (_e, collectionId: string) =>
    store.listSamples(collectionId),
  );
  ipcMain.handle(
    `${PREFIX}:listSamplesPage`,
    (_e, collectionId: string, page: number, limit: number) =>
      store.listSamplesPage(collectionId, page, limit),
  );
  ipcMain.handle(
    `${PREFIX}:putSample`,
    (_e, collectionId: string, data: unknown, meta: NewSampleMeta) =>
      store.putSample(collectionId, asUint8Array(data), meta),
  );
  ipcMain.handle(
    `${PREFIX}:importCatalogSample`,
    (_e, collectionId: string, data: unknown, meta: NewSampleMeta, fixedId: string) =>
      store.importCatalogSample(collectionId, asUint8Array(data), meta, fixedId),
  );
  ipcMain.handle(`${PREFIX}:removeSample`, (_e, sampleId: string) => store.removeSample(sampleId));
  ipcMain.handle(`${PREFIX}:moveSample`, (_e, sampleId: string, toCollectionId: string) =>
    store.moveSample(sampleId, toCollectionId),
  );
  ipcMain.handle(
    `${PREFIX}:updateSampleLabelNotes`,
    (_e, sampleId: string, patch: UpdateSampleLabelNotes) =>
      store.updateSampleLabelNotes(sampleId, patch),
  );
  ipcMain.handle(`${PREFIX}:readBlob`, async (_e, sampleId: string) => {
    const bytes = await store.readBlob(sampleId);
    return Uint8Array.from(bytes);
  });
}

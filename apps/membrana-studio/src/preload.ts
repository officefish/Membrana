import { contextBridge, ipcRenderer } from 'electron';

import type { NewSampleMeta, UpdateSampleLabelNotes } from './media-library/types';

const ML = 'membrana:media-library';
const JL = 'membrana:journal';
const TT = 'membrana:trends-templates';
const LG = 'membrana:logging';

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const mediaLibrary = {
  getQuota: () => invoke(`${ML}:getQuota`),
  ensureReservedCollections: () => invoke(`${ML}:ensureReservedCollections`),
  listCollections: () => invoke(`${ML}:listCollections`),
  createCollection: (name: string) => invoke(`${ML}:createCollection`, name),
  deleteCollection: (id: string) => invoke(`${ML}:deleteCollection`, id),
  listSamples: (collectionId: string) => invoke(`${ML}:listSamples`, collectionId),
  listSamplesPage: (collectionId: string, page: number, limit: number) =>
    invoke(`${ML}:listSamplesPage`, collectionId, page, limit),
  putSample: async (collectionId: string, blob: Blob, meta: NewSampleMeta) => {
    const data = await blob.arrayBuffer();
    return invoke(`${ML}:putSample`, collectionId, data, meta);
  },
  importCatalogSample: async (
    collectionId: string,
    blob: Blob,
    meta: NewSampleMeta,
    fixedId: string,
  ) => {
    const data = await blob.arrayBuffer();
    return invoke(`${ML}:importCatalogSample`, collectionId, data, meta, fixedId);
  },
  removeSample: (sampleId: string) => invoke(`${ML}:removeSample`, sampleId),
  moveSample: (sampleId: string, toCollectionId: string) =>
    invoke(`${ML}:moveSample`, sampleId, toCollectionId),
  updateSampleLabelNotes: (sampleId: string, patch: UpdateSampleLabelNotes) =>
    invoke(`${ML}:updateSampleLabelNotes`, sampleId, patch),
  readBlob: async (sampleId: string) => {
    const payload = (await invoke(`${ML}:readBlob`, sampleId)) as Uint8Array | ArrayBuffer;
    const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    return new Blob([bytes]);
  },
};

const journal = {
  listItems: () => invoke(`${JL}:listItems`),
  getItemByClientEntryId: (clientEntryId: string) =>
    invoke(`${JL}:getItemByClientEntryId`, clientEntryId),
  appendTrack: (input: unknown) => invoke(`${JL}:appendTrack`, input),
  appendReport: (input: unknown) => invoke(`${JL}:appendReport`, input),
  clearByFilter: (filter: unknown) => invoke(`${JL}:clearByFilter`, filter),
};

const trendsTemplates = {
  read: () => invoke<string | null>(`${TT}:read`),
  write: (json: string) => invoke<void>(`${TT}:write`, json),
};

/** SC1/SC5: захват устройства (tariff v2) — сигнал main поднять окно; версия сборки. */
const studioShell = {
  notifyCaptureAcquired: () => {
    ipcRenderer.send('membrana:studio-shell:captureAcquired');
  },
  getAppVersion: () => invoke<string>('membrana:studio-shell:getAppVersion'),
};

const shellLog = {
  write: (level: 'debug' | 'info' | 'warn' | 'error', process: string, message: string) =>
    invoke<void>(`${LG}:write`, level, process, message),
  getLogsDir: () => invoke<string>(`${LG}:getLogsDir`),
  flushScenarioTrace: (text: string, runId: string | null) => {
    ipcRenderer.sendSync(`${LG}:flushScenarioTrace`, text, runId);
  },
};

contextBridge.exposeInMainWorld('electronAPI', {
  mediaLibrary,
  journal,
  trendsTemplates,
  studioShell,
  shellLog,
});

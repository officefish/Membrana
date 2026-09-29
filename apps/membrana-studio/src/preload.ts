import { contextBridge, ipcRenderer } from 'electron';

import type { NewSampleMeta, UpdateSampleLabelNotes } from './media-library/types';
const ML = 'membrana:media-library';
const JL = 'membrana:journal';
const TT = 'membrana:trends-templates';
const LG = 'membrana:logging';
const SS = 'membrana:secure-storage';
const TRACE_FLUSH_FRAME_BUDGET_MS = 16;

// Sandboxed Electron preloads cannot load relative runtime modules. Keep these tiny helpers
// local; trace-flush-timing.test.ts carries a source tooth against their canonical module.
function isTraceFlushTimingEnabled(env: Record<string, string | undefined>): boolean {
  return env.MEMBRANA_TRACE_FLUSH_TIMING === '1';
}

function traceFlushTimingLevel(blockedMs: number): 'info' | 'warn' {
  return blockedMs >= TRACE_FLUSH_FRAME_BUDGET_MS ? 'warn' : 'info';
}

function formatTraceFlushTiming(input: {
  blockedMs: number;
  chars: number;
  runId: string | null;
}): string {
  const frames = input.blockedMs / TRACE_FLUSH_FRAME_BUDGET_MS;
  const runId = input.runId === null || input.runId.length === 0 ? 'none' : input.runId;
  return (
    `scenario trace flush blocked renderer ${input.blockedMs.toFixed(1)} ms ` +
    `(${frames.toFixed(1)} frames @60Hz, chars=${input.chars}, runId=${runId})`
  );
}

/** Доступность шифрования у платформы узла; отказ канала читается как «шифровать нечем». */
function secureStorageAvailable(): boolean {
  try {
    return ipcRenderer.sendSync(`${SS}:available-sync`) === true;
  } catch {
    return false;
  }
}

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

// Диагностический замер простоя отрисовщика на сбросе трейса (#2476). По умолчанию ВЫКЛЮЧЕН;
// включается MEMBRANA_TRACE_FLUSH_TIMING=1 в окружении Студии. Флаг читается один раз.
const traceFlushTimingEnabled = isTraceFlushTimingEnabled(process.env);

const shellLog = {
  write: (level: 'debug' | 'info' | 'warn' | 'error', process: string, message: string) =>
    invoke<void>(`${LG}:write`, level, process, message),
  getLogsDir: () => invoke<string>(`${LG}:getLogsDir`),
  flushScenarioTrace: (text: string, runId: string | null) => {
    // Канал синхронный (`sendSync`) НЕ ради результата — главный процесс отвечает пустотой.
    // Единственное, что он даёт, — гарантия записи до выгрузки окна (`beforeunload`).
    // Цена — простой отрисовщика до того, как до сообщения дойдёт очередь событий главного
    // процесса. Замер этой цены — #2476/#2485, см. ./logging/trace-flush-timing.
    if (!traceFlushTimingEnabled) {
      ipcRenderer.sendSync(`${LG}:flushScenarioTrace`, text, runId);
      return;
    }
    const startedAt = performance.now();
    ipcRenderer.sendSync(`${LG}:flushScenarioTrace`, text, runId);
    const blockedMs = performance.now() - startedAt;
    // Отчёт уходит АСИНХРОННО и уже после вызова: сам замер к простою ничего не добавляет.
    ipcRenderer
      .invoke(
        `${LG}:write`,
        traceFlushTimingLevel(blockedMs),
        'preload',
        formatTraceFlushTiming({ blockedMs, chars: text.length, runId }),
      )
      .catch(() => undefined);
  },
};

// Мост хранения кредов (b4 studio-firebat-user-pairing; ADR-0028 Р4 включён 21.08).
// `available` — ОТВЕТ ПЛАТФОРМЫ, а не факт наличия моста: узел без DPAPI/keychain обязан
// честно сказать «нет», и клиент останется на web-адаптере вместо молчаливой потери кредов.
// Канал синхронный (`sendSync`), потому что `contextBridge` выставляет поле значением.
contextBridge.exposeInMainWorld('membranaSecureStorage', {
  available: secureStorageAvailable(),
  get: () => invoke<string | null>(`${SS}:get`),
  set: (raw: string) => invoke<boolean>(`${SS}:set`, raw),
  del: () => invoke<void>(`${SS}:del`),
});

contextBridge.exposeInMainWorld('electronAPI', {
  mediaLibrary,
  journal,
  trendsTemplates,
  studioShell,
  shellLog,
});

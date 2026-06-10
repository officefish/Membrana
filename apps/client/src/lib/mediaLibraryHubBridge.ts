import {
  BUFFER_COLLECTION_ID,
  getDefaultMediaLibraryService,
  isQuotaFull,
} from '@membrana/media-library-service';

import {
  publishMediaLibraryBufferCleared,
  publishMediaLibraryQuotaUpdated,
  subscribeMediaLibraryCaptureStop,
  type MediaLibraryCaptureStopPayload,
} from './mediaLibraryHub';

let bridgeInstalled = false;

function pushQuotaSnapshot(): void {
  const svc = getDefaultMediaLibraryService();
  const snap = svc.getSnapshot();
  const samples = snap.samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
  const maxBufferSamples = svc.getConfig().maxBufferSamples;
  const sampleCount = samples.length;
  publishMediaLibraryQuotaUpdated({
    usedBytes: snap.quota.usedBytes,
    limitBytes: snap.quota.limitBytes,
    sampleCount,
    maxBufferSamples,
    recordingBlocked: isQuotaFull(snap.quota) || sampleCount >= maxBufferSamples,
  });
}

async function handleCaptureStop(payload: MediaLibraryCaptureStopPayload): Promise<void> {
  const svc = getDefaultMediaLibraryService();
  await svc.init();
  await svc.importBlob(BUFFER_COLLECTION_ID, payload.blob, {
    title: payload.meta.title,
    class: payload.meta.class,
    label: payload.meta.label ?? 'unlabeled',
    source: 'mic-recording',
    durationSec: payload.meta.durationSec,
    sampleRate: payload.meta.sampleRate,
    channels: payload.meta.channels,
    notes: payload.meta.notes,
  });
  pushQuotaSnapshot();
}

/** Wire hub → media-library-service (call once at app startup). */
export function initMediaLibraryHubBridge(): () => void {
  if (bridgeInstalled) {
    return () => undefined;
  }
  bridgeInstalled = true;

  const svc = getDefaultMediaLibraryService();
  const unsubService = svc.subscribe(() => {
    pushQuotaSnapshot();
  });

  subscribeMediaLibraryCaptureStop((payload) => {
    void handleCaptureStop(payload).catch((err) => {
      console.error('[mediaLibraryHubBridge] capture.stop failed', err);
    });
  });

  void svc.init().then(() => pushQuotaSnapshot());

  return () => {
    bridgeInstalled = false;
    unsubService();
  };
}

/** Tests: reset bridge singleton. */
export function resetMediaLibraryHubBridgeForTests(): void {
  bridgeInstalled = false;
}

export async function requestClearMediaLibraryBuffer(): Promise<void> {
  const svc = getDefaultMediaLibraryService();
  await svc.clearBuffer();
  publishMediaLibraryBufferCleared();
  pushQuotaSnapshot();
}

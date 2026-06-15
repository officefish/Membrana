import {
  BUFFER_COLLECTION_ID,
  configureDefaultMediaLibraryService,
  createBrowserLimitedStorageBackend,
  DEFAULT_LOCAL_QUOTA_BYTES,
  getDefaultMediaLibraryService,
  isBufferRecordingBlocked,
  resolveBufferQuota,
  resolveMediaLibraryStorageMode,
  type MediaLibraryService,
} from '@membrana/media-library-service';

import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { appendLiveJournalTrackFromSampleImport } from '@/lib/liveJournalTrackWriter';
import { resolveMediaLibraryBackend } from '@/lib/resolveMediaLibraryBackend';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

import {
  publishMediaLibraryBufferCleared,
  publishMediaLibraryQuotaUpdated,
  publishMediaLibrarySampleImported,
  subscribeMediaLibraryCaptureStop,
  type MediaLibraryCaptureStopPayload,
} from './mediaLibraryHub';

let bridgeInstalled = false;
let serviceUnsub: (() => void) | null = null;
let configureGeneration = 0;
let pairedUpgradeTimer: ReturnType<typeof setInterval> | null = null;

const PAIRED_MEDIA_UPGRADE_INTERVAL_MS = 30_000;

function pushQuotaSnapshot(): void {
  const svc = getDefaultMediaLibraryService();
  const snap = svc.getSnapshot();
  const samples = snap.samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
  const maxBufferSamples = svc.getConfig().maxBufferSamples;
  const sampleCount = samples.length;
  const bufferQuota = resolveBufferQuota(snap.quota);
  const storageMode = resolveMediaLibraryStorageMode(snap.quota);
  publishMediaLibraryQuotaUpdated({
    usedBytes: bufferQuota.usedBytes,
    limitBytes: bufferQuota.limitBytes,
    sampleCount,
    maxBufferSamples,
    recordingBlocked: isBufferRecordingBlocked(snap.quota, sampleCount, maxBufferSamples),
    storageMode,
  });
}

async function attachService(svc: MediaLibraryService): Promise<boolean> {
  serviceUnsub?.();
  try {
    await svc.init();
  } catch (err) {
    console.error('[mediaLibraryHubBridge] media library init failed', err);
    return false;
  }
  serviceUnsub = svc.subscribe(() => {
    pushQuotaSnapshot();
  });
  pushQuotaSnapshot();
  return true;
}

async function handleCaptureStop(payload: MediaLibraryCaptureStopPayload): Promise<void> {
  const svc = getDefaultMediaLibraryService();
  const sample = await svc.importBlob(BUFFER_COLLECTION_ID, payload.blob, {
    title: payload.meta.title,
    class: payload.meta.class,
    label: payload.meta.label ?? 'unlabeled',
    source: 'mic-recording',
    durationSec: payload.meta.durationSec,
    sampleRate: payload.meta.sampleRate,
    channels: payload.meta.channels,
    notes: payload.meta.notes,
  });
  const importedPayload = {
    sampleId: sample.id,
    moduleId: payload.moduleId ?? 'microphone',
    sourcePluginId: payload.sourcePluginId,
    captureMode: payload.captureMode ?? 'manual',
    reason: payload.reason,
    title: sample.title,
    durationSec: sample.durationSec,
    sampleRate: sample.sampleRate,
  } as const;
  let journalTrackId: string | undefined;
  if (payload.sourcePluginId === MIC_BUFFER_RECORDER_PLUGIN_ID) {
    const trackResult = await appendLiveJournalTrackFromSampleImport(importedPayload);
    journalTrackId = trackResult?.trackId;
  }
  publishMediaLibrarySampleImported({
    ...importedPayload,
    journalTrackId,
  });
  pushQuotaSnapshot();
}

/** Switch backend after pairing / disconnect and reload library snapshot. */
export async function reconfigureMediaLibraryFromConnection(
  mode?: NodeConnectionMode | null,
  pairing?: PairedNodeCredentials | null,
): Promise<void> {
  const generation = ++configureGeneration;
  const backend = await resolveMediaLibraryBackend(mode, pairing);
  if (generation !== configureGeneration) return;
  const svc = configureDefaultMediaLibraryService(backend);
  if (generation !== configureGeneration) return;
  const attached = await attachService(svc);
  if (generation !== configureGeneration) return;
  if (!attached && mode === 'paired' && pairing) {
    const fallback = createBrowserLimitedStorageBackend(DEFAULT_LOCAL_QUOTA_BYTES);
    const fallbackSvc = configureDefaultMediaLibraryService(fallback);
    if (generation !== configureGeneration) return;
    await attachService(fallbackSvc);
  }
}

/** Re-attach server backend when paired but library still uses browser fallback. */
export async function tryUpgradeMediaLibraryToRemote(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): Promise<void> {
  if (mode !== 'paired' || !pairing) return;
  const snap = getDefaultMediaLibraryService().getSnapshot();
  if (snap.quota.backend === 'server') {
    if (!snap.quota.serverReachable) {
      try {
        await getDefaultMediaLibraryService().refresh();
      } catch (err) {
        console.error('[mediaLibraryHubBridge] media library refresh failed', err);
      }
    }
    return;
  }
  try {
    await reconfigureMediaLibraryFromConnection(mode, pairing);
  } catch (err) {
    console.error('[mediaLibraryHubBridge] media library upgrade failed', err);
  }
}

export function stopPairedMediaLibraryUpgrade(): void {
  if (pairedUpgradeTimer) {
    window.clearInterval(pairedUpgradeTimer);
    pairedUpgradeTimer = null;
  }
}

/** Periodically retry server backend while node stays paired. */
export function schedulePairedMediaLibraryUpgrade(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): void {
  stopPairedMediaLibraryUpgrade();
  if (mode !== 'paired' || !pairing) return;

  const tick = (): void => {
    void tryUpgradeMediaLibraryToRemote(mode, pairing);
  };
  void tick();
  pairedUpgradeTimer = window.setInterval(tick, PAIRED_MEDIA_UPGRADE_INTERVAL_MS);
}

/** Wire hub → media-library-service (call once at app startup). */
export function initMediaLibraryHubBridge(): () => void {
  if (bridgeInstalled) {
    return () => undefined;
  }
  bridgeInstalled = true;

  subscribeMediaLibraryCaptureStop((payload) => {
    void handleCaptureStop(payload).catch((err) => {
      console.error('[mediaLibraryHubBridge] capture.stop failed', err);
    });
  });

  void reconfigureMediaLibraryFromConnection().catch((err) => {
    console.error('[mediaLibraryHubBridge] startup configure failed', err);
  });

  return () => {
    bridgeInstalled = false;
    serviceUnsub?.();
    serviceUnsub = null;
  };
}

/** Tests: reset bridge singleton. */
export function resetMediaLibraryHubBridgeForTests(): void {
  bridgeInstalled = false;
  serviceUnsub = null;
  configureGeneration = 0;
  stopPairedMediaLibraryUpgrade();
}

export async function requestClearMediaLibraryBuffer(): Promise<void> {
  const svc = getDefaultMediaLibraryService();
  await svc.clearBuffer();
  publishMediaLibraryBufferCleared();
  pushQuotaSnapshot();
}

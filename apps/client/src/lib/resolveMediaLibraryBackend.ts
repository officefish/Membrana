import {
  createBrowserLimitedStorageBackend,
  createElectronFsStorageBackend,
  createServerStorageBackend,
  DEFAULT_LOCAL_QUOTA_BYTES,
  type IStorageBackend,
} from '@membrana/media-library-service';

import { pingMediaApi, resolveMediaApiBase } from '@/api/pairing';
import { getElectronMediaLibraryPort } from '@/lib/electronMediaLibraryPort';
import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { getRuntimeStorageMode } from '@/lib/runtimeStorageMode';

const NODE_CONNECTION_STORAGE_KEY = 'membrana.client.nodeConnection';

interface PersistedNodeConnection {
  mode: NodeConnectionMode | null;
  pairing: PairedNodeCredentials | null;
}

function readPersistedConnection(): PersistedNodeConnection {
  if (typeof window === 'undefined') {
    return { mode: null, pairing: null };
  }
  try {
    const raw = localStorage.getItem(NODE_CONNECTION_STORAGE_KEY);
    if (!raw) return { mode: null, pairing: null };
    const parsed = JSON.parse(raw) as PersistedNodeConnection;
    if (parsed.mode !== 'autonomous' && parsed.mode !== 'paired') {
      return { mode: null, pairing: null };
    }
    return {
      mode: parsed.mode,
      pairing: parsed.mode === 'paired' ? parsed.pairing : null,
    };
  } catch {
    return { mode: null, pairing: null };
  }
}

const PAIRED_MEDIA_PING_ATTEMPTS = 3;
const PAIRED_MEDIA_PING_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createPairedBackend(pairing: PairedNodeCredentials): Promise<IStorageBackend | null> {
  for (let attempt = 0; attempt < PAIRED_MEDIA_PING_ATTEMPTS; attempt += 1) {
    const mediaOk = await pingMediaApi(pairing.mediaApiUrl, pairing.mediaToken, pairing.deviceId);
    if (mediaOk) {
      return createServerStorageBackend({
        baseUrl: resolveMediaApiBase(pairing.mediaApiUrl),
        deviceId: pairing.deviceId,
        mediaToken: pairing.mediaToken,
      });
    }
    if (attempt < PAIRED_MEDIA_PING_ATTEMPTS - 1) {
      await delay(PAIRED_MEDIA_PING_DELAY_MS * (attempt + 1));
    }
  }
  return null;
}

function createElectronBackend(): IStorageBackend | null {
  if (getRuntimeStorageMode() !== 'electron-system-files') return null;
  const port = getElectronMediaLibraryPort();
  if (!port) return null;
  return createElectronFsStorageBackend(port);
}

/**
 * Storage priority for mic buffer + sample library:
 * 1. media-server when paired and reachable
 * 2. desktop filesystem (Electron) when shell port is available
 * 3. browser-limited in-memory fallback (session-only)
 */
export async function resolveMediaLibraryBackend(
  mode?: NodeConnectionMode | null,
  pairing?: PairedNodeCredentials | null,
): Promise<IStorageBackend> {
  const state =
    mode === undefined
      ? readPersistedConnection()
      : { mode: mode ?? null, pairing: pairing ?? null };

  if (state.mode === 'paired' && state.pairing) {
    const remote = await createPairedBackend(state.pairing);
    if (remote) return remote;
  }

  const electron = createElectronBackend();
  if (electron) return electron;

  return createBrowserLimitedStorageBackend(DEFAULT_LOCAL_QUOTA_BYTES);
}

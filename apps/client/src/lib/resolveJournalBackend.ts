import {
  createElectronJournalStorageBackend,
  createMemoryJournalStorageBackend,
  createSyncJournalStorageBackend,
  journalLocalCacheKey,
  type IJournalStorageBackend,
} from '@membrana/telemetry-journal-service';

import { pingCabinetApi } from '@/api/pairing';
import { createCabinetJournalPort } from '@/lib/createCabinetJournalPort';
import { createRealtimeJournalPushPort } from '@/lib/nodeRealtimeJournalPush';
import { getElectronJournalPort } from '@/lib/electronJournalPort';
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

const PAIRED_CABINET_PING_ATTEMPTS = 3;
const PAIRED_CABINET_PING_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createPairedBackend(pairing: PairedNodeCredentials): Promise<IJournalStorageBackend | null> {
  for (let attempt = 0; attempt < PAIRED_CABINET_PING_ATTEMPTS; attempt += 1) {
    const cabinetOk = await pingCabinetApi();
    if (cabinetOk) {
      return createSyncJournalStorageBackend(createCabinetJournalPort(pairing.token), {
        localCacheKey: journalLocalCacheKey(pairing.deviceId),
        mediaDeviceId: pairing.deviceId,
        realtimePush: createRealtimeJournalPushPort(),
      });
    }
    if (attempt < PAIRED_CABINET_PING_ATTEMPTS - 1) {
      await delay(PAIRED_CABINET_PING_DELAY_MS * (attempt + 1));
    }
  }
  return null;
}

function createElectronBackend(): IJournalStorageBackend | null {
  if (getRuntimeStorageMode() !== 'electron-system-files') return null;
  const port = getElectronJournalPort();
  return createElectronJournalStorageBackend(port ?? undefined);
}

/**
 * Storage priority for live journal:
 * 1. cabinet server when paired and reachable
 * 2. desktop filesystem stub (Electron)
 * 3. browser-limited in-memory fallback
 */
export async function resolveJournalBackend(
  mode?: NodeConnectionMode | null,
  pairing?: PairedNodeCredentials | null,
): Promise<IJournalStorageBackend> {
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

  return createMemoryJournalStorageBackend();
}

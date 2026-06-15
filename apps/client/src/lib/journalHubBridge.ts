import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  type LiveJournalService,
} from '@membrana/telemetry-journal-service';

import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { subscribeMediaLibrarySampleImported } from '@/lib/mediaLibraryHub';
import { resolveJournalBackend } from '@/lib/resolveJournalBackend';

let bridgeInstalled = false;
let serviceUnsub: (() => void) | null = null;
let configureGeneration = 0;
let pairedUpgradeTimer: ReturnType<typeof setInterval> | null = null;

const PAIRED_JOURNAL_UPGRADE_INTERVAL_MS = 30_000;

async function attachService(svc: LiveJournalService): Promise<boolean> {
  serviceUnsub?.();
  try {
    await svc.init();
  } catch (err) {
    console.error('[journalHubBridge] live journal init failed', err);
    return false;
  }
  serviceUnsub = svc.subscribe(() => {
    /* TJ5: publish journal snapshot events for UI modules */
  });
  return true;
}

/** Switch journal backend after pairing / disconnect and reload snapshot. */
export async function reconfigureJournalFromConnection(
  mode?: NodeConnectionMode | null,
  pairing?: PairedNodeCredentials | null,
): Promise<void> {
  const generation = ++configureGeneration;
  const backend = await resolveJournalBackend(mode, pairing);
  if (generation !== configureGeneration) return;
  const svc = configureDefaultLiveJournalService(backend);
  if (generation !== configureGeneration) return;
  const attached = await attachService(svc);
  if (generation !== configureGeneration) return;
  if (!attached && mode === 'paired' && pairing) {
    const fallbackSvc = configureDefaultLiveJournalService(createMemoryJournalStorageBackend());
    if (generation !== configureGeneration) return;
    await attachService(fallbackSvc);
  }
}

/** Re-attach server backend when paired but journal still uses local fallback. */
export async function tryUpgradeJournalToRemote(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): Promise<void> {
  if (mode !== 'paired' || !pairing) return;
  const snap = getDefaultLiveJournalService().getSnapshot();
  if (snap.storageMode === 'remote-server') {
    try {
      await getDefaultLiveJournalService().refresh();
    } catch (err) {
      console.error('[journalHubBridge] live journal refresh failed', err);
    }
    return;
  }
  try {
    await reconfigureJournalFromConnection(mode, pairing);
  } catch (err) {
    console.error('[journalHubBridge] live journal upgrade failed', err);
  }
}

export function stopPairedJournalUpgrade(): void {
  if (pairedUpgradeTimer) {
    window.clearInterval(pairedUpgradeTimer);
    pairedUpgradeTimer = null;
  }
}

/** Periodically retry server backend while node stays paired. */
export function schedulePairedJournalUpgrade(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): void {
  stopPairedJournalUpgrade();
  if (mode !== 'paired' || !pairing) return;

  const tick = (): void => {
    void tryUpgradeJournalToRemote(mode, pairing);
  };
  void tick();
  pairedUpgradeTimer = window.setInterval(tick, PAIRED_JOURNAL_UPGRADE_INTERVAL_MS);
}

/** Wire connection lifecycle → live journal service (call once at app startup). */
export function initJournalHubBridge(): () => void {
  if (bridgeInstalled) {
    return () => undefined;
  }
  bridgeInstalled = true;

  subscribeMediaLibrarySampleImported(() => {
    void getDefaultLiveJournalService()
      .refresh()
      .catch((err) => {
        console.error('[journalHubBridge] refresh after sample import failed', err);
      });
  });

  void reconfigureJournalFromConnection().catch((err) => {
    console.error('[journalHubBridge] startup configure failed', err);
  });

  return () => {
    bridgeInstalled = false;
    serviceUnsub?.();
    serviceUnsub = null;
  };
}

/** Tests: reset bridge singleton. */
export function resetJournalHubBridgeForTests(): void {
  bridgeInstalled = false;
  serviceUnsub = null;
  configureGeneration = 0;
  stopPairedJournalUpgrade();
}

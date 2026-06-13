import { create } from 'zustand';

import type { NodeConnectionMode, PairedNodeCredentials } from '../lib/nodeConnectionMode';

const STORAGE_KEY = 'membrana.client.nodeConnection';

interface PersistedNodeConnection {
  mode: NodeConnectionMode | null;
  pairing: PairedNodeCredentials | null;
}

interface NodeConnectionState extends PersistedNodeConnection {
  hydrated: boolean;
  showModePicker: boolean;
  showPairingPanel: boolean;
  showFallbackDialog: boolean;
  lastConnectionError: string | null;
  hydrate: () => void;
  openModePicker: () => void;
  closeModePicker: () => void;
  openPairingPanel: () => void;
  closePairingPanel: () => void;
  chooseAutonomous: () => void;
  applyPairing: (pairing: PairedNodeCredentials) => void;
  clearPairing: () => void;
  reportConnectionError: (message: string) => void;
  dismissFallbackDialog: () => void;
  acceptAutonomousFallback: () => void;
}

function readPersisted(): PersistedNodeConnection {
  if (typeof window === 'undefined') {
    return { mode: null, pairing: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function writePersisted(state: PersistedNodeConnection): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useNodeConnectionStore = create<NodeConnectionState>((set, get) => ({
  mode: null,
  pairing: null,
  hydrated: false,
  showModePicker: false,
  showPairingPanel: false,
  showFallbackDialog: false,
  lastConnectionError: null,

  hydrate: () => {
    if (get().hydrated) return;
    const persisted = readPersisted();
    set({
      ...persisted,
      hydrated: true,
      showModePicker: persisted.mode === null,
    });
  },

  openModePicker: () => set({ showModePicker: true }),
  closeModePicker: () => set({ showModePicker: false }),

  openPairingPanel: () => set({ showPairingPanel: true, showModePicker: false }),
  closePairingPanel: () => set({ showPairingPanel: false }),

  chooseAutonomous: () => {
    const next = { mode: 'autonomous' as const, pairing: null };
    writePersisted(next);
    set({
      ...next,
      showModePicker: false,
      showPairingPanel: false,
      showFallbackDialog: false,
      lastConnectionError: null,
    });
  },

  applyPairing: (pairing) => {
    const next = { mode: 'paired' as const, pairing };
    writePersisted(next);
    set({
      ...next,
      showModePicker: false,
      showPairingPanel: false,
      showFallbackDialog: false,
      lastConnectionError: null,
    });
  },

  clearPairing: () => {
    const next = { mode: null as NodeConnectionMode | null, pairing: null };
    writePersisted(next);
    set({
      ...next,
      showModePicker: true,
      showPairingPanel: false,
      showFallbackDialog: false,
      lastConnectionError: null,
    });
  },

  reportConnectionError: (message) => {
    const { mode } = get();
    if (mode !== 'paired') return;
    set({ lastConnectionError: message, showFallbackDialog: true });
  },

  dismissFallbackDialog: () => set({ showFallbackDialog: false }),

  acceptAutonomousFallback: () => {
    get().chooseAutonomous();
  },
}));

/** Tests: reset store + storage. */
export function resetNodeConnectionStoreForTests(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  useNodeConnectionStore.setState({
    mode: null,
    pairing: null,
    hydrated: false,
    showModePicker: false,
    showPairingPanel: false,
    showFallbackDialog: false,
    lastConnectionError: null,
  });
}

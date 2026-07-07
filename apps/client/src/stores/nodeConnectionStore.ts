import { create } from 'zustand';

import type { NodeConnectionMode, PairedNodeCredentials, PairingInvalidReason } from '../lib/nodeConnectionMode';

const STORAGE_KEY = 'membrana.client.nodeConnection';

interface PersistedNodeConnection {
  mode: NodeConnectionMode | null;
  pairing: PairedNodeCredentials | null;
}

interface NodeConnectionState extends PersistedNodeConnection {
  hydrated: boolean;
  showModePicker: boolean;
  showPairingPanel: boolean;
  showLinkedPanel: boolean;
  showFallbackDialog: boolean;
  showPairingInvalidDialog: boolean;
  pairingInvalidReason: PairingInvalidReason | null;
  lastConnectionError: string | null;
  /**
   * CX5: оператор выбрал «Остаться в связанном режиме» при недоступном сервере —
   * связь деградирована, шапка показывает предупреждение до восстановления.
   */
  linkDegraded: boolean;
  hydrate: () => void;
  openModePicker: () => void;
  closeModePicker: () => void;
  openPairingPanel: () => void;
  closePairingPanel: () => void;
  openLinkedPanel: () => void;
  closeLinkedPanel: () => void;
  openConnectionSettings: () => void;
  chooseAutonomous: () => void;
  applyPairing: (pairing: PairedNodeCredentials) => void;
  disconnectFromMembrane: () => void;
  handlePairingInvalid: (reason: PairingInvalidReason) => void;
  dismissPairingInvalidDialog: () => void;
  clearPairing: () => void;
  reportConnectionError: (message: string) => void;
  dismissFallbackDialog: () => void;
  acceptAutonomousFallback: () => void;
  /** CX5: закрыть диалог, остаться на связи — взводит linkDegraded (баннер в шапке). */
  stayLinkedDespiteError: () => void;
  /** CX5: связь с сервером восстановлена — снять деградацию. */
  reportConnectionRestored: () => void;
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
  showLinkedPanel: false,
  showFallbackDialog: false,
  showPairingInvalidDialog: false,
  pairingInvalidReason: null,
  lastConnectionError: null,
  linkDegraded: false,

  hydrate: () => {
    if (get().hydrated) return;
    const persisted = readPersisted();
    set({
      ...persisted,
      hydrated: true,
      showModePicker: persisted.mode === null,
    });
  },

  openModePicker: () =>
    set({ showModePicker: true, showLinkedPanel: false, showPairingPanel: false }),
  closeModePicker: () => set({ showModePicker: false }),

  openPairingPanel: () =>
    set({ showPairingPanel: true, showModePicker: false, showLinkedPanel: false }),
  closePairingPanel: () => set({ showPairingPanel: false }),

  openLinkedPanel: () =>
    set({ showLinkedPanel: true, showModePicker: false, showPairingPanel: false }),
  closeLinkedPanel: () => set({ showLinkedPanel: false }),

  openConnectionSettings: () => {
    const { mode } = get();
    if (mode === 'paired') {
      get().openLinkedPanel();
    } else {
      get().openModePicker();
    }
  },

  chooseAutonomous: () => {
    const next = { mode: 'autonomous' as const, pairing: null };
    writePersisted(next);
    set({
      ...next,
      showModePicker: false,
      showPairingPanel: false,
      showLinkedPanel: false,
      showFallbackDialog: false,
      showPairingInvalidDialog: false,
      pairingInvalidReason: null,
      lastConnectionError: null,
      linkDegraded: false,
    });
  },

  applyPairing: (pairing) => {
    const next = { mode: 'paired' as const, pairing };
    writePersisted(next);
    set({
      ...next,
      showModePicker: false,
      showPairingPanel: false,
      showLinkedPanel: false,
      showFallbackDialog: false,
      showPairingInvalidDialog: false,
      pairingInvalidReason: null,
      lastConnectionError: null,
      linkDegraded: false,
    });
  },

  disconnectFromMembrane: () => {
    const next = { mode: null as NodeConnectionMode | null, pairing: null };
    writePersisted(next);
    set({
      ...next,
      showLinkedPanel: false,
      showPairingPanel: true,
      showModePicker: false,
      showFallbackDialog: false,
      showPairingInvalidDialog: false,
      pairingInvalidReason: null,
      lastConnectionError: null,
      linkDegraded: false,
    });
  },

  handlePairingInvalid: (reason) => {
    const next = { mode: null as NodeConnectionMode | null, pairing: null };
    writePersisted(next);
    set({
      ...next,
      showLinkedPanel: false,
      showPairingPanel: false,
      showModePicker: false,
      showFallbackDialog: false,
      showPairingInvalidDialog: true,
      pairingInvalidReason: reason,
      lastConnectionError: null,
    });
  },

  dismissPairingInvalidDialog: () => {
    set({ showPairingInvalidDialog: false, pairingInvalidReason: null, showPairingPanel: true });
  },

  clearPairing: () => {
    get().disconnectFromMembrane();
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

  stayLinkedDespiteError: () => set({ showFallbackDialog: false, linkDegraded: true }),

  reportConnectionRestored: () => {
    if (!get().linkDegraded) return;
    set({ linkDegraded: false, lastConnectionError: null });
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
    showLinkedPanel: false,
    showFallbackDialog: false,
    showPairingInvalidDialog: false,
    pairingInvalidReason: null,
    lastConnectionError: null,
    linkDegraded: false,
  });
}

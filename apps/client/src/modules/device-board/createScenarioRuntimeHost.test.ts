import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

import { createScenarioRuntimeHost } from './createScenarioRuntimeHost';

vi.mock('@/lib/nodeRealtimeClient', () => ({
  getNodeRealtimeClient: () => ({
    getState: () => 'disconnected',
  }),
}));

vi.mock('@/lib/isDeviceLive', () => ({
  isDeviceLive: () => false,
}));

vi.mock('./scenarioMicJournalBridge', () => ({
  createScenarioMicJournalBridge: () => ({
    watchConnection: () => () => undefined,
  }),
}));

const LOCAL_DEVICE_ID_KEY = 'membrana.client.localDeviceId';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('createScenarioRuntimeHost', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    useNodeConnectionStore.setState({
      mode: null,
      pairing: null,
      hydrated: true,
      showModePicker: false,
      showPairingPanel: false,
      showLinkedPanel: false,
      showFallbackDialog: false,
      showPairingInvalidDialog: false,
      pairingInvalidReason: null,
      lastConnectionError: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes stable local device handle when not paired (autonomous)', () => {
    localStorage.setItem(LOCAL_DEVICE_ID_KEY, 'local-test-device');
    useNodeConnectionStore.setState({ mode: 'autonomous', pairing: null });

    const host = createScenarioRuntimeHost();

    expect(host.getDeviceHandle?.()).toBe('local-test-device');
    expect(host.isDeviceLinked?.()).toBe(false);
  });

  it('exposes stable local device handle when connection mode is unset', () => {
    localStorage.setItem(LOCAL_DEVICE_ID_KEY, 'local-unset-mode');

    const host = createScenarioRuntimeHost();

    expect(host.getDeviceHandle?.()).toBe('local-unset-mode');
  });

  it('uses paired cabinet device id when linked', () => {
    useNodeConnectionStore.setState({
      mode: 'paired',
      pairing: {
        token: 'tok',
        expiresAt: '2099-01-01T00:00:00.000Z',
        deviceId: 'cabinet-device-1',
        mediaToken: 'media-tok',
        mediaApiUrl: 'https://media.membrana.space',
        membraneId: 'membrane-1',
        nodeId: 'node-1',
        nodeLabel: 'Node',
      },
    });

    const host = createScenarioRuntimeHost();

    expect(host.getDeviceHandle?.()).toBe('cabinet-device-1');
  });
});

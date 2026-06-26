import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createElectronJournalStorageBackend,
  createMemoryJournalStorageBackend,
} from '@membrana/telemetry-journal-service';

import { resolveJournalBackend } from './resolveJournalBackend';

vi.mock('@/api/pairing', () => ({
  pingCabinetApi: vi.fn(),
  fetchPairStatus: vi.fn(),
}));

vi.mock('@/stores/nodeConnectionStore', () => ({
  useNodeConnectionStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/lib/createCabinetJournalPort', () => ({
  createCabinetJournalPort: vi.fn(),
}));

vi.mock('@/lib/nodeRealtimeJournalPush', () => ({
  createRealtimeJournalPushPort: vi.fn(),
}));

vi.mock('@/lib/electronJournalPort', () => ({
  getElectronJournalPort: vi.fn(),
}));

vi.mock('@/lib/runtimeStorageMode', () => ({
  getRuntimeStorageMode: vi.fn(),
}));

import { pingCabinetApi, fetchPairStatus } from '@/api/pairing';
import { getElectronJournalPort } from '@/lib/electronJournalPort';
import { getRuntimeStorageMode } from '@/lib/runtimeStorageMode';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

const linkedPairStatus = {
  linked: true as const,
  keyActive: true,
  inactiveReason: null,
  membrane: { id: 'mem-1' },
  node: { id: 'node-1', label: 'Node' },
  deviceId: 'dev-1',
  pairedKeyId: 'key-1',
  sessionExpiresAt: null,
};

describe('resolveJournalBackend', () => {
  const handlePairingInvalid = vi.fn();

  afterEach(() => {
    vi.mocked(pingCabinetApi).mockReset();
    vi.mocked(fetchPairStatus).mockReset();
    vi.mocked(getElectronJournalPort).mockReset();
    vi.mocked(getRuntimeStorageMode).mockReset();
    vi.mocked(useNodeConnectionStore.getState).mockReset();
    handlePairingInvalid.mockReset();
  });

  beforeEach(() => {
    vi.mocked(getRuntimeStorageMode).mockReturnValue('web-localstorage');
    vi.mocked(getElectronJournalPort).mockReturnValue(null);
    vi.mocked(useNodeConnectionStore.getState).mockReturnValue({
      mode: 'paired',
      handlePairingInvalid,
    } as ReturnType<typeof useNodeConnectionStore.getState>);
    vi.mocked(fetchPairStatus).mockResolvedValue(linkedPairStatus);
  });

  it('uses electron FS journal when autonomous in Studio', async () => {
    const port = {
      listItems: vi.fn().mockResolvedValue([]),
      appendTrack: vi.fn(),
      appendReport: vi.fn(),
    };
    vi.mocked(getRuntimeStorageMode).mockReturnValue('electron-system-files');
    vi.mocked(getElectronJournalPort).mockReturnValue(port);

    const backend = await resolveJournalBackend('autonomous', null);

    expect(pingCabinetApi).not.toHaveBeenCalled();
    expect(backend).toEqual(createElectronJournalStorageBackend(port));
  });

  it('falls back to electron FS when paired but cabinet unreachable', async () => {
    const port = {
      listItems: vi.fn().mockResolvedValue([]),
      appendTrack: vi.fn(),
      appendReport: vi.fn(),
    };
    vi.mocked(pingCabinetApi).mockResolvedValue(false);
    vi.mocked(getRuntimeStorageMode).mockReturnValue('electron-system-files');
    vi.mocked(getElectronJournalPort).mockReturnValue(port);

    const backend = await resolveJournalBackend('paired', {
      deviceId: 'dev-1',
      token: 'tok',
      nodeId: 'node-1',
    });

    expect(pingCabinetApi).toHaveBeenCalled();
    expect(fetchPairStatus).not.toHaveBeenCalled();
    expect(backend).toEqual(createElectronJournalStorageBackend(port));
  });

  it('falls back to electron FS when paired session token is expired', async () => {
    const port = {
      listItems: vi.fn().mockResolvedValue([]),
      appendTrack: vi.fn(),
      appendReport: vi.fn(),
    };
    vi.mocked(pingCabinetApi).mockResolvedValue(true);
    vi.mocked(fetchPairStatus).mockResolvedValue('session_expired');
    vi.mocked(getRuntimeStorageMode).mockReturnValue('electron-system-files');
    vi.mocked(getElectronJournalPort).mockReturnValue(port);

    const backend = await resolveJournalBackend('paired', {
      deviceId: 'dev-1',
      token: 'tok',
      nodeId: 'node-1',
    });

    expect(fetchPairStatus).toHaveBeenCalledWith('tok');
    expect(handlePairingInvalid).toHaveBeenCalledWith('session_expired');
    expect(backend).toEqual(createElectronJournalStorageBackend(port));
  });

  it('uses in-memory fallback in browser when not paired and no electron port', async () => {
    const backend = await resolveJournalBackend('autonomous', null);
    expect(backend).toEqual(createMemoryJournalStorageBackend());
  });
});

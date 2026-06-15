import { describe, expect, it, beforeEach } from 'vitest';

import { resetNodeConnectionStoreForTests, useNodeConnectionStore } from './nodeConnectionStore';

describe('nodeConnectionStore', () => {
  beforeEach(() => {
    resetNodeConnectionStoreForTests();
  });

  it('chooseAutonomous persists mode', () => {
    useNodeConnectionStore.getState().chooseAutonomous();
    const state = useNodeConnectionStore.getState();
    expect(state.mode).toBe('autonomous');
    expect(state.pairing).toBeNull();
    expect(state.showModePicker).toBe(false);
  });

  it('applyPairing sets paired credentials', () => {
    useNodeConnectionStore.getState().applyPairing({
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    });
    expect(useNodeConnectionStore.getState().mode).toBe('paired');
    expect(useNodeConnectionStore.getState().pairing?.nodeLabel).toBe('Узел 1');
  });

  it('disconnectFromMembrane opens pairing panel', () => {
    useNodeConnectionStore.getState().applyPairing({
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    });
    useNodeConnectionStore.getState().disconnectFromMembrane();
    const state = useNodeConnectionStore.getState();
    expect(state.mode).toBeNull();
    expect(state.pairing).toBeNull();
    expect(state.showPairingPanel).toBe(true);
  });

  it('handlePairingInvalid shows dialog then pairing panel', () => {
    useNodeConnectionStore.getState().applyPairing({
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    });
    useNodeConnectionStore.getState().handlePairingInvalid('revoked');
    expect(useNodeConnectionStore.getState().showPairingInvalidDialog).toBe(true);
    useNodeConnectionStore.getState().dismissPairingInvalidDialog();
    expect(useNodeConnectionStore.getState().showPairingPanel).toBe(true);
  });

  it('openConnectionSettings opens linked panel when paired', () => {
    useNodeConnectionStore.getState().applyPairing({
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    });
    useNodeConnectionStore.getState().openConnectionSettings();
    expect(useNodeConnectionStore.getState().showLinkedPanel).toBe(true);
  });

  it('reportConnectionError opens fallback only in paired mode', () => {
    useNodeConnectionStore.getState().chooseAutonomous();
    useNodeConnectionStore.getState().reportConnectionError('fail');
    expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(false);

    useNodeConnectionStore.getState().applyPairing({
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    });
    useNodeConnectionStore.getState().reportConnectionError('fail');
    expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true);
  });
});

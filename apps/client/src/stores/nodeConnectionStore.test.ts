import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { ConnectionFailure } from '../lib/connection-fallback/classify';
import { resetNodeConnectionStoreForTests, useNodeConnectionStore } from './nodeConnectionStore';

/** Отказ соединения с заданной деталью — вход `reportConnectionError` с #2540 (тип, не строка). */
const fail = (detail: string, over: Partial<ConnectionFailure> = {}): ConnectionFailure => ({
  source: 'cabinet',
  kind: 'unreachable',
  httpStatus: null,
  detail,
  at: '2026-10-02T06:40:00.000Z',
  ...over,
});

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
    useNodeConnectionStore.getState().reportConnectionError(fail('fail'));
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
    useNodeConnectionStore.getState().reportConnectionError(fail('fail'));
    expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true);
  });

  // CX5: конечный автомат деградации связи — linked → degraded → restored.
  describe('linkDegraded (CX5)', () => {
    const pairing = {
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    };

    it('stayLinkedDespiteError закрывает диалог и взводит деградацию', () => {
      useNodeConnectionStore.getState().applyPairing(pairing);
      useNodeConnectionStore.getState().reportConnectionError(fail('fail'));

      useNodeConnectionStore.getState().stayLinkedDespiteError();

      const state = useNodeConnectionStore.getState();
      expect(state.showFallbackDialog).toBe(false);
      expect(state.linkDegraded).toBe(true);
      expect(state.mode).toBe('paired');
    });

    it('reportConnectionRestored снимает деградацию и чистит ошибку', () => {
      useNodeConnectionStore.getState().applyPairing(pairing);
      useNodeConnectionStore.getState().reportConnectionError(fail('fail'));
      useNodeConnectionStore.getState().stayLinkedDespiteError();

      useNodeConnectionStore.getState().reportConnectionRestored();

      const state = useNodeConnectionStore.getState();
      expect(state.linkDegraded).toBe(false);
      expect(state.lastConnectionError).toBeNull();
    });

    it('reportConnectionRestored без деградации — no-op (не трогает ошибку диалога)', () => {
      useNodeConnectionStore.getState().applyPairing(pairing);
      useNodeConnectionStore.getState().reportConnectionError(fail('fail'));

      useNodeConnectionStore.getState().reportConnectionRestored();

      const state = useNodeConnectionStore.getState();
      expect(state.showFallbackDialog).toBe(true);
      expect(state.lastConnectionError).toBe('fail');
    });

    it('переход в автономный режим сбрасывает деградацию', () => {
      useNodeConnectionStore.getState().applyPairing(pairing);
      useNodeConnectionStore.getState().reportConnectionError(fail('fail'));
      useNodeConnectionStore.getState().stayLinkedDespiteError();

      useNodeConnectionStore.getState().acceptAutonomousFallback();

      expect(useNodeConnectionStore.getState().linkDegraded).toBe(false);
      expect(useNodeConnectionStore.getState().mode).toBe('autonomous');
    });

    it('повторный разрыв под деградацией снова показывает диалог, баннер не сбрасывается', () => {
      useNodeConnectionStore.getState().applyPairing(pairing);
      useNodeConnectionStore.getState().reportConnectionError(fail('fail-1'));
      useNodeConnectionStore.getState().stayLinkedDespiteError();

      useNodeConnectionStore.getState().reportConnectionError(fail('fail-2'));

      const state = useNodeConnectionStore.getState();
      expect(state.showFallbackDialog).toBe(true);
      expect(state.linkDegraded).toBe(true);
    });
  });

  // #2540: отказ хранится целиком, строка — его деталь; снятие чистит оба поля.
  describe('lastConnectionFailure (#2540)', () => {
    const pairing = {
      token: 't',
      expiresAt: '2026-12-31T00:00:00.000Z',
      deviceId: 'd',
      mediaToken: 'm',
      mediaApiUrl: 'http://localhost:3010',
      membraneId: 'mem',
      nodeId: 'node',
      nodeLabel: 'Узел 1',
    };

    it('reportConnectionError кладёт отказ целиком, lastConnectionError = его деталь', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      useNodeConnectionStore.getState().applyPairing(pairing);
      const failure = fail('HTTP 502 Bad Gateway', { kind: 'server_error', httpStatus: 502 });

      useNodeConnectionStore.getState().reportConnectionError(failure);

      const state = useNodeConnectionStore.getState();
      expect(state.lastConnectionFailure).toEqual(failure);
      expect(state.lastConnectionError).toBe('HTTP 502 Bad Gateway');
      expect(state.showFallbackDialog).toBe(true);
      vi.restoreAllMocks();
    });

    it('вне связанного режима отказ не записывается и в журнал не пишется', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      useNodeConnectionStore.getState().chooseAutonomous();

      useNodeConnectionStore.getState().reportConnectionError(fail('x'));

      expect(useNodeConnectionStore.getState().lastConnectionFailure).toBeNull();
      expect(warn).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('reportConnectionRestored и applyPairing чистят отказ вместе со строкой', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      useNodeConnectionStore.getState().applyPairing(pairing);
      useNodeConnectionStore.getState().reportConnectionError(fail('x'));
      useNodeConnectionStore.getState().stayLinkedDespiteError();
      useNodeConnectionStore.getState().reportConnectionRestored();
      expect(useNodeConnectionStore.getState().lastConnectionFailure).toBeNull();
      expect(useNodeConnectionStore.getState().lastConnectionError).toBeNull();

      useNodeConnectionStore.getState().reportConnectionError(fail('y'));
      useNodeConnectionStore.getState().applyPairing(pairing);
      expect(useNodeConnectionStore.getState().lastConnectionFailure).toBeNull();
      vi.restoreAllMocks();
    });
  });
});

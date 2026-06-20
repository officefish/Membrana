import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RUNTIME_MODE_STORAGE_KEY,
  loadPersistedRuntimeMode,
  savePersistedRuntimeMode,
} from './runtimeModePersistence';

function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', mock as unknown as Storage);
  return store;
}

describe('runtime mode persistence (MP7b RT7)', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installMemoryStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to normal when nothing is stored', () => {
    expect(loadPersistedRuntimeMode()).toBe('normal');
  });

  it('round-trips the alarm mode', () => {
    savePersistedRuntimeMode('alarm');
    expect(store.get(RUNTIME_MODE_STORAGE_KEY)).toBe('alarm');
    expect(loadPersistedRuntimeMode()).toBe('alarm');
  });

  it('normalizes unexpected stored values to normal', () => {
    store.set(RUNTIME_MODE_STORAGE_KEY, 'garbage');
    expect(loadPersistedRuntimeMode()).toBe('normal');
  });

  it('survives unavailable storage', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => savePersistedRuntimeMode('alarm')).not.toThrow();
    expect(loadPersistedRuntimeMode()).toBe('normal');
  });
});

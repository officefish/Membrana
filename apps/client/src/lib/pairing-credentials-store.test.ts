// @vitest-environment jsdom
/**
 * Зубы порта хранения кредов (b2 studio-firebat-user-pairing): валидация формы — в порте,
 * а не размазана; web-адаптер сохраняет сегодняшнее поведение; Electron-заглушка делегирует
 * web-адаптеру (ОДИН формат хранения до ADR-0028); выбор адаптера — по мосту preload.
 */
import { describe, expect, it } from 'vitest';

import type { PairedNodeCredentials } from './nodeConnectionMode';
import {
  PAIRING_STORAGE_KEY,
  createElectronSafeStorageAdapter,
  createLocalStorageAdapter,
  parsePersisted,
  resolvePairingCredentialsStore,
} from './pairing-credentials-store';

const creds = (): PairedNodeCredentials => ({
  token: 't', expiresAt: '2026-08-21T00:00:00Z', deviceId: 'd1', mediaToken: 'm',
  mediaApiUrl: 'https://media.example', membraneId: 'mem1', nodeId: 'n1', nodeLabel: 'Firebat',
});

const memoryStorage = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    dump: () => m,
  };
};

describe('parsePersisted', () => {
  it('пустое/битое/чужой mode → нулевая форма, не исключение', () => {
    expect(parsePersisted(null)).toEqual({ mode: null, pairing: null });
    expect(parsePersisted('not json')).toEqual({ mode: null, pairing: null });
    expect(parsePersisted(JSON.stringify({ mode: 'evil' }))).toEqual({ mode: null, pairing: null });
  });

  it('autonomous не тащит креды даже если они лежат рядом', () => {
    expect(parsePersisted(JSON.stringify({ mode: 'autonomous', pairing: creds() }))).toEqual({ mode: 'autonomous', pairing: null });
  });
});

describe('localStorage-адаптер', () => {
  it('write → read круговой, clear стирает под тем же ключом', () => {
    const s = memoryStorage();
    const store = createLocalStorageAdapter(s);
    store.write({ mode: 'paired', pairing: creds() });
    expect(s.dump().has(PAIRING_STORAGE_KEY)).toBe(true);
    expect(store.read().pairing?.deviceId).toBe('d1');
    store.clear();
    expect(store.read()).toEqual({ mode: null, pairing: null });
  });
});

describe('Electron-заглушка (@stage ADR-0028)', () => {
  it('делегирует переданному web-адаптеру — один формат хранения, без второй правды', () => {
    const s = memoryStorage();
    const stub = createElectronSafeStorageAdapter(createLocalStorageAdapter(s));
    stub.write({ mode: 'paired', pairing: creds() });
    expect(createLocalStorageAdapter(s).read().pairing?.membraneId).toBe('mem1');
  });
});

describe('resolvePairingCredentialsStore', () => {
  it('без моста — web-адаптер; с мостом — Electron-заглушка; оба читают одно хранилище', () => {
    const s = memoryStorage();
    const base = createLocalStorageAdapter(s);
    resolvePairingCredentialsStore(undefined, base).write({ mode: 'paired', pairing: creds() });
    expect(resolvePairingCredentialsStore({ available: true }, base).read().pairing?.deviceId).toBe('d1');
  });
});

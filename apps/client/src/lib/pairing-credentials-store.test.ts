// @vitest-environment jsdom
/**
 * Зубы порта хранения кредов (b2 studio-firebat-user-pairing): валидация формы — в порте,
 * а не размазана; web-адаптер сохраняет сегодняшнее поведение; выбор адаптера — по мосту preload.
 * С 21.08 (ADR-0028 Р4) Electron-адаптер шифрует через мост, а заглушки больше нет — зубы
 * прежней заглушки переписаны на новый контракт, а не удалены: класс поведения тот же.
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

describe('resolvePairingCredentialsStore', () => {
  it('без моста — web-адаптер: пишет и читает то же хранилище, hydrate пустой', async () => {
    const s = memoryStorage();
    const base = createLocalStorageAdapter(s);
    const resolved = resolvePairingCredentialsStore(undefined, base);
    await resolved.hydrate();
    resolved.store.write({ mode: 'paired', pairing: creds() });
    expect(createLocalStorageAdapter(s).read().pairing?.membraneId).toBe('mem1');
  });
});

describe('ADR-0028 Р4: шифрованное хранение с кэшем при старте', () => {
  const bridgeOf = (opts: { available?: boolean; stored?: string | null; setOk?: boolean } = {}) => {
    const state = { raw: opts.stored ?? null, sets: 0, dels: 0 };
    return {
      state,
      bridge: {
        available: opts.available ?? true,
        get: async () => state.raw,
        set: async (raw: string) => {
          state.sets += 1;
          if (opts.setOk === false) return false;
          state.raw = raw;
          return true;
        },
        del: async () => { state.dels += 1; state.raw = null; },
      },
    };
  };

  it('порт остаётся из трёх глаголов — hydrate живёт рядом, не в контракте', async () => {
    const { bridge } = bridgeOf();
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(memoryStorage()));
    expect(Object.keys(adapter.store).sort()).toEqual(['clear', 'read', 'write']);
    expect(typeof adapter.hydrate).toBe('function');
  });

  it('шифртекст есть → читается он, localStorage не трогается', async () => {
    const persisted = { mode: 'paired' as const, pairing: creds() };
    const { bridge } = bridgeOf({ stored: JSON.stringify(persisted) });
    const legacy = memoryStorage();
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(legacy));
    await adapter.hydrate();
    expect(adapter.lastOutcome()).toBe('encrypted');
    expect(adapter.store.read()).toEqual(persisted);
    expect(legacy.dump().size).toBe(0);
  });

  it('миграция одним стартом: localStorage → шифртекст, исходник вычищен ПОСЛЕ подтверждения', async () => {
    const persisted = { mode: 'paired' as const, pairing: creds() };
    const legacy = memoryStorage();
    legacy.setItem(PAIRING_STORAGE_KEY, JSON.stringify(persisted));
    const { bridge, state } = bridgeOf({ stored: null });
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(legacy));
    await adapter.hydrate();
    expect(adapter.lastOutcome()).toBe('migrated');
    expect(adapter.store.read()).toEqual(persisted);
    expect(JSON.parse(state.raw!)).toEqual(persisted);
    expect(legacy.getItem(PAIRING_STORAGE_KEY)).toBeNull();
  });

  it('мост не принял запись — исходник НЕ чистится: потерять связку хуже, чем не зашифровать', async () => {
    const persisted = { mode: 'paired' as const, pairing: creds() };
    const legacy = memoryStorage();
    legacy.setItem(PAIRING_STORAGE_KEY, JSON.stringify(persisted));
    const { bridge } = bridgeOf({ stored: null, setOk: false });
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(legacy));
    await adapter.hydrate();
    expect(adapter.lastOutcome()).toBe('unavailable');
    expect(legacy.getItem(PAIRING_STORAGE_KEY)).not.toBeNull();
    expect(adapter.store.read()).toEqual(persisted);
  });

  it('расшифровка не удалась (мост отдал null) и мигрировать нечего → пусто = чистый ре-парринг, не крах', async () => {
    const { bridge } = bridgeOf({ stored: null });
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(memoryStorage()));
    await adapter.hydrate();
    expect(adapter.lastOutcome()).toBe('empty');
    expect(adapter.store.read()).toEqual({ mode: null, pairing: null });
  });

  it('мост бросил на чтении — тоже пусто, а не исключение наружу', async () => {
    const bridge = { available: true, get: async () => { throw new Error('ipc dead'); }, set: async () => true, del: async () => {} };
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(memoryStorage()));
    await expect(adapter.hydrate()).resolves.toBeUndefined();
    expect(adapter.store.read()).toEqual({ mode: null, pairing: null });
  });

  it('write/clear синхронны для вызывающего: кэш меняется сразу, мост получает следом', async () => {
    const { bridge, state } = bridgeOf();
    const adapter = createElectronSafeStorageAdapter(bridge, createLocalStorageAdapter(memoryStorage()));
    await adapter.hydrate();
    const persisted = { mode: 'paired' as const, pairing: creds() };
    adapter.store.write(persisted);
    expect(adapter.store.read()).toEqual(persisted); // синхронно, без await
    await Promise.resolve();
    expect(JSON.parse(state.raw!)).toEqual(persisted);
    adapter.store.clear();
    expect(adapter.store.read()).toEqual({ mode: null, pairing: null });
    await Promise.resolve();
    expect(state.dels).toBe(1);
  });

  it('платформа шифровать не умеет (available:false) → web-адаптер как был, шифрования нет', async () => {
    const legacy = memoryStorage();
    const persisted = { mode: 'paired' as const, pairing: creds() };
    legacy.setItem(PAIRING_STORAGE_KEY, JSON.stringify(persisted));
    const { bridge, state } = bridgeOf({ available: false });
    const resolved = resolvePairingCredentialsStore(bridge, createLocalStorageAdapter(legacy));
    await resolved.hydrate();
    expect(resolved.store.read()).toEqual(persisted);
    expect(state.sets).toBe(0);
    expect(legacy.getItem(PAIRING_STORAGE_KEY)).not.toBeNull();
  });
});

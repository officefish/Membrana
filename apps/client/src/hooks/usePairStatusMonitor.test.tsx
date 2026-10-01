// @vitest-environment jsdom
/**
 * Зубы монитора сопряжения (#2538, b2). Предмет — `usePairStatusMonitor.ts` поверх НАСТОЯЩИХ
 * стора соединения, сервиса библиотеки с memory-бэкендом и моста; сеть кабинета/media — моки
 * (`@/api/pairing`), живого сервера в зубах нет.
 *
 * Порчи → красный: смена id тарифа в ответе опроса не доезжает в учётные данные — красный;
 * здоровый цикл опроса не перечитывает предел прибора — красный; тот же тариф меняет ссылку
 * учётных данных — красный; media недоступен, а предел читается — красный.
 */
import {
  MemoryStorageBackend,
  configureDefaultMediaLibraryService,
  resetDefaultMediaLibraryServiceForTests,
  type MediaLibraryService,
} from '@membrana/media-library-service';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPairStatus, pingMediaApi, type PairStatusLinked } from '@/api/pairing';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { resetMediaLibraryHubBridgeForTests } from '@/lib/mediaLibraryHubBridge';
import { resetNodeConnectionStoreForTests, useNodeConnectionStore } from '@/stores/nodeConnectionStore';

import { usePairStatusMonitor } from './usePairStatusMonitor';

vi.mock('@/api/pairing', () => ({
  fetchPairStatus: vi.fn(),
  pingMediaApi: vi.fn(),
}));

// Порт учётных данных берёт window.localStorage при импорте модуля стора; в jsdom этого стенда
// он неполный (нет removeItem) — подменяем ПРЕЖДЕ импортов памятью на карте.
vi.hoisted(() => {
  const mem = new Map<string, string>();
  Object.defineProperty(globalThis.window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
  });
});

const PAIRING: PairedNodeCredentials = {
  token: 'session-token',
  expiresAt: '2027-01-01T00:00:00.000Z',
  deviceId: '9e86ec85-0572-4253-8a3e-998ac2f36e80',
  mediaToken: 'media-token',
  mediaApiUrl: 'https://media.test',
  membraneId: 'mem-1',
  nodeId: 'node-1',
  nodeLabel: 'Firebat',
  maxUserWorkspaces: 1,
  tariffId: 'free-v1',
};

const linked = (tariff: PairStatusLinked['tariff']): PairStatusLinked => ({
  linked: true,
  keyActive: true,
  inactiveReason: null,
  membrane: { id: 'mem-1' },
  node: { id: 'node-1', label: 'Firebat' },
  deviceId: PAIRING.deviceId,
  pairedKeyId: 'pk-1',
  sessionExpiresAt: null,
  tariff,
});

const SERVER_2GB = {
  usedBytes: 510_302_892,
  limitBytes: 2_147_483_648,
  backend: 'server' as const,
  serverReachable: true,
  bufferUsedBytes: 510_115_200,
  bufferLimitBytes: 2_147_483_648,
};

describe('usePairStatusMonitor — тариф и предел прибора (#2538)', () => {
  let backend: MemoryStorageBackend;
  let service: MediaLibraryService;

  beforeEach(async () => {
    resetNodeConnectionStoreForTests();
    resetMediaLibraryHubBridgeForTests();
    // Снимок прибора до смены тарифа: серверный бэкенд, предел 512 МБ (живой опыт 01.10).
    backend = new MemoryStorageBackend({ limitBytes: 536_870_912, backend: 'server', serverReachable: true });
    service = configureDefaultMediaLibraryService(backend);
    await service.refresh();
    useNodeConnectionStore.setState({ mode: 'paired', pairing: PAIRING, hydrated: true });
    vi.mocked(pingMediaApi).mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    resetDefaultMediaLibraryServiceForTests();
    resetNodeConnectionStoreForTests();
    vi.mocked(fetchPairStatus).mockReset();
    vi.mocked(pingMediaApi).mockReset();
    vi.restoreAllMocks();
  });

  it('смена тарифа в ответе опроса: tariffId доезжает в учётные данные, предел прибора перечитан в том же цикле', async () => {
    vi.mocked(fetchPairStatus).mockResolvedValue(linked({ id: 'checkpoint-v1', maxUserWorkspaces: 3 }));
    const getQuota = vi.spyOn(backend, 'getQuota').mockResolvedValue(SERVER_2GB);
    const listCollections = vi.spyOn(backend, 'listCollections');

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().pairing?.tariffId).toBe('checkpoint-v1'));
    expect(useNodeConnectionStore.getState().pairing?.maxUserWorkspaces).toBe(3);
    await waitFor(() => expect(service.getSnapshot().quota.bufferLimitBytes).toBe(2_147_483_648));
    expect(getQuota).toHaveBeenCalled();
    // Предел читается лёгким запросом: списки проб в цикле опроса не листаются.
    expect(listCollections).not.toHaveBeenCalled();
  });

  it('тот же тариф: ссылка учётных данных не меняется, предел всё равно перечитан тиком — ровно один раз за цикл', async () => {
    vi.mocked(fetchPairStatus).mockResolvedValue(linked({ id: 'free-v1', maxUserWorkspaces: 1 }));
    const getQuota = vi.spyOn(backend, 'getQuota');
    const before = useNodeConnectionStore.getState().pairing;

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1));
    // Даём циклу дойти до конца: лишних чтений не появляется.
    await new Promise((r) => setTimeout(r, 30));
    expect(getQuota).toHaveBeenCalledTimes(1);
    expect(Object.is(useNodeConnectionStore.getState().pairing, before)).toBe(true);
    expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(false);
  });

  it('media недоступен: предел не читается, диалог «Сервер недоступен» с причиной media-server unreachable', async () => {
    vi.mocked(fetchPairStatus).mockResolvedValue(linked({ id: 'free-v1', maxUserWorkspaces: 1 }));
    vi.mocked(pingMediaApi).mockResolvedValue(false);
    const getQuota = vi.spyOn(backend, 'getQuota');

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true));
    expect(useNodeConnectionStore.getState().lastConnectionError).toBe('media-server unreachable');
    expect(getQuota).not.toHaveBeenCalled();
  });

  it('кабинет не ответил (бросок опроса): диалог с константой «cabinet unreachable», учётные данные целы — отдельный билет', async () => {
    vi.mocked(fetchPairStatus).mockRejectedValue(new Error('HTTP 502'));
    const getQuota = vi.spyOn(backend, 'getQuota');

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().lastConnectionError).toBe('cabinet unreachable'));
    expect(useNodeConnectionStore.getState().mode).toBe('paired');
    expect(useNodeConnectionStore.getState().pairing?.tariffId).toBe('free-v1');
    expect(getQuota).not.toHaveBeenCalled();
  });
});

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
import { HttpResponseError } from '@/lib/connection-fallback/httpResponseError';
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

  it('кабинет не ответил (бросок опроса): учётные данные целы, предел не читается', async () => {
    vi.mocked(fetchPairStatus).mockRejectedValue(new HttpResponseError(502, 'Bad Gateway'));
    const getQuota = vi.spyOn(backend, 'getQuota');

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true));
    expect(useNodeConnectionStore.getState().mode).toBe('paired');
    expect(useNodeConnectionStore.getState().pairing?.tariffId).toBe('free-v1');
    expect(getQuota).not.toHaveBeenCalled();
  });
});

/**
 * #2540 (b1): причина отказа опроса доходит до окна и журнала. На стволе 0eb88efa P1/P2/P3 красные
 * (`catch {}` → константа «cabinet unreachable», журнала нет).
 */
describe('usePairStatusMonitor — причина отказа опроса кабинета (#2540)', () => {
  const shellWrite = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    resetNodeConnectionStoreForTests();
    resetMediaLibraryHubBridgeForTests();
    const backend = new MemoryStorageBackend({ limitBytes: 536_870_912, backend: 'server', serverReachable: true });
    await configureDefaultMediaLibraryService(backend).refresh();
    useNodeConnectionStore.setState({ mode: 'paired', pairing: PAIRING, hydrated: true });
    vi.mocked(pingMediaApi).mockResolvedValue(true);
    shellWrite.mockClear();
    // Порт журнала оболочки Studio — как в renderer под Electron.
    window.electronAPI = {
      shellLog: { write: shellWrite, getLogsDir: vi.fn().mockResolvedValue('C:/logs'), flushScenarioTrace: vi.fn() },
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    resetDefaultMediaLibraryServiceForTests();
    resetNodeConnectionStoreForTests();
    vi.mocked(fetchPairStatus).mockReset();
    vi.mocked(pingMediaApi).mockReset();
    delete window.electronAPI;
    vi.restoreAllMocks();
  });

  it('P1: HTTP 502 от кабинета → класс server_error, статус 502, деталь и строка окна несут «502»', async () => {
    vi.mocked(fetchPairStatus).mockRejectedValue(new HttpResponseError(502, 'Bad Gateway'));

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true));
    const { lastConnectionFailure, lastConnectionError } = useNodeConnectionStore.getState();
    expect(lastConnectionFailure).toMatchObject({ source: 'cabinet', kind: 'server_error', httpStatus: 502 });
    expect(lastConnectionError).toContain('502');
    expect(lastConnectionError).toBe(lastConnectionFailure?.detail);
  });

  it('P2: сетевой отказ (TypeError: Failed to fetch) → класс unreachable, деталь = текст ошибки', async () => {
    vi.mocked(fetchPairStatus).mockRejectedValue(new TypeError('Failed to fetch'));

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true));
    expect(useNodeConnectionStore.getState().lastConnectionFailure).toMatchObject({
      source: 'cabinet',
      kind: 'unreachable',
      httpStatus: null,
      detail: 'Failed to fetch',
    });
    expect(useNodeConnectionStore.getState().lastConnectionError).toBe('Failed to fetch');
  });

  it('P3: отказ опроса → ровно одна строка в журнал оболочки, уровень warn, с ISO-меткой и классом', async () => {
    vi.mocked(fetchPairStatus).mockRejectedValue(new HttpResponseError(503, 'Service Unavailable'));

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true));
    expect(shellWrite).toHaveBeenCalledTimes(1);
    const [level, , message] = shellWrite.mock.calls[0] as [string, string, string];
    const at = useNodeConnectionStore.getState().lastConnectionFailure?.at ?? '';
    expect(level).toBe('warn');
    expect(at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u);
    expect(message).toContain(at);
    expect(message).toContain('server_error');
    expect(message).toContain('503');
  });

  it('429 → rate_limited; 403 → forbidden', async () => {
    vi.mocked(fetchPairStatus).mockRejectedValue(new HttpResponseError(429, 'Too Many Requests'));
    const { unmount } = renderHook(() => usePairStatusMonitor());
    await waitFor(() => expect(useNodeConnectionStore.getState().lastConnectionFailure?.kind).toBe('rate_limited'));
    unmount();

    resetNodeConnectionStoreForTests();
    useNodeConnectionStore.setState({ mode: 'paired', pairing: PAIRING, hydrated: true });
    vi.mocked(fetchPairStatus).mockRejectedValue(new HttpResponseError(403, 'Forbidden'));
    renderHook(() => usePairStatusMonitor());
    await waitFor(() => expect(useNodeConnectionStore.getState().lastConnectionFailure?.kind).toBe('forbidden'));
  });

  it('media недоступен: тот же тип отказа, источник media, прежняя строка-деталь (развилка 5)', async () => {
    vi.mocked(fetchPairStatus).mockResolvedValue(linked({ id: 'free-v1', maxUserWorkspaces: 1 }));
    vi.mocked(pingMediaApi).mockResolvedValue(false);

    renderHook(() => usePairStatusMonitor());

    await waitFor(() => expect(useNodeConnectionStore.getState().showFallbackDialog).toBe(true));
    expect(useNodeConnectionStore.getState().lastConnectionFailure).toMatchObject({
      source: 'media',
      kind: 'unreachable',
      detail: 'media-server unreachable',
    });
    expect(shellWrite).toHaveBeenCalledTimes(1);
  });
});

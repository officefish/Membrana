/**
 * Smoke шва B→C (контракт интеграции `cowork-buffer-full-stop`, §6 п.4; адаптер BC-1).
 *
 * Предмет — `buffer-policy-bridge.ts` поверх ЖИВОГО `ServerStorageBackend.getQuotaRaw()`
 * (фейковый `fetch`) и локального стража C. Порчи → красный: `getQuotaRaw` отбрасывает поле
 * `bufferPolicy` (как `getQuota`); мост отдаёт «последнее валидное» после падения `/quota`;
 * страж судит по чему-то, кроме `getEffectiveOverflowPolicy()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBrowserLimitedStorageBackend, createServerStorageBackend } from '@membrana/media-library-service';

import {
  bindBufferPolicySourceToBackend,
  getEffectiveBufferPolicy,
  getEffectiveOverflowPolicy,
  refreshEffectiveOverflowPolicy,
  resetBufferPolicyBridgeForTests,
  subscribeEffectiveOverflowPolicy,
} from './buffer-policy-bridge';
import { applyLocalGuardFromQuota, resetDeviceOverflowHoldForTests } from './device-overflow-hold';

const MB = 1048576;
const FULL_PARAMS = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };

function quotaRoot(bufferPolicy: unknown): Record<string, unknown> {
  return {
    userStorage: { usedBytes: 10, limitBytes: 1000, backend: 'server' },
    buffer: { usedBytes: 990, limitBytes: 1000, backend: 'server' },
    dataset: { catalogId: 'free-v1-catalog', sampleCount: 0 },
    userWorkspaces: { used: 0, limit: 3, backend: 'server' },
    bufferPolicy,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function serverBackend() {
  return createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd1', mediaToken: 't' });
}

describe('мост B↔C: эффективная политика с сырого /quota', () => {
  beforeEach(() => {
    resetBufferPolicyBridgeForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('до привязки и до первого чтения — stop (never_received); источник не тронут', () => {
    expect(getEffectiveOverflowPolicy()).toBe('stop');
    expect(getEffectiveBufferPolicy().source).toBe('never_received');
  });

  // #2318 (долг D-1): пока переключателя словаря нет, умная очистка с сервера до стража C НЕ
  // доходит — читатель B гасит её fail-closed на stop (источник `gated`), и страж держит.
  // Порча: снять fail-closed → getEffectiveOverflowPolicy = smart_cleanup, страж молчит → красный.
  it('сырой /quota с smart_cleanup (полный S) → getEffectiveOverflowPolicy = stop (gated); страж C при stop держит', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(quotaRoot({ mode: 'smart_cleanup', params: FULL_PARAMS })));
    vi.stubGlobal('fetch', fetchMock);
    bindBufferPolicySourceToBackend(serverBackend());

    await refreshEffectiveOverflowPolicy();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getEffectiveOverflowPolicy()).toBe('stop');
    expect(getEffectiveBufferPolicy()).toEqual({ policy: { mode: 'stop', params: null }, source: 'gated' });

    const hold = resetDeviceOverflowHoldForTests();
    const outcome = applyLocalGuardFromQuota(hold, { usedBytes: 1024 * MB, limitBytes: 1024 * MB }, getEffectiveOverflowPolicy());
    expect(outcome).toBe('entered');
    expect(hold.isHeld()).toBe(true);
  });

  it('/quota упал → stop (sync_failed), не «последнее валидное»; страж при stop держит', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(quotaRoot({ mode: 'stop', params: null }))));
    bindBufferPolicySourceToBackend(serverBackend());
    await refreshEffectiveOverflowPolicy();
    expect(getEffectiveBufferPolicy()).toEqual({ policy: { mode: 'stop', params: null }, source: 'server' });

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'down' }, 503)));
    await refreshEffectiveOverflowPolicy();

    expect(getEffectiveOverflowPolicy()).toBe('stop');
    expect(getEffectiveBufferPolicy().source).toBe('sync_failed');

    const hold = resetDeviceOverflowHoldForTests();
    expect(applyLocalGuardFromQuota(hold, { usedBytes: 1024 * MB, limitBytes: 1024 * MB }, getEffectiveOverflowPolicy())).toBe('entered');
    expect(hold.isHeld()).toBe(true);
  });

  it('порча ответа (легаси auto-cleanup, поля нет) → stop, malformed; smart без S при закрытом гейте → stop, gated (#2318: гейт раньше полноты)', async () => {
    bindBufferPolicySourceToBackend(serverBackend());
    for (const [bad, source] of [
      [{ mode: 'auto-cleanup' }, 'malformed'],
      [{ mode: 'smart_cleanup', params: null }, 'gated'],
      [undefined, 'malformed'],
    ] as const) {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(quotaRoot(bad))));
      await refreshEffectiveOverflowPolicy();
      expect(getEffectiveOverflowPolicy(), JSON.stringify(bad)).toBe('stop');
      expect(getEffectiveBufferPolicy().source, JSON.stringify(bad)).toBe(source);
    }
  });

  it('не-серверный бэкенд = источника нет → stop, sync_failed', async () => {
    bindBufferPolicySourceToBackend(createBrowserLimitedStorageBackend(1024 * MB));
    await refreshEffectiveOverflowPolicy();
    expect(getEffectiveOverflowPolicy()).toBe('stop');
    expect(getEffectiveBufferPolicy().source).toBe('sync_failed');
  });

  it('подписка C зовётся по факту смены значения читателя; при закрытом гейте (#2318) режим наружу — всегда stop', async () => {
    const seen: string[] = [];
    const off = subscribeEffectiveOverflowPolicy((mode) => seen.push(mode));
    bindBufferPolicySourceToBackend(serverBackend());
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(quotaRoot({ mode: 'smart_cleanup', params: FULL_PARAMS }))));
    await refreshEffectiveOverflowPolicy();
    await refreshEffectiveOverflowPolicy();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(quotaRoot({ mode: 'stop', params: null }))));
    await refreshEffectiveOverflowPolicy();
    off();
    // gated → server: значение читателя сменилось (источник), режим — нет; smart_cleanup C не видит.
    expect(seen).toEqual(['stop', 'stop']);
    expect(seen).not.toContain('smart_cleanup');
  });
});

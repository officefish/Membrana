/**
 * Зубы читателя (#2308, блок B). Предмет — `bufferPolicyReader.ts` на стабе источника `/quota`.
 * Порчи: до первого чтения отдать не-stop → красный; после падения чтения удержать прошлое
 * валидное → красный; бросок источника наружу → красный.
 */
import { describe, expect, it, vi } from 'vitest';

import { createBufferPolicyReader } from './bufferPolicyReader';
import { createQuotaSourceStub, quotaRoot } from './stubs/quota-source.stub';
import { STOP_POLICY } from './types';

const FULL = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };
const SMART = { mode: 'smart_cleanup', params: FULL };

describe('createBufferPolicyReader', () => {
  it('до первого чтения — stop, never_received; источник не тронут', () => {
    const stub = createQuotaSourceStub();
    const reader = createBufferPolicyReader(stub.source);
    expect(reader.current()).toEqual({ policy: STOP_POLICY, source: 'never_received' });
    expect(stub.calls).toBe(0);
  });

  it('успешное чтение — значение сервера', async () => {
    const stub = createQuotaSourceStub(quotaRoot(SMART));
    const reader = createBufferPolicyReader(stub.source);
    await reader.refresh();
    expect(reader.current()).toEqual({ policy: SMART, source: 'server' });
  });

  it('дыра синка после валидного значения → stop, sync_failed (порча: удержать прошлое → красный)', async () => {
    const stub = createQuotaSourceStub(quotaRoot(SMART));
    const reader = createBufferPolicyReader(stub.source);
    await reader.refresh();
    stub.fail();
    await expect(reader.refresh()).resolves.toEqual({ policy: STOP_POLICY, source: 'sync_failed' });
    expect(reader.current().policy.mode).toBe('stop');
  });

  it('следующее удачное чтение после дыры возвращает значение сервера', async () => {
    const stub = createQuotaSourceStub(quotaRoot(SMART));
    const reader = createBufferPolicyReader(stub.source);
    stub.fail();
    await reader.refresh();
    stub.respondWith(quotaRoot(SMART));
    await reader.refresh();
    expect(reader.current()).toEqual({ policy: SMART, source: 'server' });
  });

  it('порченый ответ → stop, malformed; refresh никогда не бросает', async () => {
    const stub = createQuotaSourceStub(quotaRoot({ mode: 'auto-cleanup' }));
    const reader = createBufferPolicyReader(stub.source);
    await expect(reader.refresh()).resolves.toEqual({ policy: STOP_POLICY, source: 'malformed' });
  });

  it('подписчик зовётся по факту СМЕНЫ, а не на каждый refresh', async () => {
    const stub = createQuotaSourceStub(quotaRoot(SMART));
    const reader = createBufferPolicyReader(stub.source);
    const listener = vi.fn();
    const off = reader.subscribe(listener);
    await reader.refresh();
    await reader.refresh();
    expect(listener).toHaveBeenCalledTimes(1);
    stub.respondWith(quotaRoot({ mode: 'stop', params: null }));
    await reader.refresh();
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    stub.respondWith(quotaRoot(SMART));
    await reader.refresh();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('читатель не опрашивает сам: число обращений к источнику = число refresh', async () => {
    const stub = createQuotaSourceStub();
    const reader = createBufferPolicyReader(stub.source);
    await reader.refresh();
    await reader.refresh();
    await reader.refresh();
    expect(stub.calls).toBe(3);
  });
});

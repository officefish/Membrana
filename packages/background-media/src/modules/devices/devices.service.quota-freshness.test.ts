/**
 * ЗУБ НА УТВЕРЖДЕНИЕ, А НЕ НА КОД (#2281).
 *
 * DoD билета требует замером, а не догадкой, ответить: видит ли прибор новый объём буфера ПОСЛЕ
 * смены тарифа, БЕЗ перепривязки узла. Утверждение отвечает «да», и держит его вот что: предел
 * не кешируется нигде — `getQuota` читает строку прибора заново на каждый запрос и пересчитывает
 * `resolveDeviceLimits`. Значит достаточно, чтобы кабинет обновил строку (`syncMembraneContext`).
 *
 * Зуб заведён на СВОЙСТВО «предел берётся из свежей строки», а не на текущую реализацию: заведи
 * кто-нибудь кеш лимитов ради скорости — обещание «без перепривязки» тихо перестанет быть правдой,
 * и красным станет именно оно, а не сам кеш.
 */
import { describe, expect, it, vi } from 'vitest';

import { DevicesService } from './devices.service';

const CONFIG = {
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_000,
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 2_000,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: 'catalog-free',
  MEDIA_DEFAULT_MAX_USER_WORKSPACES: 3,
} as never;

/** Строка прибора, какой её оставляет кабинет через PATCH /v1/devices/:id/membrane. */
function deviceRow(bufferQuotaBytes: bigint) {
  return {
    id: 'dev-1',
    membraneId: 'm-1',
    userStorageQuotaBytes: 10_000n,
    bufferQuotaBytes,
    datasetCatalogId: 'catalog-checkpoint',
    maxUserWorkspaces: 7,
  };
}

function makeService() {
  const row = { current: deviceRow(2_000n) };
  const prisma = {
    device: { findUnique: vi.fn(async () => row.current) },
    sample: { findMany: vi.fn(async () => []) },
    deviceWorkspace: { count: vi.fn(async () => 0) },
  };
  const service = new DevicesService(prisma as never, CONFIG, {} as never);
  return { service, prisma, row };
}

describe('предел прибора после смены тарифа', () => {
  it('новый объём буфера виден СРАЗУ — без перепривязки и перезапуска', async () => {
    const { service, row } = makeService();

    const before = await service.getQuota('dev-1');
    expect(before.buffer.limitBytes).toBe(2_000);

    // Ровно то, что делает разноска кабинета: обновляет строку прибора. Ни регистрации, ни
    // выпуска ключа, ни повторной привязки между двумя чтениями не происходит.
    row.current = deviceRow(50_000n);

    const after = await service.getQuota('dev-1');
    expect(after.buffer.limitBytes).toBe(50_000);
  });

  it('предел читается ЗАНОВО на каждый запрос — кеша между вызовами нет', async () => {
    const { service, prisma } = makeService();
    await service.getQuota('dev-1');
    await service.getQuota('dev-1');
    expect(prisma.device.findUnique).toHaveBeenCalledTimes(2);
  });

  it('понижение тарифа тоже доезжает — предел уменьшается той же дорогой', async () => {
    const { service, row } = makeService();
    row.current = deviceRow(500n);
    const quota = await service.getQuota('dev-1');
    expect(quota.buffer.limitBytes).toBe(500);
  });
});

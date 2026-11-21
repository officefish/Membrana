/**
 * Зубы копии признака «возобновлять сценарий при старте» у прибора (ADR-0033 Р1, PR-1).
 * Красные на стволе 041d423a: поля нет ни в разноске, ни в `/quota`.
 * Порчи: писать колонку из не-булева (строка "true") → красный; затирать признак, когда старый
 * кабинет поля не прислал → красный; отдавать прибору `true` для строки без колонки → красный.
 */
import { describe, expect, it, vi } from 'vitest';

import { DevicesService, scenarioAutoResumeColumns } from './devices.service';

const CONFIG = {
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_000,
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 2_000,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: 'catalog-free',
  MEDIA_DEFAULT_MAX_USER_WORKSPACES: 3,
} as never;

const CONTEXT = {
  membraneId: 'm-1',
  userStorageQuotaBytes: '10000',
  bufferQuotaBytes: '2000',
  datasetCatalogId: 'catalog-checkpoint',
};

function deviceRow(over: Record<string, unknown> = {}) {
  return {
    id: 'dev-1',
    name: 'lab',
    kind: 'other',
    createdAt: new Date('2026-11-21T00:00:00Z'),
    membraneId: 'm-1',
    tariffContractVersion: 2,
    userStorageQuotaBytes: 10_000n,
    bufferQuotaBytes: 2_000n,
    datasetCatalogId: 'catalog-checkpoint',
    maxUserWorkspaces: 7,
    bufferPolicy: 'stop',
    bufferPolicyParams: null,
    ...over,
  };
}

function makeService(row: Record<string, unknown> = deviceRow()) {
  const prisma = {
    device: {
      findUnique: vi.fn(async () => row),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => ({ ...row, ...args.data })),
    },
    sample: { findMany: vi.fn(async () => []) },
    deviceWorkspace: { count: vi.fn(async () => 0) },
  };
  return { service: new DevicesService(prisma as never, CONFIG, {} as never), prisma };
}

describe('признак возобновления: приём при разноске', () => {
  it('колонка — только из булева', () => {
    expect(scenarioAutoResumeColumns(true)).toEqual({ scenarioAutoResume: true });
    expect(scenarioAutoResumeColumns(false)).toEqual({ scenarioAutoResume: false });
    for (const bad of ['true', 1, null, undefined, {}]) expect(scenarioAutoResumeColumns(bad)).toEqual({});
  });

  it('кабинет прислал true → записано; старый кабинет без поля → колонка не тронута', async () => {
    const on = makeService();
    await on.service.syncMembraneContext('dev-1', { ...CONTEXT, scenarioAutoResume: true });
    expect(on.prisma.device.update.mock.calls[0]![0].data.scenarioAutoResume).toBe(true);

    const old = makeService();
    await old.service.syncMembraneContext('dev-1', CONTEXT);
    expect('scenarioAutoResume' in old.prisma.device.update.mock.calls[0]![0].data).toBe(false);
  });
});

describe('признак возобновления: отдача прибору через /quota', () => {
  it('true только при явном true; строка без колонки или порча — ВЫКЛ', async () => {
    expect((await makeService(deviceRow({ scenarioAutoResume: true })).service.getQuota('dev-1')).scenarioAutoResume).toBe(true);
    expect((await makeService(deviceRow({ scenarioAutoResume: false })).service.getQuota('dev-1')).scenarioAutoResume).toBe(false);
    expect((await makeService(deviceRow()).service.getQuota('dev-1')).scenarioAutoResume).toBe(false);
    expect((await makeService(deviceRow({ scenarioAutoResume: 'true' })).service.getQuota('dev-1')).scenarioAutoResume).toBe(false);
  });
});

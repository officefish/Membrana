import { describe, expect, it, vi } from 'vitest';

import { DevicesController } from './devices.controller';

function makeController() {
  const devices = {
    register: vi.fn(async () => ({
      device: { id: 'dev-1', name: 'lab', kind: 'other', createdAt: new Date('2026-09-08T00:00:00Z') },
      clientKey: { keyId: 'k-1', raw: 'raw', createdAt: new Date('2026-09-08T00:00:01Z') },
    })),
    syncMembraneContext: vi.fn(async () => ({
      ok: true,
      device: {
        id: 'dev-1',
        name: 'lab',
        kind: 'other',
        createdAt: new Date('2026-09-08T00:00:00Z'),
        tariffContractVersion: 2,
      },
      bufferPolicy: { mode: 'stop', params: null },
    })),
    getQuota: vi.fn(async () => ({ tariffContractVersion: 2 })),
  };
  return { controller: new DevicesController(devices as never), devices };
}

const MEMBRANE = {
  membraneId: '00000000-0000-4000-8000-000000000001',
  tariffContractVersion: 2,
  userStorageQuotaBytes: '10000',
  bufferQuotaBytes: '2000',
  datasetCatalogId: 'catalog-checkpoint',
  maxUserWorkspaces: 7,
};

describe('DevicesController: tariff contract version carrier (#2333 v1)', () => {
  it('register passes tariffContractVersion into the service membrane context', async () => {
    const { controller, devices } = makeController();
    await controller.register({ name: 'lab', kind: 'other', membrane: MEMBRANE });
    expect(devices.register).toHaveBeenCalledWith(
      'lab',
      'other',
      expect.objectContaining({ tariffContractVersion: 2 }),
    );
  });

  it('PATCH /membrane passes tariffContractVersion into the service membrane context', async () => {
    const { controller, devices } = makeController();
    await controller.syncMembrane('dev-1', { membrane: MEMBRANE });
    expect(devices.syncMembraneContext).toHaveBeenCalledWith(
      'dev-1',
      expect.objectContaining({ tariffContractVersion: 2 }),
    );
  });

  it('PATCH /membrane response names the stored tariffContractVersion on ok=true', async () => {
    const { controller } = makeController();
    await expect(controller.syncMembrane('dev-1', { membrane: MEMBRANE })).resolves.toEqual(
      expect.objectContaining({ ok: true, tariffContractVersion: 2 }),
    );
  });

  it('/quota returns the service payload with tariffContractVersion intact', async () => {
    const { controller } = makeController();
    await expect(controller.quota('dev-1')).resolves.toEqual({ tariffContractVersion: 2 });
  });
});

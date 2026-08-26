import { describe, expect, it, vi } from 'vitest';

import { CollectionsController } from './collections.controller.js';

describe('CollectionsController.ensureReserved', () => {
  it('returns reserved collections without awaiting catalog provisioning', async () => {
    const collections = [{ id: '__buffer__' }];
    const collectionsService = {
      ensureReserved: vi.fn(async () => collections),
    };
    const catalogProvision = {
      provisionTariffCatalogIfNeeded: vi.fn(() => new Promise<void>(() => {})),
    };
    const firstWave = {};
    const controller = new CollectionsController(
      collectionsService as never,
      catalogProvision as never,
      firstWave as never,
    );

    await expect(controller.ensureReserved('device-1')).resolves.toBe(collections);
    expect(catalogProvision.provisionTariffCatalogIfNeeded).toHaveBeenCalledWith('device-1');
  });

  it('plugin list and toggle are owned by media home after collection ownership check', async () => {
    const collectionsService = {
      getOwned: vi.fn(async () => ({ id: 'c1', deviceId: 'device-1' })),
    };
    const firstWave = {
      mountTargetId: 'background-media/collections',
      getPluginStates: vi.fn(() => [
        { manifest: { id: 'membrana.showcase.library-chart-list', kind: 'showcase' }, enabled: true },
      ]),
      setPluginEnabled: vi.fn(),
    };
    const controller = new CollectionsController(
      collectionsService as never,
      {} as never,
      firstWave as never,
    );

    await expect(controller.listPlugins('device-1', 'c1')).resolves.toEqual({
      mountTarget: 'background-media/collections',
      plugins: [{ manifest: { id: 'membrana.showcase.library-chart-list', kind: 'showcase' }, enabled: true }],
    });
    await expect(controller.setPluginEnabled('device-1', 'c1', 'membrana.showcase.library-chart-list', { enabled: false })).resolves.toEqual({ ok: true });

    expect(collectionsService.getOwned).toHaveBeenCalledWith('device-1', 'c1');
    expect(firstWave.setPluginEnabled).toHaveBeenCalledWith('membrana.showcase.library-chart-list', false);
  });
});

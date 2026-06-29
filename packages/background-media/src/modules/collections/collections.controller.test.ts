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
    const controller = new CollectionsController(
      collectionsService as never,
      catalogProvision as never,
    );

    await expect(controller.ensureReserved('device-1')).resolves.toBe(collections);
    expect(catalogProvision.provisionTariffCatalogIfNeeded).toHaveBeenCalledWith('device-1');
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import type { UserCaseCatalogEntrySummary } from '@membrana/device-board';
import { UserCaseCatalogService } from '@membrana/device-board';

import {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
  resetDefaultClientUserCaseCatalogService,
} from './service.js';

const tariffSummary: UserCaseCatalogEntrySummary = {
  id: 'usercase-tariff-demo',
  title: 'Tariff demo',
  deviceKind: 'microphone',
  tier: 'tariff',
  tariffSku: 'pro-usercases-v1',
  layoutProfile: 'exec-lr-v1',
  branchCount: 6,
  functionCount: 0,
};

describe('ClientUserCaseCatalogService', () => {
  afterEach(() => {
    resetDefaultClientUserCaseCatalogService();
  });

  it('bundled MVP is always canApply', () => {
    const service = new ClientUserCaseCatalogService();
    expect(service.canApply('usercase-mvp-microphone')).toBe(true);
    expect(service.canApply('usercase-mvp-microphone', 'microphone')).toBe(true);
    expect(service.canApply('usercase-mvp-microphone', 'playback')).toBe(false);
  });

  it('listCards marks bundled tier', () => {
    const service = new ClientUserCaseCatalogService();
    const cards = service.listCards('microphone');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.find((c) => c.id === 'usercase-mvp-microphone')?.entitlement).toBe('bundled');
    expect(cards[0]?.canApply).toBe(true);
  });

  it('community competition async-v2 entries are applicable', () => {
    const service = new ClientUserCaseCatalogService();
    for (const id of [
      'usercase-mvp-microphone-alpha-async-v2',
      'usercase-mvp-microphone-beta-async-v2',
      'usercase-mvp-microphone-gamma-async-v2',
    ]) {
      expect(service.canApply(id, 'microphone')).toBe(true);
      const card = service.listCards('microphone').find((c) => c.id === id);
      expect(card?.entitlement).toBe('community');
      expect(card?.canApply).toBe(true);
    }
    expect(
      service.loadDocumentIfEntitled('usercase-mvp-microphone-beta-async-v2', 'microphone'),
    ).not.toBeNull();
  });

  it('tariff entry locked without entitled SKU', () => {
    const catalog = new UserCaseCatalogService([
      {
        ...tariffSummary,
        loadDocument: () => {
          throw new Error('not bundled');
        },
      },
    ]);
    const service = new ClientUserCaseCatalogService({ catalog });
    const card = service.listCards()[0];
    expect(card?.entitlement).toBe('locked');
    expect(service.canApply('usercase-tariff-demo')).toBe(false);
  });

  it('tariff entry entitled when SKU active', () => {
    const catalog = new UserCaseCatalogService([
      {
        ...tariffSummary,
        loadDocument: () => {
          throw new Error('not bundled');
        },
      },
    ]);
    const service = new ClientUserCaseCatalogService({
      catalog,
      entitledTariffSkus: new Set(['pro-usercases-v1']),
    });
    expect(service.canApply('usercase-tariff-demo')).toBe(true);
    expect(service.listCards()[0]?.entitlement).toBe('entitled');
  });

  it('getDefaultClientUserCaseCatalogService returns singleton', () => {
    const a = getDefaultClientUserCaseCatalogService();
    const b = getDefaultClientUserCaseCatalogService();
    expect(a).toBe(b);
  });
});

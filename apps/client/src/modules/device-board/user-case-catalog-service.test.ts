import { describe, expect, it, afterEach } from 'vitest';

import type { UserCaseCatalogEntrySummary } from '@membrana/device-board';
import { UserCaseCatalogService } from '@membrana/device-board';

import {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
  resetDefaultClientUserCaseCatalogService,
} from './user-case-catalog-service.js';

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
    expect(cards).toHaveLength(1);
    expect(cards[0]?.entitlement).toBe('bundled');
    expect(cards[0]?.canApply).toBe(true);
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

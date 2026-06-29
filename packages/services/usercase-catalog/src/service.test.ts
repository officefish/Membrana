import { afterEach, describe, expect, it } from 'vitest';

import type {
  DeviceKind,
  DeviceScenarioDocument,
  UserCaseCatalogEntrySummary,
} from '@membrana/core';

import {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
  resetDefaultClientUserCaseCatalogService,
  type UserCaseCatalogPort,
} from './service.js';

const bundledSummaries: readonly UserCaseCatalogEntrySummary[] = [
  {
    id: 'usercase-mvp-microphone',
    title: 'MVP microphone',
    deviceKind: 'microphone',
    tier: 'bundled',
    layoutProfile: 'exec-lr-v1',
    branchCount: 3,
    functionCount: 0,
  },
  ...['alpha', 'beta', 'gamma'].map(
    (suffix): UserCaseCatalogEntrySummary => ({
      id: `usercase-mvp-microphone-${suffix}`,
      title: `MVP microphone ${suffix}`,
      deviceKind: 'microphone',
      tier: 'community',
      layoutProfile: 'exec-lr-v1',
      branchCount: 3,
      functionCount: 0,
    }),
  ),
];

function createCatalog(
  summaries: readonly UserCaseCatalogEntrySummary[] = bundledSummaries,
): UserCaseCatalogPort {
  return {
    listSummaries: () => summaries,
    listForDeviceKind: (deviceKind: DeviceKind) =>
      summaries.filter((summary) => summary.deviceKind === deviceKind),
    getSummary: (id: string) => summaries.find((summary) => summary.id === id) ?? null,
    loadDocument: (id: string) =>
      summaries.some((summary) => summary.id === id)
        ? ({} as DeviceScenarioDocument)
        : null,
  };
}

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
    const service = new ClientUserCaseCatalogService({ catalog: createCatalog() });
    expect(service.canApply('usercase-mvp-microphone')).toBe(true);
    expect(service.canApply('usercase-mvp-microphone', 'microphone')).toBe(true);
    expect(service.canApply('usercase-mvp-microphone', 'playback')).toBe(false);
  });

  it('listCards marks bundled tier', () => {
    const service = new ClientUserCaseCatalogService({ catalog: createCatalog() });
    const cards = service.listCards('microphone');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    expect(cards.find((c) => c.id === 'usercase-mvp-microphone')?.entitlement).toBe('bundled');
    expect(cards[0]?.canApply).toBe(true);
  });

  it('community competition entries are applicable', () => {
    const service = new ClientUserCaseCatalogService({ catalog: createCatalog() });
    for (const id of [
      'usercase-mvp-microphone-alpha',
      'usercase-mvp-microphone-beta',
      'usercase-mvp-microphone-gamma',
    ]) {
      expect(service.canApply(id, 'microphone')).toBe(true);
      const card = service.listCards('microphone').find((c) => c.id === id);
      expect(card?.entitlement).toBe('community');
      expect(card?.canApply).toBe(true);
    }
    expect(
      service.loadDocumentIfEntitled('usercase-mvp-microphone-beta', 'microphone'),
    ).not.toBeNull();
  });

  it('tariff entry locked without entitled SKU', () => {
    const catalog = createCatalog([tariffSummary]);
    const service = new ClientUserCaseCatalogService({ catalog });
    const card = service.listCards()[0];
    expect(card?.entitlement).toBe('locked');
    expect(service.canApply('usercase-tariff-demo')).toBe(false);
  });

  it('tariff entry entitled when SKU active', () => {
    const catalog = createCatalog([tariffSummary]);
    const service = new ClientUserCaseCatalogService({
      catalog,
      entitledTariffSkus: new Set(['pro-usercases-v1']),
    });
    expect(service.canApply('usercase-tariff-demo')).toBe(true);
    expect(service.listCards()[0]?.entitlement).toBe('entitled');
  });

  it('getDefaultClientUserCaseCatalogService returns singleton', () => {
    const a = getDefaultClientUserCaseCatalogService({ catalog: createCatalog() });
    const b = getDefaultClientUserCaseCatalogService();
    expect(a).toBe(b);
  });
});

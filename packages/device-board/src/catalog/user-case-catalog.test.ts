import { describe, expect, it, afterEach } from 'vitest';

import { parseDeviceScenarioDocument } from '@membrana/core';

import {
  UserCaseCatalogService,
  getDefaultUserCaseCatalogService,
  resetDefaultUserCaseCatalogService,
} from './user-case-catalog.js';

const ASYNC_V2_IDS = [
  'usercase-mvp-microphone-alpha-async-v2',
  'usercase-mvp-microphone-beta-async-v2',
  'usercase-mvp-microphone-gamma-async-v2',
] as const;

const FREE_TIER_IDS = [
  'usercase-free-spectrum-live',
  'usercase-free-sample-library',
  'usercase-free-neuro-detection',
  'usercase-free-combined-alarm',
] as const;

describe('UserCaseCatalogService', () => {
  afterEach(() => {
    resetDefaultUserCaseCatalogService();
  });

  it('lists bundled MVP + FREE-tier scaffold + competition async-v2 community forks', () => {
    const catalog = new UserCaseCatalogService();
    expect(catalog.size).toBe(8);
    const summaries = catalog.listSummaries();
    expect(summaries[0]?.id).toBe('usercase-mvp-microphone');
    expect(summaries[0]?.tier).toBe('bundled');
    for (const id of ASYNC_V2_IDS) {
      const entry = summaries.find((s) => s.id === id);
      expect(entry?.tier).toBe('community');
    }
    expect(summaries.some((entry) => entry.id === 'usercase-mvp-microphone-beta')).toBe(false);
  });

  it('FREE-tier scaffold: 3+1 UserCase — bundled (always applicable), microphone', () => {
    const catalog = new UserCaseCatalogService();
    const summaries = catalog.listSummaries();
    for (const id of FREE_TIER_IDS) {
      const entry = summaries.find((s) => s.id === id);
      expect(entry, id).toBeDefined();
      // tier:'bundled' → всегда canApply (FREE-лайнап доступен всем).
      expect(entry?.tier).toBe('bundled');
      expect(entry?.deviceKind).toBe('microphone');
    }
    // «3+1» = ровно 4 записи в лайнапе.
    expect(FREE_TIER_IDS).toHaveLength(4);
  });

  it('FREE-tier scaffold loadDocument mounts a valid (empty) device-scenario v2', () => {
    const catalog = new UserCaseCatalogService();
    for (const id of FREE_TIER_IDS) {
      const document = catalog.loadDocument(id);
      expect(document, id).not.toBeNull();
      const parsed = parseDeviceScenarioDocument(document);
      expect(parsed.ok, id).toBe(true);
      if (parsed.ok) {
        expect(parsed.value.deviceKind).toBe('microphone');
      }
    }
  });

  it('loadDocument returns valid device-scenario v2', () => {
    const catalog = new UserCaseCatalogService();
    const document = catalog.loadDocument('usercase-mvp-microphone');
    expect(document).not.toBeNull();
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.deviceKind).toBe('microphone');
      expect(parsed.value.scenario.loops.main.nodes.length).toBeGreaterThan(0);
    }
  });

  it('loadDocument works for published async-v2 competition forks', () => {
    const catalog = new UserCaseCatalogService();
    for (const id of ASYNC_V2_IDS) {
      const document = catalog.loadDocument(id);
      expect(document).not.toBeNull();
      const parsed = parseDeviceScenarioDocument(document);
      expect(parsed.ok, id).toBe(true);
      if (parsed.ok) {
        expect(parsed.value.meta?.competitionBase).toBe('v2.0-async');
      }
    }
  });

  it('listForDeviceKind filters by deviceKind', () => {
    const catalog = new UserCaseCatalogService();
    expect(catalog.listForDeviceKind('microphone')).toHaveLength(8);
    expect(catalog.listForDeviceKind('playback')).toHaveLength(0);
  });

  it('loadDocument returns null for archived v1 competition alpha', () => {
    const catalog = new UserCaseCatalogService();
    expect(catalog.loadDocument('usercase-mvp-microphone-alpha')).toBeNull();
  });

  it('getDefaultUserCaseCatalogService returns singleton', () => {
    const a = getDefaultUserCaseCatalogService();
    const b = getDefaultUserCaseCatalogService();
    expect(a).toBe(b);
  });

  it('getEntry returns null for unknown id', () => {
    const catalog = new UserCaseCatalogService();
    expect(catalog.getEntry('usercase-unknown')).toBeNull();
  });
});

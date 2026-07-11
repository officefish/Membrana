import { describe, expect, it, afterEach } from 'vitest';

import { parseDeviceScenarioDocument } from '@membrana/core';

import {
  SCENARIO_ALARM_ENTRY,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
} from '../graph/index.js';
import {
  UserCaseCatalogService,
  getDefaultUserCaseCatalogService,
  resetDefaultUserCaseCatalogService,
} from './user-case-catalog.js';

/**
 * NB6 (tooling-retro): точки входа сценария обязаны совпадать с каноническими
 * SCENARIO_*_ENTRY — иначе pre-run validation не находит узлы, сценарий не стартует
 * (L36: Alpha названа alpha-* → не запускалась). Гард ловит это ДО живого прогона.
 */
function canonicalEntryViolations(scenario) {
  const checks = [
    ['loops.main.entry', scenario?.loops?.main?.entry, SCENARIO_MAIN_ENTRY],
    ['loops.alarm.entry', scenario?.loops?.alarm?.entry, SCENARIO_ALARM_ENTRY],
    ['initial.entry', scenario?.initial?.entry, SCENARIO_INITIAL_ENTRY],
  ];
  return checks
    .filter(([, actual, expected]) => actual !== undefined && actual !== expected)
    .map(([field, actual, expected]) => `${field}: '${actual}' ≠ канон '${expected}'`);
}

function loadScenario(catalog, id) {
  const parsed = parseDeviceScenarioDocument(catalog.loadDocument(id));
  if (!parsed.ok) throw new Error(`parse failed: ${id}`);
  return parsed.value.scenario;
}

const DETECTION_ALARM_IDS = [
  'usercase-detection-alarm-alpha',
  'usercase-detection-alarm-beta',
  'usercase-detection-alarm-gamma',
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

  it('lists bundled MVP + FREE-tier scaffold + detection-alarm community forks (comp 5b)', () => {
    const catalog = new UserCaseCatalogService();
    // 1 MVP + 4 FREE + 3 detection-alarm (comp-detection-alarm-2026-07-10, Phase 5b)
    expect(catalog.size).toBe(8);
    const summaries = catalog.listSummaries();
    expect(summaries[0]?.id).toBe('usercase-mvp-microphone');
    expect(summaries[0]?.tier).toBe('bundled');
    for (const id of DETECTION_ALARM_IDS) {
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

  it('loadDocument works for published detection-alarm competition forks', () => {
    const catalog = new UserCaseCatalogService();
    for (const id of DETECTION_ALARM_IDS) {
      const document = catalog.loadDocument(id);
      expect(document).not.toBeNull();
      const parsed = parseDeviceScenarioDocument(document);
      expect(parsed.ok, id).toBe(true);
      if (parsed.ok) {
        // Phase 5b (comp-detection-alarm): непустой граф полной цепочки задания.
        expect(parsed.value.scenario.loops.main.nodes.length, id).toBeGreaterThan(0);
      }
    }
  });

  it('listForDeviceKind filters by deviceKind', () => {
    const catalog = new UserCaseCatalogService();
    expect(catalog.listForDeviceKind('microphone')).toHaveLength(8);
    expect(catalog.listForDeviceKind('playback')).toHaveLength(0);
  });

  it('detection-alarm-beta (comp-detection-alarm-2026-07-10): карточка community, валидный документ', () => {
    const catalog = new UserCaseCatalogService();
    const summary = catalog.getSummary('usercase-detection-alarm-beta');
    expect(summary?.tier).toBe('community');
    expect(summary?.deviceKind).toBe('microphone');
    expect(summary?.title).toContain('Beta');
    // Честность описания: DSP-ансамбль, не нейро.
    expect(summary?.description ?? '').not.toMatch(/нейро|yamnet|neural/i);
    const document = catalog.loadDocument('usercase-detection-alarm-beta');
    expect(document).not.toBeNull();
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.scenario.loops.main.nodes.length).toBeGreaterThan(0);
      expect(parsed.value.scenario.loops.alarm.nodes.length).toBeGreaterThan(0);
    }
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

  // NB6: entry-точки Beta/Gamma канонические → pre-run стартует.
  it('detection-alarm Beta/Gamma: точки входа канонические (SCENARIO_*_ENTRY, L36-гард)', () => {
    const catalog = new UserCaseCatalogService();
    for (const id of ['usercase-detection-alarm-beta', 'usercase-detection-alarm-gamma']) {
      const violations = canonicalEntryViolations(loadScenario(catalog, id));
      expect(violations, `${id}: ${violations.join(' · ')}`).toEqual([]);
    }
  });

  // NB6: Alpha сейчас нарушает канон (L36) — документируем известную поломку.
  // Когда Alpha починят (завтрашняя сценарная переделка) — тест покраснеет:
  // сигнал перенести Alpha в предыдущий тест и удалить этот.
  it('detection-alarm Alpha: ИЗВЕСТНАЯ L36-поломка — entry-id не канонические (удалить после фикса)', () => {
    const catalog = new UserCaseCatalogService();
    const violations = canonicalEntryViolations(loadScenario(catalog, 'usercase-detection-alarm-alpha'));
    expect(violations.length, 'Alpha починена? перенеси в Beta/Gamma-тест и удали этот').toBeGreaterThan(0);
  });
});

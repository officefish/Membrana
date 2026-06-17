import { describe, expect, it } from 'vitest';

import {
  DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS,
  DRONE_TIGHT_TEMPLATE_KEY,
  DRONE_TIGHT_TRENDS_INTERVAL_MS,
  DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  filterTrendsTemplatesByEnabledKeys,
  getDroneTightEnabledTemplateKeys,
  getDroneTightTrendsCatalog,
  isDroneTightTrendsDetection,
  resolveTrendsTemplatesForAnalysis,
} from './droneTightCalibration';

describe('droneTightCalibration', () => {
  it('exports DRONE_TIGHT catalog with system competitors', () => {
    const catalog = getDroneTightTrendsCatalog();
    expect(catalog.some((t) => t.key === DRONE_TIGHT_TEMPLATE_KEY)).toBe(true);
    expect(catalog.some((t) => t.key === 'WIND')).toBe(true);
    expect(catalog.length).toBeGreaterThan(1);
  });

  it('enabled keys match catalog', () => {
    const keys = getDroneTightEnabledTemplateKeys();
    expect(keys).toContain(DRONE_TIGHT_TEMPLATE_KEY);
    expect(keys.length).toBe(getDroneTightTrendsCatalog().length);
  });

  it('FFT threshold defaults use calibrated spectral box', () => {
    const { thresholds, frameCount, strictness, intervalMs } =
      DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS;
    expect(intervalMs).toBe(DRONE_TIGHT_TRENDS_INTERVAL_MS);
    expect(frameCount).toBe(5);
    expect(strictness).toBe('normal');
    expect(thresholds.centroid.min).toBe(2900);
    expect(thresholds.centroid.max).toBe(4300);
  });

  it('trends sample defaults align with harness', () => {
    expect(DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT).toBe(10);
    expect(DRONE_TIGHT_TRENDS_INTERVAL_MS).toBe(500);
  });

  it('isDroneTightTrendsDetection requires DRONE_ prefix', () => {
    expect(isDroneTightTrendsDetection('DRONE_TIGHT', true)).toBe(true);
    expect(isDroneTightTrendsDetection('wind', true)).toBe(false);
    expect(isDroneTightTrendsDetection('DRONE_TIGHT', false)).toBe(false);
  });

  it('filterTrendsTemplatesByEnabledKeys keeps only checked templates', () => {
    const catalog = getDroneTightTrendsCatalog();
    const filtered = filterTrendsTemplatesByEnabledKeys(catalog, ['WIND', 'QUIET']);
    expect(filtered.map((t) => t.key)).toEqual(['WIND', 'QUIET']);
    expect(filtered.some((t) => t.key === DRONE_TIGHT_TEMPLATE_KEY)).toBe(false);
  });

  it('resolveTrendsTemplatesForAnalysis excludes disabled system and user templates', () => {
    const userTemplate = {
      key: 'user:singer',
      name: 'Поющий человек',
      icon: '🎤',
      color: '#f0f',
      description: 'test',
      thresholds: getDroneTightTrendsCatalog()[0]!.thresholds,
      temporalPatterns: getDroneTightTrendsCatalog()[0]!.temporalPatterns,
    };
    const enabled = getDroneTightEnabledTemplateKeys().filter((k) => k !== DRONE_TIGHT_TEMPLATE_KEY);
    const templates = resolveTrendsTemplatesForAnalysis([userTemplate], enabled);
    expect(templates.some((t) => t.key === DRONE_TIGHT_TEMPLATE_KEY)).toBe(false);
    expect(templates.some((t) => t.key === 'user:singer')).toBe(false);
    expect(templates.length).toBe(enabled.length);
  });
});

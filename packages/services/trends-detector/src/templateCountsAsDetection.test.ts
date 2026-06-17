import { describe, expect, it } from 'vitest';

import { templateCountsAsDetection } from './templateCountsAsDetection.js';
import type { PatternTemplate } from './types.js';

function stubTemplate(overrides: Partial<PatternTemplate> & Pick<PatternTemplate, 'key'>): PatternTemplate {
  return {
    name: overrides.key,
    icon: '❓',
    color: '#999',
    description: '',
    thresholds: {
      centroid: { min: 0, max: 1 },
      flux: { min: 0, max: 1 },
      rms: { min: 0, max: 1 },
    },
    temporalPatterns: {},
    ...overrides,
    key: overrides.key,
  };
}

describe('templateCountsAsDetection', () => {
  it('defaults DRONE_* keys to true', () => {
    expect(templateCountsAsDetection(stubTemplate({ key: 'DRONE_TIGHT' }))).toBe(true);
  });

  it('defaults non-drone keys to false', () => {
    expect(templateCountsAsDetection(stubTemplate({ key: 'WIND' }))).toBe(false);
  });

  it('honours explicit countsAsDetection flag', () => {
    expect(
      templateCountsAsDetection(
        stubTemplate({ key: 'WIND', countsAsDetection: true }),
      ),
    ).toBe(true);
    expect(
      templateCountsAsDetection(
        stubTemplate({ key: 'DRONE_TIGHT', countsAsDetection: false }),
      ),
    ).toBe(false);
  });
});

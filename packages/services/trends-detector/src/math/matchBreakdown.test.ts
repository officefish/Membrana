import { describe, expect, it } from 'vitest';

import {
  buildTemplateMatchBreakdown,
  classifyTrends,
  resolveEnabledTemplates,
} from '../index.js';

describe('buildTemplateMatchBreakdown', () => {
  it('returns per-field rows for the winning template', () => {
    const samples = Array.from({ length: 40 }, (_, index) => ({
      timestamp: index * 30,
      centroid: 350 + Math.sin(index / 8) * 5,
      flux: 0.25,
      rms: 0.1,
    }));
    const templates = resolveEnabledTemplates(['WIND', 'QUIET']);
    const result = classifyTrends(samples, templates);
    const wind = templates.find((t) => t.key === 'WIND');
    expect(result.temporalFeatures).not.toBeNull();
    expect(wind).toBeDefined();

    const breakdown = buildTemplateMatchBreakdown(
      result.temporalFeatures!,
      wind!,
      result.samples,
    );

    expect(breakdown.templateKey).toBe('WIND');
    expect(breakdown.fields.length).toBeGreaterThan(5);
    expect(breakdown.overallScore).toBeGreaterThan(0);
    expect(breakdown.fields.some((row) => row.field === 'centroid')).toBe(true);
    expect(breakdown.fields.every((row) => row.matchPercent >= 0)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import {
  fftTrendsPolicyDurationSec,
  formatFftTrendsPolicyBadge,
} from './fft-trends-policy-ui.js';

describe('fft-trends-policy-ui (B0)', () => {
  it('formats badge with measurements, interval, mode, template count', () => {
    expect(
      formatFftTrendsPolicyBadge({
        measurementsCount: 180,
        intervalMs: 200,
        detectionMode: 'auto',
        enabledTemplateKeys: ['DRONE_TIGHT', 'WIND'],
      }),
    ).toBe('180×200ms · auto · 2 tpl');
  });

  it('default policy enables full shipped catalog (parity plugin)', () => {
    expect(formatFftTrendsPolicyBadge(undefined)).toContain('6 tpl');
  });

  it('computes analysis window duration', () => {
    expect(
      fftTrendsPolicyDurationSec({ measurementsCount: 50, intervalMs: 100 }),
    ).toBe(5);
  });
});

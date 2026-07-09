import { describe, expect, it } from 'vitest';

import { classifyProximityTrend } from './proximity-trend.js';

const GOOD_SCORES = [0.8, 0.8, 0.8];

describe('classifyProximityTrend (basn-4, core-лемма)', () => {
  it('рост громкости → approaching', () => {
    const result = classifyProximityTrend({
      loudnessSeries: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
      scoreSeries: GOOD_SCORES,
    });
    expect(result.trend).toBe('approaching');
    expect(result.ready).toBe(true);
    expect(result.deltaRatio).toBeGreaterThan(0.15);
  });

  it('падение громкости → receding', () => {
    const result = classifyProximityTrend({
      loudnessSeries: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      scoreSeries: GOOD_SCORES,
    });
    expect(result.trend).toBe('receding');
  });

  it('ровная громкость → stable', () => {
    const result = classifyProximityTrend({
      loudnessSeries: Array(12).fill(0.15),
      scoreSeries: GOOD_SCORES,
    });
    expect(result.trend).toBe('stable');
    expect(result.ready).toBe(true);
  });

  it('окно не накоплено → stable, not ready', () => {
    const result = classifyProximityTrend({
      loudnessSeries: [0.1, 0.2],
      scoreSeries: GOOD_SCORES,
    });
    expect(result.trend).toBe('stable');
    expect(result.ready).toBe(false);
  });

  it("N промахов score подряд → 'lost' (приоритет над громкостью)", () => {
    const result = classifyProximityTrend({
      loudnessSeries: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
      scoreSeries: [0.8, 0.1, 0.05, 0.2], // хвост из 3 промахов (< 0.3)
    });
    expect(result.trend).toBe('lost');
  });

  it('промахи не подряд → не lost', () => {
    const result = classifyProximityTrend({
      loudnessSeries: Array(12).fill(0.15),
      scoreSeries: [0.1, 0.8, 0.1], // разорвано высоким score
    });
    expect(result.trend).toBe('stable');
  });

  it('серия score короче lostAfterMisses → lost не судим', () => {
    const result = classifyProximityTrend({
      loudnessSeries: Array(12).fill(0.15),
      scoreSeries: [0.1, 0.1],
    });
    expect(result.trend).toBe('stable');
  });

  it('тишина (обе половины ниже minLoudness) → stable без деления на шум', () => {
    const result = classifyProximityTrend({
      loudnessSeries: Array(12).fill(1e-6),
      scoreSeries: GOOD_SCORES,
    });
    expect(result.trend).toBe('stable');
    expect(result.deltaRatio).toBe(0);
  });

  it('тотальность: NaN в сериях отфильтровываются, не ломают', () => {
    const result = classifyProximityTrend({
      loudnessSeries: [Number.NaN, ...Array(12).fill(0.15)],
      scoreSeries: [Number.NaN, 0.8],
    });
    expect(result.trend).toBe('stable');
    expect(result.ready).toBe(true);
  });

  it('кастомные пороги lost применяются', () => {
    const result = classifyProximityTrend(
      { loudnessSeries: Array(12).fill(0.15), scoreSeries: [0.4, 0.4] },
      { lostScoreThreshold: 0.5, lostAfterMisses: 2 },
    );
    expect(result.trend).toBe('lost');
  });
});

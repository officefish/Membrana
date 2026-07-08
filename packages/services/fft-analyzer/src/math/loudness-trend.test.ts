import { describe, expect, it } from 'vitest';

import {
  LoudnessTrendTracker,
  evaluateProximityAlarm,
  type LoudnessTrend,
} from './loudness-trend.js';

/** Прогнать серию значений громкости, вернуть последний тренд. */
function runTrend(values: readonly number[], options = {}): LoudnessTrend {
  const tracker = new LoudnessTrendTracker(options);
  let trend: LoudnessTrend = 'stable';
  for (const v of values) {
    trend = tracker.next(v).trend;
  }
  return trend;
}

describe('LoudnessTrendTracker', () => {
  it('до накопления полного окна тренд не судится (stable, ready:false)', () => {
    const tracker = new LoudnessTrendTracker({ windowSize: 4 });
    const r1 = tracker.next(0.1);
    const r2 = tracker.next(0.9);
    expect(r1.ready).toBe(false);
    expect(r1.trend).toBe('stable');
    expect(r2.ready).toBe(false);
  });

  it('нарастающая громкость → approaching', () => {
    const rising = [0.1, 0.1, 0.1, 0.1, 0.5, 0.6, 0.7, 0.8];
    expect(runTrend(rising, { windowSize: 8 })).toBe('approaching');
  });

  it('спадающая громкость → receding', () => {
    const falling = [0.8, 0.8, 0.8, 0.8, 0.3, 0.2, 0.15, 0.1];
    expect(runTrend(falling, { windowSize: 8 })).toBe('receding');
  });

  it('ровная громкость → stable', () => {
    const flat = [0.4, 0.41, 0.39, 0.4, 0.4, 0.41, 0.4, 0.39];
    expect(runTrend(flat, { windowSize: 8 })).toBe('stable');
  });

  it('тишина в обеих половинах → stable (без деления на шум)', () => {
    const silence = [0, 0, 0, 0, 0, 0, 0, 0];
    const tracker = new LoudnessTrendTracker({ windowSize: 8 });
    let last = tracker.next(0);
    for (const v of silence) last = tracker.next(v);
    expect(last.trend).toBe('stable');
    expect(last.ready).toBe(true);
  });

  it('deltaRatio знаковый: рост положительный, спад отрицательный', () => {
    const tracker = new LoudnessTrendTracker({ windowSize: 4 });
    // окно [0.2, 0.2 | 0.4, 0.4] → base 0.2, current 0.4 → +1.0
    [0.2, 0.2, 0.4, 0.4].forEach((v) => tracker.next(v));
    const r = tracker.next(0.4); // окно [0.2,0.4|0.4,0.4] base 0.3 current 0.4 → +0.33
    expect(r.deltaRatio).toBeGreaterThan(0);
  });

  it('порог approachRatio настраивается — мелкий рост ниже порога = stable', () => {
    const slightRise = [0.4, 0.4, 0.4, 0.4, 0.42, 0.42, 0.42, 0.42]; // +5%
    expect(runTrend(slightRise, { windowSize: 8, approachRatio: 0.15 })).toBe('stable');
  });

  it('NaN/отрицательная громкость трактуется как 0, без падения', () => {
    const tracker = new LoudnessTrendTracker({ windowSize: 4 });
    expect(() => {
      tracker.next(Number.NaN);
      tracker.next(-1);
      tracker.next(0.5);
      tracker.next(0.5);
    }).not.toThrow();
    const r = tracker.next(0.5);
    expect(r.ready).toBe(true);
    expect(Number.isFinite(r.deltaRatio)).toBe(true);
    expect(Number.isFinite(r.loudness)).toBe(true);
  });

  it('reset очищает окно', () => {
    const tracker = new LoudnessTrendTracker({ windowSize: 4 });
    [0.1, 0.2, 0.3, 0.9].forEach((v) => tracker.next(v));
    tracker.reset();
    expect(tracker.next(0.5).ready).toBe(false);
  });

  it('нечётный/некорректный windowSize нормализуется до чётного ≥ 2', () => {
    // windowSize 5 → 6; NaN → default. Просто не должно падать и в итоге судить тренд.
    const t = new LoudnessTrendTracker({ windowSize: 5 });
    for (let i = 0; i < 6; i++) t.next(0.5);
    expect(t.next(0.5).ready).toBe(true);
  });
});

describe('evaluateProximityAlarm', () => {
  it('active только когда combinedScore ≥ порога (не про громкость)', () => {
    expect(evaluateProximityAlarm({ combinedScore: 0.6, trend: 'stable' }).active).toBe(true);
    expect(evaluateProximityAlarm({ combinedScore: 0.4, trend: 'approaching' }).active).toBe(false);
  });

  it('rising: активна И приближается', () => {
    const r = evaluateProximityAlarm({ combinedScore: 0.8, trend: 'approaching' });
    expect(r.active).toBe(true);
    expect(r.rising).toBe(true);
    expect(r.easing).toBe(false);
  });

  it('easing: активна И удаляется', () => {
    const r = evaluateProximityAlarm({ combinedScore: 0.8, trend: 'receding' });
    expect(r.easing).toBe(true);
    expect(r.rising).toBe(false);
  });

  it('приближение без активной тревоги не даёт rising', () => {
    const r = evaluateProximityAlarm({ combinedScore: 0.2, trend: 'approaching' });
    expect(r.active).toBe(false);
    expect(r.rising).toBe(false);
  });

  it('порог настраивается', () => {
    expect(evaluateProximityAlarm({ combinedScore: 0.3, trend: 'stable' }, { scoreThreshold: 0.25 }).active).toBe(true);
  });

  it('NaN combinedScore → неактивна', () => {
    expect(evaluateProximityAlarm({ combinedScore: Number.NaN, trend: 'approaching' }).active).toBe(false);
  });
});

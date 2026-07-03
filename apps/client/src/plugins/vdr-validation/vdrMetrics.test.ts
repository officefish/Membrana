import { describe, expect, it } from 'vitest';

import { computeVdrGateMetrics } from './vdrMetrics';
import type { VdrCorpusRow } from './types';

function row(truth: VdrCorpusRow['truth'], predIsDrone: boolean, error: string | null = null): VdrCorpusRow {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    fileName: 'x.wav',
    truth,
    predIsDrone,
    confidence: 0.9,
    templateId: null,
    match: truth === 'unlabeled' ? null : predIsDrone === (truth === 'drone'),
    error,
  };
}

describe('computeVdrGateMetrics (vdr-hg2, пороги консилиума 85/80)', () => {
  it('идеальный прогон → F1=100%, gate hard', () => {
    const rows = [
      row('drone', true),
      row('drone', true),
      row('not-drone', false),
      row('not-drone', false),
    ];
    const m = computeVdrGateMetrics(rows);
    expect(m.compared).toBe(4);
    expect(m.f1).toBe(1);
    expect(m.accuracy).toBe(1);
    expect(m.gate).toBe('hard');
  });

  it('unlabeled и ошибки исключаются из метрик', () => {
    const rows = [
      row('drone', true),
      row('unlabeled', true),
      row('not-drone', true, 'decode failed'),
    ];
    const m = computeVdrGateMetrics(rows);
    expect(m.compared).toBe(1);
    expect(m.unlabeled).toBe(1);
    expect(m.tp).toBe(1);
    expect(m.fp).toBe(0);
  });

  it('границы gate: 80% → soft, ниже → fail', () => {
    // 4 TP, 1 FN, 1 FP → P=0.8, R=0.8, F1=0.8 → soft
    const soft = computeVdrGateMetrics([
      row('drone', true),
      row('drone', true),
      row('drone', true),
      row('drone', true),
      row('drone', false),
      row('not-drone', true),
    ]);
    expect(soft.f1).toBeCloseTo(0.8, 9);
    expect(soft.gate).toBe('soft');

    // 1 TP, 2 FN, 2 FP → F1 = 2*·(0.33·0.33)/(0.66) = 0.333 → fail
    const fail = computeVdrGateMetrics([
      row('drone', true),
      row('drone', false),
      row('drone', false),
      row('not-drone', true),
      row('not-drone', true),
    ]);
    expect(fail.gate).toBe('fail');
  });

  it('пустой ввод → нулевые метрики без gate', () => {
    const m = computeVdrGateMetrics([]);
    expect(m.compared).toBe(0);
    expect(m.gate).toBeNull();
    expect(m.f1).toBeNull();
  });

  it('все предсказания not-drone при truth not-drone → precision null, accuracy 100%', () => {
    const m = computeVdrGateMetrics([row('not-drone', false), row('not-drone', false)]);
    expect(m.precision).toBeNull();
    expect(m.accuracy).toBe(1);
    expect(m.gate).toBeNull();
  });
});

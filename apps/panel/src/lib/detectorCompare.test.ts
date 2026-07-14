import { describe, expect, it } from 'vitest';
import {
  COMPARE_SCHEMA_VERSION,
  applyFilter,
  formatDuration,
  formatPct,
  formatScore,
  parseCompareReport,
  sortByConfidence,
  verdictWord,
  type CompareSample,
  type CompareVerdict,
} from './detectorCompare';

function verdict(isDrone: boolean, confidence: number): CompareVerdict {
  return { isDrone, score: confidence, confidence, details: {}, explanation: 'фикстура' };
}

function sample(
  id: string,
  isDroneTruth: boolean,
  trends: CompareVerdict,
  yamnet: CompareVerdict,
): CompareSample {
  return {
    id,
    file: `x/${id}.wav`,
    className: 'drone-multirotor',
    isDroneTruth,
    durationSec: 5,
    meta: { sampleRate: 48000, source: 'fixture', split: 'test', notes: null },
    detectors: { trends, yamnet },
  };
}

function reportFixture(samples: CompareSample[]): unknown {
  return {
    schemaVersion: COMPARE_SCHEMA_VERSION,
    generatedAt: '2026-07-14T00:00:00.000Z',
    corpus: { name: 'free-v1-catalog v2', manifestSha: 'abc', sampleCount: samples.length },
    thresholds: { trends: 0.35, yamnet: 0.01 },
    summary: {
      trends: { tp: 1, fp: 0, fn: 0, tn: 1, precision: 1, recall: 1, f1: 1, fpr: 0 },
      yamnet: { tp: 1, fp: 0, fn: 0, tn: 1, precision: 1, recall: 1, f1: 1, fpr: 0 },
    },
    samples,
  };
}

describe('parseCompareReport', () => {
  it('принимает валидный артефакт', () => {
    const parsed = parseCompareReport(
      reportFixture([sample('a', true, verdict(true, 0.6), verdict(true, 0.08))]),
    );
    expect(parsed.samples).toHaveLength(1);
    expect(parsed.thresholds.yamnet).toBe(0.01);
  });

  it('отклоняет чужую версию схемы с человекочитаемой ошибкой', () => {
    expect(() => parseCompareReport({ schemaVersion: 99, samples: [] })).toThrow(/версия схемы/);
  });

  it('отклоняет сэмпл без вердиктов обоих детекторов', () => {
    const broken = reportFixture([sample('a', true, verdict(true, 0.6), verdict(true, 0.08))]) as {
      samples: unknown[];
    };
    broken.samples.push({ id: 'b', file: 'x/b.wav', isDroneTruth: false, detectors: { trends: verdict(false, 0.1) } });
    expect(() => parseCompareReport(broken)).toThrow(/Сэмпл #1/);
  });

  it('отклоняет не-объект и отсутствие samples', () => {
    expect(() => parseCompareReport(null)).toThrow(/не является объектом/);
    expect(() => parseCompareReport({ schemaVersion: COMPARE_SCHEMA_VERSION })).toThrow(/нет списка/);
  });
});

describe('applyFilter', () => {
  const agreeDrone = sample('agree-drone', true, verdict(true, 0.6), verdict(true, 0.08));
  const disagree = sample('disagree', true, verdict(false, 0.2), verdict(true, 0.05));
  const agreeNot = sample('agree-not', false, verdict(false, 0.1), verdict(false, 0.001));
  const all = [agreeDrone, disagree, agreeNot];

  it('все — без изменений', () => {
    expect(applyFilter(all, 'all').map((s) => s.id)).toEqual(['agree-drone', 'disagree', 'agree-not']);
  });

  it('дрон / не дрон — по разметке корпуса (ground truth)', () => {
    expect(applyFilter(all, 'drone').map((s) => s.id)).toEqual(['agree-drone', 'disagree']);
    expect(applyFilter(all, 'not-drone').map((s) => s.id)).toEqual(['agree-not']);
  });

  it('расхождения — детекторы дали разные вердикты', () => {
    expect(applyFilter(all, 'disagree').map((s) => s.id)).toEqual(['disagree']);
  });
});

describe('sortByConfidence', () => {
  const a = sample('a', true, verdict(true, 0.3), verdict(true, 0.09));
  const b = sample('b', true, verdict(true, 0.9), verdict(true, 0.01));
  const c = sample('c', true, verdict(true, 0.3), verdict(true, 0.05));

  it('уверенные сверху по выбранному детектору, tiebreak по id', () => {
    expect(sortByConfidence([a, b, c], 'trends', 'desc').map((s) => s.id)).toEqual(['b', 'a', 'c']);
    expect(sortByConfidence([a, b, c], 'yamnet', 'desc').map((s) => s.id)).toEqual(['a', 'c', 'b']);
  });

  it('уверенные снизу (asc) и неизменность исходного массива', () => {
    const input = [a, b, c];
    expect(sortByConfidence(input, 'trends', 'asc').map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(input.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('форматтеры', () => {
  it('formatPct/formatScore/verdictWord/formatDuration', () => {
    expect(formatPct(0.675)).toBe('67.5%');
    expect(formatPct(null)).toBe('—');
    expect(formatScore(0.0834)).toBe('0.083');
    expect(verdictWord(true)).toBe('дрон');
    expect(verdictWord(false)).toBe('не дрон');
    expect(formatDuration(5)).toBe('5 с');
    expect(formatDuration(null)).toBe('—');
  });
});

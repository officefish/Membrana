import { describe, expect, it } from 'vitest';

import {
  ageLabel,
  anchorLabel,
  compareProdMain,
  VERDICT_LABELS,
  type DriftAnchorRecord,
} from './quality';

function rec(over: Partial<DriftAnchorRecord> = {}): DriftAnchorRecord {
  return {
    anchorKind: 'code',
    anchorSource: 'ci',
    detectorVersion: 'sha-aaaa',
    imageFrozenAt: null,
    delta: 0,
    verdict: 'ok',
    takenAt: '2026-07-14T06:00:00.000Z',
    metrics: {},
    ...over,
  };
}

describe('anchorLabel / VERDICT_LABELS', () => {
  it('якорь и вердикт — словом, не только кодом', () => {
    expect(anchorLabel(rec())).toBe('Код (CI, main)');
    expect(anchorLabel(rec({ anchorKind: 'data', anchorSource: 'schedule' }))).toBe(
      'Данные (office, prod)',
    );
    expect(VERDICT_LABELS.broken).toBe('сломан');
  });
});

describe('ageLabel', () => {
  const now = new Date('2026-07-14T12:00:00.000Z');
  it('градации: только что / минуты / часы / дни; мусор — как есть', () => {
    expect(ageLabel('2026-07-14T11:59:40.000Z', now)).toBe('только что');
    expect(ageLabel('2026-07-14T11:15:00.000Z', now)).toBe('45 мин назад');
    expect(ageLabel('2026-07-14T06:00:00.000Z', now)).toBe('6 ч назад');
    expect(ageLabel('2026-07-10T12:00:00.000Z', now)).toBe('4 дн назад');
    expect(ageLabel('вчера', now)).toBe('вчера');
  });
});

describe('compareProdMain', () => {
  it('совпадение / расхождение / недостаточно данных', () => {
    const ci = rec({ anchorSource: 'ci', detectorVersion: 'sha-aaaa' });
    const sched = rec({ anchorSource: 'schedule', detectorVersion: 'sha-aaaa' });
    expect(compareProdMain([ci, sched])).toEqual({ state: 'match', detectorVersion: 'sha-aaaa' });

    const drifted = rec({ anchorSource: 'schedule', detectorVersion: 'sha-bbbb' });
    expect(compareProdMain([ci, drifted])).toEqual({
      state: 'diverged',
      ci: 'sha-aaaa',
      schedule: 'sha-bbbb',
    });

    expect(compareProdMain([ci])).toEqual({ state: 'insufficient' });
    const dataOnly = rec({ anchorKind: 'data', anchorSource: 'schedule' });
    expect(compareProdMain([ci, dataOnly])).toEqual({ state: 'insufficient' });
  });
});


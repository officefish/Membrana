import { describe, expect, it } from 'vitest';

import { driftAnchorRecordKey, driftAnchorRecordSchema } from './drift-anchor-record.dto';

const VALID = {
  anchorKind: 'code',
  anchorSource: 'ci',
  detectorVersion: 'abc1234',
  imageFrozenAt: null,
  delta: 0,
  verdict: 'ok',
  takenAt: '2026-07-13T04:00:00.000Z',
  metrics: { yamnet: 0.8029 },
};

describe('driftAnchorRecordSchema', () => {
  it('принимает валидную запись', () => {
    expect(driftAnchorRecordSchema.safeParse(VALID).success).toBe(true);
  });

  it('отвергает неизвестный anchorKind/anchorSource/verdict (не пропускает мусор)', () => {
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, anchorKind: 'weather' }).success).toBe(false);
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, anchorSource: 'manual' }).success).toBe(false);
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, verdict: 'unknown' }).success).toBe(false);
  });

  it('отвергает NaN/Infinity в delta (fail-closed, как якорь ADR 0003)', () => {
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, delta: NaN }).success).toBe(false);
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, delta: Infinity }).success).toBe(false);
  });

  it('отвергает пустой detectorVersion/takenAt', () => {
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, detectorVersion: '' }).success).toBe(false);
    expect(driftAnchorRecordSchema.safeParse({ ...VALID, takenAt: '' }).success).toBe(false);
  });

  it('отвергает нечисловые metrics', () => {
    expect(
      driftAnchorRecordSchema.safeParse({ ...VALID, metrics: { yamnet: 'high' } }).success,
    ).toBe(false);
  });

  it('пропускает лишние поля мимо (не расширяет схему тихо)', () => {
    const parsed = driftAnchorRecordSchema.safeParse({ ...VALID, extra: 'ignored' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect('extra' in parsed.data).toBe(false);
  });
});

describe('driftAnchorRecordKey', () => {
  it('составляет стабильный ключ из anchorKind:anchorSource', () => {
    expect(driftAnchorRecordKey({ anchorKind: 'code', anchorSource: 'ci' })).toBe('code:ci');
    expect(driftAnchorRecordKey({ anchorKind: 'data', anchorSource: 'schedule' })).toBe('data:schedule');
  });
});

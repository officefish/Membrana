import { describe, expect, it } from 'vitest';

import {
  evaluateFrameVerdict,
  evaluateThresholdTest,
  minPassRateForStrictness,
  type FrameVerdict,
  type ThresholdTestThresholds,
} from './threshold-test.js';

const thresholds: ThresholdTestThresholds = {
  centroid: { min: 200, max: 800 },
  flux: { min: 0, max: 1.5 },
  rms: { min: 0.01, max: 1.0 },
};

function frame(
  partial: Partial<FrameVerdict> & Pick<FrameVerdict, 'index' | 'framePassed'>,
): FrameVerdict {
  return {
    timestamp: partial.timestamp ?? 0,
    centroid: partial.centroid ?? 400,
    flux: partial.flux ?? 0.5,
    rms: partial.rms ?? 0.1,
    centroidInRange: partial.centroidInRange ?? true,
    fluxInRange: partial.fluxInRange ?? true,
    rmsInRange: partial.rmsInRange ?? true,
    metricsInRangeCount: partial.metricsInRangeCount ?? 3,
    ...partial,
  };
}

describe('evaluateFrameVerdict', () => {
  it('easy: one metric in range passes the frame', () => {
    const v = evaluateFrameVerdict(
      { centroid: 50, flux: 99, rms: 99 },
      thresholds,
      'easy',
    );
    expect(v.metricsInRangeCount).toBe(0);
    expect(v.framePassed).toBe(false);

    const v2 = evaluateFrameVerdict(
      { centroid: 400, flux: 99, rms: 99 },
      thresholds,
      'easy',
    );
    expect(v2.metricsInRangeCount).toBe(1);
    expect(v2.framePassed).toBe(true);
  });

  it('normal: requires two metrics in range', () => {
    const fail = evaluateFrameVerdict(
      { centroid: 400, flux: 99, rms: 99 },
      thresholds,
      'normal',
    );
    expect(fail.framePassed).toBe(false);

    const pass = evaluateFrameVerdict(
      { centroid: 400, flux: 0.5, rms: 99 },
      thresholds,
      'normal',
    );
    expect(pass.metricsInRangeCount).toBe(2);
    expect(pass.framePassed).toBe(true);
  });

  it('strict: all three metrics must be in range', () => {
    const fail = evaluateFrameVerdict(
      { centroid: 400, flux: 0.5, rms: 99 },
      thresholds,
      'strict',
    );
    expect(fail.framePassed).toBe(false);

    const pass = evaluateFrameVerdict(
      { centroid: 400, flux: 0.5, rms: 0.1 },
      thresholds,
      'strict',
    );
    expect(pass.framePassed).toBe(true);
  });
});

describe('evaluateThresholdTest', () => {
  it('easy at 30% boundary with N=3 (1 of 3 frames)', () => {
    const frames: FrameVerdict[] = [
      frame({ index: 0, framePassed: true, metricsInRangeCount: 1 }),
      frame({ index: 1, framePassed: false, metricsInRangeCount: 0 }),
      frame({ index: 2, framePassed: false, metricsInRangeCount: 0 }),
    ];
    const result = evaluateThresholdTest({
      frames,
      strictness: 'easy',
      frameCount: 3,
      thresholds,
      intervalMs: 500,
      mode: 'manual',
      testId: 't1',
      startedAt: 0,
      finishedAt: 1500,
    });
    expect(result.passedCount).toBe(1);
    expect(result.passRate).toBeCloseTo(1 / 3);
    expect(minPassRateForStrictness('easy')).toBe(0.3);
    expect(result.isDetected).toBe(true);
  });

  it('normal requires 60% — 2 of 3 at boundary', () => {
    const frames: FrameVerdict[] = [
      frame({ index: 0, framePassed: true }),
      frame({ index: 1, framePassed: true }),
      frame({ index: 2, framePassed: false }),
    ];
    const result = evaluateThresholdTest({
      frames,
      strictness: 'normal',
      frameCount: 3,
      thresholds,
      intervalMs: 500,
      mode: 'auto',
      testId: 't2',
      startedAt: 0,
      finishedAt: 1500,
    });
    expect(result.passRate).toBeCloseTo(2 / 3);
    expect(result.isDetected).toBe(true);
  });

  it('strict at 90% with N=10 needs 9 passed frames', () => {
    const frames: FrameVerdict[] = Array.from({ length: 10 }, (_, i) =>
      frame({ index: i, framePassed: i < 9 }),
    );
    const pass = evaluateThresholdTest({
      frames,
      strictness: 'strict',
      frameCount: 10,
      thresholds,
      intervalMs: 200,
      mode: 'manual',
      testId: 't3',
      startedAt: 0,
      finishedAt: 2000,
    });
    expect(pass.passedCount).toBe(9);
    expect(pass.isDetected).toBe(true);

    const failFrames = frames.map((f, i) =>
      i < 8 ? f : frame({ index: i, framePassed: false }),
    );
    const fail = evaluateThresholdTest({
      frames: failFrames,
      strictness: 'strict',
      frameCount: 10,
      thresholds,
      intervalMs: 200,
      mode: 'manual',
      testId: 't4',
      startedAt: 0,
      finishedAt: 2000,
    });
    expect(fail.passedCount).toBe(8);
    expect(fail.isDetected).toBe(false);
  });

  it('throws when frame count mismatches', () => {
    expect(() =>
      evaluateThresholdTest({
        frames: [frame({ index: 0, framePassed: true })],
        strictness: 'easy',
        frameCount: 3,
        thresholds,
        intervalMs: 500,
        mode: 'manual',
        testId: 'x',
        startedAt: 0,
        finishedAt: 1,
      }),
    ).toThrow(/expected 3 frames/);
  });
});

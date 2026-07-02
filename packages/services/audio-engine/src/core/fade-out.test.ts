import { describe, expect, it } from 'vitest';

import { FADE_OUT_FLOOR_GAIN, scheduleFadeOut, type FadeTargetParam } from './fade-out.js';

interface Call {
  readonly method: string;
  readonly args: readonly number[];
}

function fakeParam(value: number): { param: FadeTargetParam; calls: Call[] } {
  const calls: Call[] = [];
  const param: FadeTargetParam = {
    value,
    cancelScheduledValues: (t) => calls.push({ method: 'cancel', args: [t] }),
    setValueAtTime: (v, t) => calls.push({ method: 'set', args: [v, t] }),
    exponentialRampToValueAtTime: (v, t) => calls.push({ method: 'ramp', args: [v, t] }),
  };
  return { param, calls };
}

describe('scheduleFadeOut (CT6, канон §3.1)', () => {
  it('планирует экспоненциальный ramp от текущего значения до пола за fadeOutMs', () => {
    const { param, calls } = fakeParam(1);

    const settle = scheduleFadeOut(param, 10, 200);

    expect(settle).toBe(200);
    expect(calls).toEqual([
      { method: 'cancel', args: [10] },
      { method: 'set', args: [1, 10] },
      { method: 'ramp', args: [FADE_OUT_FLOOR_GAIN, 10.2] },
    ]);
  });

  it('fadeOutMs=0 — hard-cut: ничего не планирует (emergency stop)', () => {
    const { param, calls } = fakeParam(1);

    expect(scheduleFadeOut(param, 10, 0)).toBe(0);
    expect(scheduleFadeOut(param, 10, -5)).toBe(0);
    expect(scheduleFadeOut(param, 10, Number.NaN)).toBe(0);
    expect(calls).toEqual([]);
  });

  it('нулевая громкость поднимается до пола перед ramp (exponential не работает с 0)', () => {
    const { param, calls } = fakeParam(0);

    scheduleFadeOut(param, 5, 100);

    expect(calls[1]).toEqual({ method: 'set', args: [FADE_OUT_FLOOR_GAIN, 5] });
  });
});

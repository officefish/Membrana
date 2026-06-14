import { describe, expect, it } from 'vitest';

import { spectralFluxL2, SpectralFluxTracker } from './metrics.js';

describe('SpectralFluxTracker', () => {
  it('первый кадр — 0, второй с приростом — > 0', () => {
    const flux = new SpectralFluxTracker();
    const a = new Float32Array([1, 0, 0, 0]);
    const b = new Float32Array([1, 0.5, 0, 0]);
    expect(flux.next(a)).toBe(0);
    const v = flux.next(b);
    expect(v).toBeGreaterThan(0.1);
  });

  it('стабильный спектр даёт нулевой flux', () => {
    const flux = new SpectralFluxTracker();
    const s = new Float32Array(128).fill(0.1);
    flux.next(s);
    const v = flux.next(new Float32Array(s));
    expect(v).toBe(0);
  });

  it('L2 на byte-масштабе даёт порядок величины как в three-param-analyzer', () => {
    const a = new Float32Array(256).fill(0.05);
    const b = new Float32Array(256).fill(0.05);
    b[40] = 0.25;
    const v = spectralFluxL2(b, a);
    expect(v).toBeGreaterThan(0.15);
    expect(v).toBeLessThan(2);
  });
});

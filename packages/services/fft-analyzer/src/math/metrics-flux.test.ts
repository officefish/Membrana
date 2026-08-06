import { describe, expect, it } from 'vitest';

import {
  SPECTRAL_FLUX_BYTE_SCALE,
  SPECTRAL_FLUX_L2_DIVISOR,
  spectralFluxL2,
  SpectralFluxTracker,
} from './metrics.js';

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

  /**
   * Дыра #1704 (P1 post-merge аудита PR #1648): у flux не было зуба «известная Δ спектра →
   * ОЖИДАЕМОЕ значение» — только границы порядка величины. Границы регрессию масштаба
   * пропускают: у кейса выше точное значение 0.31875, а при делителе 12 вышло бы 0.265625 —
   * и это ВНУТРИ 0.15…2, то есть зуб смолчал бы о сдвинутом основании.
   *
   * Числа выведены из формулы, а не подобраны прогоном (`spectralFluxL2`):
   *   diff = (current − previous) × SPECTRAL_FLUX_BYTE_SCALE, затем √(Σdiff² / N) / SPECTRAL_FLUX_L2_DIVISOR
   *
   *   256 бинов, один 0.05 → 0.25: diff 51 · Σ 2601 · /256 = 10.16015625 · √ = 3.1875 · /10 = 0.31875
   *   4 бина,    один 0    → 0.1 : diff 25.5 · Σ 650.25 · /4 = 162.5625 · √ = 12.75  · /10 = 1.275
   */
  it('известная Δ спектра даёт ОЖИДАЕМОЕ значение, а не «величину нужного порядка»', () => {
    // Контракт делителя проверяется рядом: смена основания роняет зуб дважды и однозначно.
    expect(SPECTRAL_FLUX_L2_DIVISOR).toBe(10);
    expect(SPECTRAL_FLUX_BYTE_SCALE).toBe(255);

    const wide = new Float32Array(256).fill(0.05);
    const widePeak = new Float32Array(256).fill(0.05);
    widePeak[40] = 0.25;
    expect(spectralFluxL2(widePeak, wide)).toBeCloseTo(0.31875, 6);

    const quiet = new Float32Array(4);
    const oneBin = new Float32Array([0.1, 0, 0, 0]);
    expect(spectralFluxL2(oneBin, quiet)).toBeCloseTo(1.275, 6);
  });
});

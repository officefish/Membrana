/**
 * Нормализация только для live-визуализации fft-indices-viz.
 * Как three-param-analyzer: ÷5000, ÷1, ÷0.02 + огибающая min/max для «живой» шкалы 0…1.
 */
import { clamp01 } from '../../lib/fftMetricNormalize';

/** Делители из packages/temp/three-param-analyzer (не пороговый тест ÷0.35). */
export const FFT_INDICES_VIZ_NORM = {
  centroidHz: 5_000,
  flux: 1,
  rms: 0.02,
} as const;

/** Зона дрона в шкале демо (для опциональной подсветки полосы). */
export const FFT_INDICES_VIZ_DRONE_NORM = {
  centroid: {
    min: 200 / FFT_INDICES_VIZ_NORM.centroidHz,
    max: 800 / FFT_INDICES_VIZ_NORM.centroidHz,
  },
  flux: {
    min: 0.2 / FFT_INDICES_VIZ_NORM.flux,
    max: 1.5 / FFT_INDICES_VIZ_NORM.flux,
  },
  rms: {
    min: 0.03 / FFT_INDICES_VIZ_NORM.rms,
    max: 0.35 / FFT_INDICES_VIZ_NORM.rms,
  },
} as const;

const MIN_SPAN = {
  centroidHz: 350,
  flux: 0.06,
  rms: 0.004,
} as const;

const ATTACK = 0.4;
const RELEASE = 0.015;

/** Следит за динамическим диапазоном сигнала и выдаёт 0…1 для UI. */
export class ActivityEnvelope {
  private peak = 0;
  private valley = 0;
  private primed = false;

  constructor(private readonly minSpan: number) {}

  reset(): void {
    this.primed = false;
    this.peak = 0;
    this.valley = 0;
  }

  normalize(value: number): number {
    const v = Number.isFinite(value) ? value : 0;
    if (!this.primed) {
      this.peak = v;
      this.valley = v;
      this.primed = true;
      return 0.5;
    }

    if (v > this.peak) {
      this.peak += (v - this.peak) * ATTACK;
    } else {
      this.peak += (v - this.peak) * RELEASE;
    }

    if (v < this.valley) {
      this.valley += (v - this.valley) * ATTACK;
    } else {
      this.valley += (v - this.valley) * RELEASE;
    }

    if (this.peak - this.valley < this.minSpan) {
      const mid = (this.peak + this.valley) / 2;
      this.peak = mid + this.minSpan / 2;
      this.valley = mid - this.minSpan / 2;
    }

    return clamp01((v - this.valley) / (this.peak - this.valley));
  }
}

export function createFftIndicesActivityEnvelopes(): {
  readonly centroid: ActivityEnvelope;
  readonly flux: ActivityEnvelope;
  readonly rms: ActivityEnvelope;
} {
  return {
    centroid: new ActivityEnvelope(MIN_SPAN.centroidHz),
    flux: new ActivityEnvelope(MIN_SPAN.flux),
    rms: new ActivityEnvelope(MIN_SPAN.rms),
  };
}

/** Предобработка сырого кадра перед сглаживанием (как в демо). */
export function preprocessFftIndicesSample(
  centroidHz: number,
  flux: number,
  rms: number,
): { centroidHz: number; flux: number; rms: number } {
  return {
    centroidHz: Number.isFinite(centroidHz) ? centroidHz : 0,
    flux: Math.min(FFT_INDICES_VIZ_NORM.flux, Math.max(0, flux)),
    rms: Math.max(0, rms),
  };
}

export function formatActivityPercent(norm: number): string {
  return `${(clamp01(norm) * 100).toFixed(0)}%`;
}

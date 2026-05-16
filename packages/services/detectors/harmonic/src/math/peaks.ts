import { binToHz } from './frequencies.js';

export interface SpectralPeak {
  readonly bin: number;
  readonly hz: number;
  readonly magnitude: number;
}

export interface FindPeaksOptions {
  readonly minHz?: number;
  readonly maxHz?: number;
  /** Доля от глобального максимума (0..1). */
  readonly relativeThreshold?: number;
}

/**
 * Локальные максимумы спектра выше порога шума.
 * Pure TS — без DOM / Web Audio.
 */
export function findSpectralPeaks(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number,
  options: FindPeaksOptions = {},
): SpectralPeak[] {
  const minHz = options.minHz ?? 0;
  const maxHz = options.maxHz ?? sampleRate / 2;
  const relativeThreshold = options.relativeThreshold ?? 0.12;

  let globalMax = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    globalMax = Math.max(globalMax, magnitudes[i]!);
  }
  if (globalMax <= 0) {
    return [];
  }

  const floor = globalMax * relativeThreshold;
  const peaks: SpectralPeak[] = [];

  for (let i = 1; i < magnitudes.length - 1; i++) {
    const mag = magnitudes[i]!;
    if (mag < floor) {
      continue;
    }
    if (mag <= magnitudes[i - 1]! || mag <= magnitudes[i + 1]!) {
      continue;
    }
    const hz = binToHz(i, sampleRate, fftSize);
    if (hz < minHz || hz > maxHz) {
      continue;
    }
    peaks.push({ bin: i, hz, magnitude: mag });
  }

  peaks.sort((a, b) => b.magnitude - a.magnitude);
  return peaks;
}

import type { HarmonicDetectorConfig } from '../types.js';
import { hzToBin } from './frequencies.js';

const MIN_HARMONICS_FOR_SCORE = 3;
const MAX_HARMONICS_TO_SCORE = 8;
const HARMONIC_MAG_RATIO = 0.18;
const FUNDAMENTAL_MIN_RATIO = 0.12;

function magnitudeNearHz(
  magnitudes: Float32Array,
  hz: number,
  sampleRate: number,
  fftSize: number,
  toleranceBins = 2,
): { readonly magnitude: number; readonly bin: number } {
  const center = hzToBin(hz, sampleRate, fftSize);
  let peak = 0;
  let peakBin = center;
  for (let b = center - toleranceBins; b <= center + toleranceBins; b++) {
    if (b >= 0 && b < magnitudes.length) {
      const mag = magnitudes[b]!;
      if (mag > peak) {
        peak = mag;
        peakBin = b;
      }
    }
  }
  return { magnitude: peak, bin: peakBin };
}

function isLocalPeak(magnitudes: Float32Array, bin: number, radius = 2): boolean {
  if (bin <= 0 || bin >= magnitudes.length - 1) {
    return false;
  }
  const mag = magnitudes[bin]!;
  for (let b = bin - radius; b <= bin + radius; b++) {
    if (b >= 0 && b < magnitudes.length && magnitudes[b]! > mag) {
      return false;
    }
  }
  return magnitudes[bin]! >= magnitudes[bin - 1]! && magnitudes[bin]! >= magnitudes[bin + 1]!;
}

export interface HarmonicStackScore {
  readonly score: number;
  readonly harmonicCount: number;
  readonly fundamentalHz: number;
}

/**
 * Оценка гармонического стека для кандидата-несущей f0.
 */
export function scoreHarmonicStack(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number,
  fundamentalHz: number,
  config: HarmonicDetectorConfig,
): HarmonicStackScore {
  let globalMax = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    globalMax = Math.max(globalMax, magnitudes[i]!);
  }
  if (globalMax <= 0) {
    return { score: 0, harmonicCount: 0, fundamentalHz };
  }

  const fundamental = magnitudeNearHz(magnitudes, fundamentalHz, sampleRate, fftSize);
  const fundamentalMag = fundamental.magnitude;
  if (
    fundamentalMag / globalMax < FUNDAMENTAL_MIN_RATIO ||
    !isLocalPeak(magnitudes, fundamental.bin)
  ) {
    return { score: 0, harmonicCount: 0, fundamentalHz };
  }

  const targets: number[] = [];
  for (let k = 1; k <= MAX_HARMONICS_TO_SCORE && k * fundamentalHz <= config.harmonicMaxHz; k++) {
    targets.push(k * fundamentalHz);
  }

  let harmonicCount = 0;
  let weighted = 0;
  let weightSum = 0;

  for (let k = 0; k < targets.length; k++) {
    const hz = targets[k]!;
    const { magnitude: mag, bin } = magnitudeNearHz(magnitudes, hz, sampleRate, fftSize);
    const ratio = mag / globalMax;
    const weight = 1 / (k + 1);
    weightSum += weight;
    if (ratio >= HARMONIC_MAG_RATIO && isLocalPeak(magnitudes, bin)) {
      harmonicCount++;
      weighted += ratio * weight;
    }
  }

  if (harmonicCount < MIN_HARMONICS_FOR_SCORE) {
    const partial = weightSum > 0 ? weighted / weightSum : 0;
    return {
      score: partial * (harmonicCount / MIN_HARMONICS_FOR_SCORE),
      harmonicCount,
      fundamentalHz,
    };
  }

  const score = weightSum > 0 ? Math.min(1, weighted / weightSum) : 0;
  return { score, harmonicCount, fundamentalHz };
}

/** Объединить близкие несущие (Гц). */
export function mergeFundamentals(frequencies: readonly number[], toleranceHz = 15): number[] {
  if (frequencies.length === 0) {
    return [];
  }
  const sorted = [...frequencies].sort((a, b) => a - b);
  const merged: number[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i++) {
    const hz = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (hz - last <= toleranceHz) {
      merged[merged.length - 1] = (last + hz) / 2;
    } else {
      merged.push(hz);
    }
  }
  return merged;
}

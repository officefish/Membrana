import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_FFT_SIZE,
  DEFAULT_SAMPLE_RATE,
  FUNDAMENTAL_MAX_HZ,
  FUNDAMENTAL_MIN_HZ,
  HARMONIC_MAX_HZ,
} from '../constants.js';
import type { HarmonicDetectorConfig, HarmonicSpectrumResult } from '../types.js';
import { mergeFundamentals, MIN_HARMONICS_FOR_SCORE, scoreHarmonicStack } from './harmonics.js';
import { findSpectralPeaks } from './peaks.js';

export const DEFAULT_HARMONIC_DETECTOR_CONFIG: HarmonicDetectorConfig = {
  fftSize: DEFAULT_FFT_SIZE,
  sampleRate: DEFAULT_SAMPLE_RATE,
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  fundamentalMinHz: FUNDAMENTAL_MIN_HZ,
  fundamentalMaxHz: FUNDAMENTAL_MAX_HZ,
  harmonicMaxHz: HARMONIC_MAX_HZ,
};

/**
 * Классификация по линейным magnitudes БПФ (ADR v0.1).
 */
export function classifySpectrum(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number,
  config: HarmonicDetectorConfig = DEFAULT_HARMONIC_DETECTOR_CONFIG,
): HarmonicSpectrumResult {
  const expectedBins = fftSize / 2;
  if (magnitudes.length < expectedBins) {
    return {
      isDrone: false,
      confidence: 0,
      reasoning: 'Недостаточная длина спектра для классификации.',
    };
  }

  const peaks = findSpectralPeaks(magnitudes, sampleRate, fftSize, {
    minHz: config.fundamentalMinHz,
    maxHz: config.fundamentalMaxHz,
    relativeThreshold: 0.1,
  });

  const candidates = peaks.map((p) => p.hz);
  if (candidates.length === 0) {
    return {
      isDrone: false,
      confidence: 0,
      reasoning: 'Нет пиков в полосе несущей 80–250 Гц.',
    };
  }

  let bestScore = 0;
  let bestFundamental = 0;
  let bestHarmonicCount = 0;

  for (const f0 of candidates) {
    const { score, harmonicCount, fundamentalHz } = scoreHarmonicStack(
      magnitudes,
      sampleRate,
      fftSize,
      f0,
      config,
    );
    if (score > bestScore) {
      bestScore = score;
      bestFundamental = fundamentalHz;
      bestHarmonicCount = harmonicCount;
    }
  }

  const fundamentals = mergeFundamentals(
    bestScore > 0 ? [bestFundamental] : [],
  );
  const meetsThreshold = bestScore >= config.confidenceThreshold;
  const meetsHarmonicCount = bestHarmonicCount >= MIN_HARMONICS_FOR_SCORE;
  const isDrone = meetsThreshold && meetsHarmonicCount;

  const reasoning = isDrone
    ? `Гармонический стек: ~${Math.round(bestFundamental)} Гц, ${bestHarmonicCount} гармоник, confidence ${(bestScore * 100).toFixed(0)}%.`
    : meetsThreshold && !meetsHarmonicCount
      ? `Порог confidence достигнут, но гармоник ${bestHarmonicCount} < ${MIN_HARMONICS_FOR_SCORE} — не дрон.`
      : bestScore > 0.2
        ? `Слабый гармонический след (~${Math.round(bestFundamental)} Гц), confidence ${(bestScore * 100).toFixed(0)}% — ниже порога.`
        : 'Нет устойчивого гармонического стека в полосе 80–250 Гц.';

  return {
    isDrone,
    confidence: bestScore,
    reasoning,
    fundamentals: fundamentals.length > 0 ? fundamentals : undefined,
  };
}

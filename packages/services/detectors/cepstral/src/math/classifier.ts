import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_FFT_SIZE,
  DEFAULT_SAMPLE_RATE,
  FUNDAMENTAL_MAX_HZ,
  FUNDAMENTAL_MIN_HZ,
} from '../constants.js';
import type { CepstralDetectorConfig, CepstralSpectrumResult } from '../types.js';
import { magnitudesToRealCepstrum } from './cepstrum.js';

export const DEFAULT_CEPSTRAL_DETECTOR_CONFIG: CepstralDetectorConfig = {
  fftSize: DEFAULT_FFT_SIZE,
  sampleRate: DEFAULT_SAMPLE_RATE,
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  fundamentalMinHz: FUNDAMENTAL_MIN_HZ,
  fundamentalMaxHz: FUNDAMENTAL_MAX_HZ,
};

export function classifyCepstrum(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number,
  config: CepstralDetectorConfig = DEFAULT_CEPSTRAL_DETECTOR_CONFIG,
): CepstralSpectrumResult {
  const cepstrum = magnitudesToRealCepstrum(magnitudes, fftSize);
  const minQ = Math.max(1, Math.floor(sampleRate / config.fundamentalMaxHz));
  const maxQ = Math.min(
    cepstrum.length - 1,
    Math.ceil(sampleRate / config.fundamentalMinHz),
  );

  let peakVal = 0;
  let peakQ = 0;
  let sumInRange = 0;
  let countInRange = 0;
  for (let q = minQ; q <= maxQ; q++) {
    const v = cepstrum[q]!;
    sumInRange += v;
    countInRange += 1;
    if (v > peakVal) {
      peakVal = v;
      peakQ = q;
    }
  }

  const meanInRange = countInRange > 0 ? sumInRange / countInRange : 1;
  const peakRatio = peakVal / (meanInRange + 1e-8);
  const confidence = Math.min(1, (peakRatio - 1) * 0.18);
  const fundamentalHz = peakQ > 0 ? sampleRate / peakQ : undefined;

  let spectralProminence = 0;
  if (fundamentalHz) {
    const fundBin = Math.min(
      magnitudes.length - 1,
      Math.max(0, Math.round((fundamentalHz / sampleRate) * fftSize)),
    );
    let meanMag = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      meanMag += magnitudes[i]!;
    }
    meanMag /= magnitudes.length || 1;
    spectralProminence = magnitudes[fundBin]! / (meanMag + 1e-8);
  }

  const isDrone =
    confidence >= config.confidenceThreshold &&
    peakQ > 0 &&
    peakRatio >= 1.6 &&
    spectralProminence >= 2.4 &&
    fundamentalHz !== undefined &&
    fundamentalHz >= config.fundamentalMinHz &&
    fundamentalHz <= config.fundamentalMaxHz;

  return {
    isDrone,
    confidence,
    reasoning: isDrone
      ? `Кепстральный пик на ${fundamentalHz?.toFixed(0) ?? '?'} Гц (quefrency ${peakQ}).`
      : 'Нет выраженной кепстральной периодики в полосе 80–250 Гц.',
    fundamentalHz,
    peakRatio,
  };
}

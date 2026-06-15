import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_FFT_SIZE,
  DEFAULT_SAMPLE_RATE,
  LOW_BAND_TARGET_PERCENT,
} from '../constants.js';
import type { SpectralFluxDetectorConfig, SpectralFluxSpectrumResult } from '../types.js';

export const DEFAULT_SPECTRAL_FLUX_DETECTOR_CONFIG: SpectralFluxDetectorConfig = {
  fftSize: DEFAULT_FFT_SIZE,
  sampleRate: DEFAULT_SAMPLE_RATE,
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  lowBandTargetPercent: LOW_BAND_TARGET_PERCENT,
};

export function classifySpectralFluxFrame(
  flux: number,
  lowEnergyPercent: number,
  isFirstFrame: boolean,
  config: SpectralFluxDetectorConfig = DEFAULT_SPECTRAL_FLUX_DETECTOR_CONFIG,
): SpectralFluxSpectrumResult {
  const stability = flux > 0 ? Math.max(0, 1 - flux / 2) : 1;
  const lowScore = Math.min(1, lowEnergyPercent / config.lowBandTargetPercent);

  const confidence = isFirstFrame
    ? Math.min(0.35, lowScore * 0.5)
    : Math.min(1, stability * 0.35 + lowScore * 0.65);

  const meetsLowBand = lowEnergyPercent >= config.lowBandTargetPercent;
  const isDrone =
    !isFirstFrame && meetsLowBand && confidence >= config.confidenceThreshold;

  return {
    isDrone,
    confidence,
    reasoning: isFirstFrame
      ? 'Первый кадр — ждём следующий для оценки спектрального flux.'
      : isDrone
        ? `Стабильный низкочастотный спектр (flux=${flux.toFixed(3)}, low=${lowEnergyPercent.toFixed(0)}%).`
        : `Высокая динамика спектра или слабая НЧ-энергия (flux=${flux.toFixed(3)}).`,
  };
}

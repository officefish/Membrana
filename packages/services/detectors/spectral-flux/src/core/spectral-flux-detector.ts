import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';
import {
  FftCore,
  lowEnergyPercent,
  SpectralFluxTracker,
} from '@membrana/fft-analyzer-service';

import { DEFAULT_FFT_SIZE } from '../constants.js';
import { prepareFftSamples } from '../core/sample-window.js';
import {
  classifySpectralFluxFrame,
  DEFAULT_SPECTRAL_FLUX_DETECTOR_CONFIG,
} from '../math/classifier.js';
import type { SpectralFluxDetectorConfig } from '../types.js';

export class SpectralFluxDetector implements DroneDetector {
  readonly name = 'spectral-flux';
  readonly family = 'dsp' as const;

  private readonly config: SpectralFluxDetectorConfig;
  private readonly fft: FftCore;
  private readonly fluxTracker = new SpectralFluxTracker();

  constructor(config: Partial<SpectralFluxDetectorConfig> = {}) {
    this.config = { ...DEFAULT_SPECTRAL_FLUX_DETECTOR_CONFIG, ...config };
    this.fft = new FftCore(this.config.fftSize);
  }

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const fftSize = this.config.fftSize;

    if (window.timestamp === 0) {
      this.fluxTracker.reset();
    }

    const prepared = prepareFftSamples(window.samples, fftSize);
    const magnitudes = this.fft.computeMagnitudes(prepared);
    const flux = this.fluxTracker.next(magnitudes);
    const lowPct = lowEnergyPercent(magnitudes);
    const spectrum = classifySpectralFluxFrame(
      flux,
      lowPct,
      window.timestamp === 0,
      this.config,
    );

    return Promise.resolve({
      isDrone: spectrum.isDrone,
      confidence: spectrum.confidence,
      reasoning: spectrum.reasoning,
      features: {
        spectralFlux: flux,
        lowEnergyPercent: lowPct,
      },
      latencyMs: performance.now() - t0,
    });
  }
}

export function createSpectralFluxDetector(
  config?: Partial<SpectralFluxDetectorConfig>,
): DroneDetector {
  return new SpectralFluxDetector(config);
}

export { DEFAULT_FFT_SIZE };

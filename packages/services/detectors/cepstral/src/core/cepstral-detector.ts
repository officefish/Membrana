import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';
import { FftCore } from '@membrana/fft-analyzer-service';

import { DEFAULT_FFT_SIZE } from '../constants.js';
import { prepareFftSamples } from '../core/sample-window.js';
import {
  classifyCepstrum,
  DEFAULT_CEPSTRAL_DETECTOR_CONFIG,
} from '../math/classifier.js';
import type { CepstralDetectorConfig } from '../types.js';

export class CepstralDetector implements DroneDetector {
  readonly name = 'cepstral';
  readonly family = 'dsp' as const;

  private readonly config: CepstralDetectorConfig;
  private readonly fft: FftCore;

  constructor(config: Partial<CepstralDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CEPSTRAL_DETECTOR_CONFIG, ...config };
    this.fft = new FftCore(this.config.fftSize);
  }

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const fftSize = this.config.fftSize;
    const prepared = prepareFftSamples(window.samples, fftSize);
    const magnitudes = this.fft.computeMagnitudes(prepared);
    const spectrum = classifyCepstrum(magnitudes, window.sampleRate, fftSize, {
      ...this.config,
      sampleRate: window.sampleRate,
    });

    return Promise.resolve({
      isDrone: spectrum.isDrone,
      confidence: spectrum.confidence,
      reasoning: spectrum.reasoning,
      fundamentalsHz: spectrum.fundamentalHz ? [spectrum.fundamentalHz] : undefined,
      features: {
        fundamentalHz: spectrum.fundamentalHz ?? 0,
      },
      latencyMs: performance.now() - t0,
    });
  }
}

export function createCepstralDetector(config?: Partial<CepstralDetectorConfig>): DroneDetector {
  return new CepstralDetector(config);
}

export { DEFAULT_FFT_SIZE };

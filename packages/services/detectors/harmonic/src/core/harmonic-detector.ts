/**
 * Harmonic drone detector — Issue #45, фаза 1.
 */
import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';
import { FftCore } from '@membrana/fft-analyzer-service';
import { classifySpectrum, DEFAULT_HARMONIC_DETECTOR_CONFIG } from '../math/classifier.js';
import type { HarmonicDetectorConfig } from '../types.js';
import { prepareFftSamples } from './sample-window.js';

export class HarmonicDetector implements DroneDetector {
  readonly name = 'harmonic';
  readonly family = 'dsp' as const;

  private readonly config: HarmonicDetectorConfig;
  private readonly fft: FftCore;

  constructor(config: Partial<HarmonicDetectorConfig> = {}) {
    this.config = { ...DEFAULT_HARMONIC_DETECTOR_CONFIG, ...config };
    this.fft = new FftCore(this.config.fftSize);
  }

  detect(window: AudioWindow): Promise<DetectionResult> {
    const t0 = performance.now();
    const sampleRate = window.sampleRate;
    const fftSize = this.config.fftSize;

    const prepared = prepareFftSamples(window.samples, fftSize);
    const magnitudes = this.fft.computeMagnitudes(prepared);
    const spectrum = classifySpectrum(magnitudes, sampleRate, fftSize, {
      ...this.config,
      sampleRate,
    });

    const latencyMs = performance.now() - t0;

    return Promise.resolve({
      isDrone: spectrum.isDrone,
      confidence: spectrum.confidence,
      reasoning: spectrum.reasoning,
      features: {
        fundamentalHz: spectrum.fundamentals?.[0] ?? 0,
        harmonicCount: spectrum.fundamentals?.length ?? 0,
      },
      latencyMs,
    });
  }
}

export function createHarmonicDetector(config?: Partial<HarmonicDetectorConfig>): DroneDetector {
  return new HarmonicDetector(config);
}

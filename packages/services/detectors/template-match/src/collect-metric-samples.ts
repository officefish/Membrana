import { applyPreset, FftAnalyzer, PRESETS, rms, SpectralFluxTracker } from '@membrana/fft-analyzer-service';
import type { MetricSample } from '@membrana/trends-detector-service';

import {
  DEFAULT_FFT_SIZE,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MEASUREMENTS_COUNT,
} from './constants.js';
import type { MetricCollectionOptions } from './types.js';

/**
 * Collect FFT trend metric samples from a full audio buffer (offline, 5 s catalog samples).
 */
export function collectMetricSamples(
  samples: Float32Array,
  sampleRate: number,
  options: MetricCollectionOptions = {},
): MetricSample[] {
  const fftSize = options.fftSize ?? DEFAULT_FFT_SIZE;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const measurementsCount = options.measurementsCount ?? DEFAULT_MEASUREMENTS_COUNT;
  const analyzer = new FftAnalyzer(
    applyPreset({
      ...PRESETS.drone,
      fftSize,
      smoothingTimeConstant: 0.8,
    }),
  );
  const fluxTracker = new SpectralFluxTracker();
  const collected: MetricSample[] = [];

  for (let i = 0; i < measurementsCount; i += 1) {
    const timestampMs = i * intervalMs;
    const startIdx = Math.floor((timestampMs / 1000) * sampleRate);
    if (startIdx + fftSize > samples.length) break;

    const chunk = samples.subarray(startIdx, startIdx + fftSize);
    const live = analyzer.analyze(chunk, sampleRate, timestampMs, fluxTracker);
    collected.push({
      timestamp: timestampMs,
      centroid: live.centroid,
      flux: live.flux,
      rms: rms(chunk),
    });
  }

  return collected;
}

import { getMonoChannel } from '@membrana/audio-engine-service';
import {
  FftAnalyzer,
  SpectralFluxTracker,
  applyPreset,
  evaluateFrameVerdict,
  evaluateThresholdTest,
  PRESETS,
  rms,
  type FrameVerdict,
} from '@membrana/fft-analyzer-service';
import { loadSampleBufferById } from '@membrana/sample-playback-service';

import {
  buildFftThresholdTestReport,
  type FftThresholdTestReport,
} from '../fft-threshold-test/buildFftThresholdTestReport';

import type { SampleLibraryFftThresholdTestPluginConfig } from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.5;

function newTestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fft-sample-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Offline-прогон порогового FFT-теста по целому сэмплу библиотеки.
 * Нарезает frameCount кадров с шагом intervalMs и применяет ту же чистую
 * математику, что live-плагин микрофона (evaluateFrameVerdict / evaluateThresholdTest).
 */
export async function analyzeSampleFftThreshold(
  sampleId: string,
  config: SampleLibraryFftThresholdTestPluginConfig,
): Promise<FftThresholdTestReport> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const sampleRate = buffer.sampleRate;

  const analyzer = new FftAnalyzer(
    applyPreset({ ...PRESETS.drone, fftSize: FFT_SIZE, smoothingTimeConstant: SMOOTHING }),
  );
  const fluxTracker = new SpectralFluxTracker();
  const window = new Float32Array(FFT_SIZE);
  const frames: FrameVerdict[] = [];
  const startedAt = Date.now();

  for (let i = 0; i < config.frameCount; i += 1) {
    const timestampMs = i * config.intervalMs;
    const startIdx = Math.floor((timestampMs / 1000) * sampleRate);
    const segLen = Math.min(FFT_SIZE, Math.max(0, samples.length - startIdx));
    for (let s = 0; s < FFT_SIZE; s += 1) {
      window[s] = s < segLen ? samples[startIdx + s]! : 0;
    }
    const live = analyzer.analyze(window, sampleRate, timestampMs, fluxTracker);
    const partial = evaluateFrameVerdict(
      { centroid: live.centroid, flux: live.flux, rms: rms(window) },
      config.thresholds,
      config.strictness,
    );
    frames.push({ index: i, timestamp: timestampMs, ...partial });
  }

  const result = evaluateThresholdTest({
    frames,
    strictness: config.strictness,
    frameCount: config.frameCount,
    thresholds: config.thresholds,
    intervalMs: config.intervalMs,
    mode: 'manual',
    testId: newTestId(),
    startedAt,
    finishedAt: Date.now(),
  });

  return buildFftThresholdTestReport(result);
}

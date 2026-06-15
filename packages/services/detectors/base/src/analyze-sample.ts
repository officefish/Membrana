import type { AudioWindow, DetectionResult, DetectorFamily, DroneDetector } from './types.js';

/** Default FFT window for 5 s sample analysis (matches harmonic v0.1). */
export const DEFAULT_ANALYZE_FFT_SIZE = 2048;

/** Default hop = 50% overlap. */
export const DEFAULT_ANALYZE_HOP_RATIO = 0.5;

export interface AnalyzeSampleOptions {
  /** Frame length in samples (default 2048). */
  readonly fftSize?: number;
  /** Hop between frames; default `floor(fftSize * hopRatio)`. */
  readonly hopSize?: number;
  /** Used when `hopSize` omitted (default 0.5). */
  readonly hopRatio?: number;
}

/** Aggregated drone verdict for one 5 s sample and one detector. */
export interface SampleDetectionVerdict {
  readonly detectorName: string;
  readonly detectorFamily: DetectorFamily;
  readonly sampleRate: number;
  readonly sampleDurationSec: number;
  readonly frameCount: number;
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly maxFrameConfidence: number;
  readonly latencyMsTotal: number;
  readonly fundamentalsHz?: readonly number[];
}

export interface AnalyzeSampleResult {
  readonly verdict: SampleDetectionVerdict;
  readonly frameLatenciesMs: readonly number[];
}

function* iterWindows(
  samples: Float32Array,
  fftSize: number,
  hop: number,
): Generator<Float32Array> {
  if (samples.length < fftSize) return;
  for (let start = 0; start + fftSize <= samples.length; start += hop) {
    yield samples.subarray(start, start + fftSize);
  }
}

function pickFundamentalsHz(results: readonly DetectionResult[]): readonly number[] | undefined {
  let best: DetectionResult | null = null;
  for (const r of results) {
    if (!r.fundamentalsHz?.length) continue;
    if (!best || r.confidence > best.confidence) best = r;
  }
  return best?.fundamentalsHz;
}

/**
 * Run detector over overlapping windows of a full sample buffer; aggregate to one verdict.
 * Canonical path for UI (sample-library plugin) and `yarn benchmark:detectors`.
 */
export async function analyzeSample(
  samples: Float32Array,
  sampleRate: number,
  detector: DroneDetector,
  options: AnalyzeSampleOptions = {},
): Promise<AnalyzeSampleResult> {
  const fftSize = options.fftSize ?? DEFAULT_ANALYZE_FFT_SIZE;
  const hopRatio = options.hopRatio ?? DEFAULT_ANALYZE_HOP_RATIO;
  const hop = options.hopSize ?? Math.max(1, Math.floor(fftSize * hopRatio));

  const frameResults: DetectionResult[] = [];
  const frameLatenciesMs: number[] = [];
  let timestampMs = 0;

  for (const chunk of iterWindows(samples, fftSize, hop)) {
    const durationSec = chunk.length / sampleRate;
    const window: AudioWindow = {
      samples: chunk,
      sampleRate,
      timestamp: timestampMs,
      durationSec,
    };
    const result = await detector.detect(window);
    frameResults.push(result);
    frameLatenciesMs.push(result.latencyMs);
    timestampMs += (hop / sampleRate) * 1000;
  }

  const sampleDurationSec = samples.length / sampleRate;
  const frameCount = frameResults.length;

  if (frameCount === 0) {
    return {
      verdict: {
        detectorName: detector.name,
        detectorFamily: detector.family,
        sampleRate,
        sampleDurationSec,
        frameCount: 0,
        isDrone: false,
        confidence: 0,
        maxFrameConfidence: 0,
        latencyMsTotal: 0,
      },
      frameLatenciesMs: [],
    };
  }

  let maxFrameConfidence = 0;
  let isDrone = false;
  let latencyMsTotal = 0;

  for (const r of frameResults) {
    if (r.isDrone) isDrone = true;
    if (r.confidence > maxFrameConfidence) maxFrameConfidence = r.confidence;
    latencyMsTotal += r.latencyMs;
  }

  return {
    verdict: {
      detectorName: detector.name,
      detectorFamily: detector.family,
      sampleRate,
      sampleDurationSec,
      frameCount,
      isDrone,
      confidence: maxFrameConfidence,
      maxFrameConfidence,
      latencyMsTotal,
      fundamentalsHz: pickFundamentalsHz(frameResults),
    },
    frameLatenciesMs,
  };
}

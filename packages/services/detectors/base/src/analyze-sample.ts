import type { AudioWindow, DetectionResult, DetectorFamily, DroneDetector } from './types.js';

/** Default FFT window for 5 s sample analysis (matches harmonic v0.1). */
export const DEFAULT_ANALYZE_FFT_SIZE = 2048;

/** Default hop = 50% overlap. */
export const DEFAULT_ANALYZE_HOP_RATIO = 0.5;

/** How per-frame detector results combine into one sample verdict. */
export type SampleAggregationMode = 'any-frame' | 'majority' | 'min-ratio';

export interface AnalyzeSampleOptions {
  /** Frame length in samples (default 2048). */
  readonly fftSize?: number;
  /** Hop between frames; default `floor(fftSize * hopRatio)`. */
  readonly hopSize?: number;
  /** Used when `hopSize` omitted (default 0.5). */
  readonly hopRatio?: number;
  /**
   * Sample-level aggregation (default `any-frame`).
   * `majority` / `min-ratio` reduce false positives from single lucky frames.
   */
  readonly aggregation?: SampleAggregationMode;
  /** For `min-ratio`: minimum fraction of frames with `isDrone` (default 0.5). */
  readonly minDroneFrameRatio?: number;
  /** Post-aggregation confidence gate; when set, `isDrone` also requires `confidence >=` this. */
  readonly sampleConfidenceThreshold?: number;
  /** Include per-frame verdict rows in the result (for detailed reports). */
  readonly includeFrameVerdicts?: boolean;
}

/** Per-frame detector output for sample-level analysis. */
export interface SampleFrameVerdict {
  readonly index: number;
  readonly timestampMs: number;
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly reasoning?: string;
  readonly fundamentalsHz?: readonly number[];
  readonly features?: Readonly<Record<string, number>>;
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
  readonly frameVerdicts?: readonly SampleFrameVerdict[];
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
  const frameVerdicts: SampleFrameVerdict[] = [];
  let timestampMs = 0;
  let frameIndex = 0;

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
    if (options.includeFrameVerdicts) {
      frameVerdicts.push({
        index: frameIndex,
        timestampMs,
        isDrone: result.isDrone,
        confidence: result.confidence,
        ...(result.reasoning !== undefined ? { reasoning: result.reasoning } : {}),
        ...(result.fundamentalsHz !== undefined
          ? { fundamentalsHz: result.fundamentalsHz }
          : {}),
        ...(result.features !== undefined ? { features: result.features } : {}),
      });
    }
    frameIndex += 1;
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
  let droneFrameCount = 0;
  let latencyMsTotal = 0;

  for (const r of frameResults) {
    if (r.isDrone) droneFrameCount += 1;
    if (r.confidence > maxFrameConfidence) maxFrameConfidence = r.confidence;
    latencyMsTotal += r.latencyMs;
  }

  const aggregation = options.aggregation ?? 'any-frame';
  const minRatio = options.minDroneFrameRatio ?? 0.5;
  const droneFrameRatio = droneFrameCount / frameCount;

  let isDrone: boolean;
  switch (aggregation) {
    case 'majority':
      isDrone = droneFrameRatio > 0.5;
      break;
    case 'min-ratio':
      isDrone = droneFrameRatio >= minRatio;
      break;
    default:
      isDrone = droneFrameCount > 0;
      break;
  }

  if (options.sampleConfidenceThreshold !== undefined) {
    isDrone = isDrone && maxFrameConfidence >= options.sampleConfidenceThreshold;
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
    ...(options.includeFrameVerdicts ? { frameVerdicts } : {}),
  };
}

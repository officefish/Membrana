import type { DetectionResult, DroneDetector, SampleDetectionVerdict } from '@membrana/detector-base';

import { runTemplateMatchSampleAnalysis } from './run-template-match-analysis.js';
import type { TemplateMatchDetectorConfig } from './types.js';
import type { TemplateMatchSampleAnalysis } from './run-template-match-analysis.js';

/**
 * Run template-match on a full sample buffer (not per overlapping FFT frame).
 */
export async function analyzeTemplateMatch(
  samples: Float32Array,
  sampleRate: number,
  detector: DroneDetector,
): Promise<SampleDetectionVerdict> {
  const t0 = performance.now();
  const result = await detector.detect({
    samples,
    sampleRate,
    timestamp: 0,
    durationSec: samples.length / sampleRate,
  });
  const detection = result as DetectionResult;

  return {
    detectorName: detector.name,
    detectorFamily: detector.family,
    sampleRate,
    sampleDurationSec: samples.length / sampleRate,
    frameCount: 1,
    isDrone: detection.isDrone,
    confidence: detection.confidence,
    maxFrameConfidence: detection.confidence,
    latencyMsTotal: performance.now() - t0,
  };
}

/**
 * Template-match with trends breakdown for detailed drone detection reports (DDR2).
 */
export async function analyzeTemplateMatchDetailed(
  samples: Float32Array,
  sampleRate: number,
  config: TemplateMatchDetectorConfig,
): Promise<TemplateMatchSampleAnalysis> {
  const t0 = performance.now();
  return runTemplateMatchSampleAnalysis(
    samples,
    sampleRate,
    config,
    performance.now() - t0,
  );
}

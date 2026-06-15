import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetector } from '@membrana/detector-base';

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

  return {
    detectorName: detector.name,
    detectorFamily: detector.family,
    sampleRate,
    sampleDurationSec: samples.length / sampleRate,
    frameCount: 1,
    isDrone: result.isDrone,
    confidence: result.confidence,
    maxFrameConfidence: result.confidence,
    latencyMsTotal: performance.now() - t0,
  };
}

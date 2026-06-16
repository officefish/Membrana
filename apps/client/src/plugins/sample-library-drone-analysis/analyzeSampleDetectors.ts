import { getMonoChannel } from '@membrana/audio-engine-service';
import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionReport } from '@membrana/detector-report';
import { analyzeDroneDetectionDetailed } from '@membrana/drone-detection-orchestrator-service';
import { loadSampleBufferById } from '@membrana/sample-playback-service';

export interface AnalyzeSampleDetectorsResult {
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly report: DroneDetectionReport;
}

/**
 * Decode a media-library sample in the browser and run the full DDR pipeline.
 * The detector orchestration itself lives in
 * `@membrana/drone-detection-orchestrator-service` so the server can reuse it (LP1b).
 */
export async function analyzeSampleDetectors(
  sampleId: string,
  sampleTitle: string | null = null,
): Promise<AnalyzeSampleDetectorsResult> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  return analyzeDroneDetectionDetailed(samples, buffer.sampleRate, {
    sampleId,
    sampleTitle,
  });
}

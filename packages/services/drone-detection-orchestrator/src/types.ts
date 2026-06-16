import type { SampleDetectionVerdict } from '@membrana/detector-base';
import type { DroneDetectionReport } from '@membrana/detector-report';

export interface DroneDetectionDetailedInput {
  /** Stable id of the analysed sample (media library sample id or synthetic stream id). */
  readonly sampleId: string;
  /** Human-readable title for the report header; null when unknown. */
  readonly sampleTitle?: string | null;
}

export interface DroneDetectionDetailedResult {
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly report: DroneDetectionReport;
}

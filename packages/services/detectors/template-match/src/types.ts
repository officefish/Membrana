import type { PatternTemplate } from '@membrana/trends-detector-service';

export interface MetricCollectionOptions {
  readonly measurementsCount?: number;
  readonly intervalMs?: number;
  readonly fftSize?: number;
}

export interface TemplateMatchDetectorConfig {
  readonly templates: readonly PatternTemplate[];
  readonly minConfidence?: number;
  readonly activityRmsThreshold?: number;
  readonly droneKeyPrefix?: string;
  readonly metricCollection?: MetricCollectionOptions;
}

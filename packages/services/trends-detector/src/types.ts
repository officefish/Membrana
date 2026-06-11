export interface Bounds {
  readonly min: number;
  readonly max: number;
}

export interface OptionalBounds {
  readonly min?: number;
  readonly max?: number;
}

export interface FrequencyJumpsSpec {
  readonly enabled: boolean;
  readonly minJumpsRequired: number;
  readonly densityPerSecond?: OptionalBounds;
  readonly magnitudeRange?: OptionalBounds;
}

export interface FrequencyJumpsFeatures {
  readonly enabled: boolean;
  readonly actualJumps: number;
  readonly densityPerSecond: number;
  readonly minJumpsRequired: number;
  readonly magnitudeRange: { readonly min: number; readonly max: number; readonly avg: number };
}

export interface TemporalPatternSpec {
  readonly centroidStd?: Bounds;
  readonly fluxStd?: Bounds;
  readonly rmsStd?: Bounds;
  readonly activityRatio?: Bounds;
  readonly avgSilenceDuration?: Bounds;
  readonly avgBurstDuration?: Bounds;
  readonly frequencyJumps?: FrequencyJumpsSpec;
  readonly volumeTrend?: readonly string[];
  readonly frequencyTrend?: readonly string[];
  readonly longTermStability?: readonly string[];
  readonly periodicity?: readonly string[];
  readonly envelopeShape?: readonly string[];
  readonly peakToAverageRatio?: Bounds;
}

export interface TemporalFeatures {
  readonly centroidStd: number;
  readonly fluxStd: number;
  readonly rmsStd: number;
  readonly activityRatio: number;
  readonly avgSilenceDuration: number;
  readonly avgBurstDuration: number;
  readonly frequencyJumps: FrequencyJumpsFeatures;
  readonly volumeTrend: string;
  readonly frequencyTrend: string;
  readonly longTermStability: string;
  readonly periodicity: string;
  readonly envelopeShape: string;
  readonly peakToAverageRatio: number;
}

export interface MetricSample {
  readonly timestamp: number;
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
}

export interface PatternTemplate {
  readonly key: string;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly description: string;
  readonly thresholds: {
    readonly centroid: Bounds;
    readonly flux: Bounds;
    readonly rms: Bounds;
  };
  readonly temporalPatterns: TemporalPatternSpec;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'veryLow';

export interface TemplateScore {
  readonly key: string;
  readonly score: number;
  readonly spectralScore: number;
  readonly temporalScore: number;
}

export interface TrendsDetectionResult {
  readonly detectedState: string;
  readonly detectedStateName: string;
  readonly detectedStateIcon: string;
  readonly detectedStateColor: string;
  readonly confidence: number;
  readonly confidenceLevel: ConfidenceLevel;
  readonly samples: readonly MetricSample[];
  readonly isDetected: boolean;
  readonly scores: readonly TemplateScore[];
  readonly temporalFeatures: TemporalFeatures | null;
}

export interface ClassifyTrendsOptions {
  readonly minConfidence?: number;
  readonly activityRmsThreshold?: number;
}

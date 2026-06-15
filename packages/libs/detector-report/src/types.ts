/** Schema version for telemetry and JSON export. */
export const DRONE_DETECTION_REPORT_SCHEMA_VERSION = 'drone-detection-report/v1' as const;

export type DroneDetectionReportSchemaVersion = typeof DRONE_DETECTION_REPORT_SCHEMA_VERSION;

export type GroundTruthLabel = 'drone' | 'not-drone' | 'unlabeled';

export type DroneDetectorName = 'harmonic' | 'cepstral' | 'spectral-flux' | 'template-match';

export interface DroneDetectionReportMeta {
  readonly reportId: string;
  readonly createdAtIso: string;
  readonly createdAtMoscow: string;
  readonly schemaVersion: DroneDetectionReportSchemaVersion;
  readonly sampleId: string;
  readonly sampleTitle: string | null;
  readonly sampleRate: number;
  readonly sampleDurationSec: number;
  readonly groundTruthLabel?: GroundTruthLabel;
}

export interface HarmonicFrameRow {
  readonly index: number;
  readonly timestampMs: number;
  readonly maxHarmonicScore: number;
  readonly fundamentalHz: number | null;
  readonly confidence: number;
  readonly isDrone: boolean;
}

export interface HarmonicBreakdown {
  readonly kind: 'harmonic';
  readonly aggregation: string;
  readonly sampleConfidenceThreshold?: number;
  readonly frames: readonly HarmonicFrameRow[];
}

export interface CepstralFrameRow {
  readonly index: number;
  readonly timestampMs: number;
  readonly cepstrumPeak: number;
  readonly fundamentalHz: number | null;
  readonly confidence: number;
  readonly isDrone: boolean;
}

export interface CepstralBreakdown {
  readonly kind: 'cepstral';
  readonly aggregation: string;
  readonly sampleConfidenceThreshold?: number;
  readonly frames: readonly CepstralFrameRow[];
}

export interface SpectralFluxFrameRow {
  readonly index: number;
  readonly timestampMs: number;
  readonly flux: number;
  readonly lowEnergyPercent: number;
  readonly confidence: number;
  readonly isDrone: boolean;
}

export interface SpectralFluxBreakdown {
  readonly kind: 'spectral-flux';
  readonly aggregation: string;
  readonly sampleConfidenceThreshold?: number;
  readonly frames: readonly SpectralFluxFrameRow[];
}

export type TemplateMatchFieldCategory = 'spectral' | 'temporal';

export interface TemplateMatchFieldRow {
  readonly field: string;
  readonly category: TemplateMatchFieldCategory;
  readonly actual: string;
  readonly expected: string;
  readonly matchPercent: number;
  readonly weight: number;
}

export interface TemplateScoreRow {
  readonly templateKey: string;
  readonly templateName: string | null;
  readonly score: number;
}

export interface TemplateMatchBreakdown {
  readonly kind: 'template-match';
  readonly minConfidence: number;
  readonly winner: {
    readonly templateKey: string;
    readonly templateName: string | null;
    readonly overallScore: number;
    readonly spectralScore: number;
    readonly temporalScore: number;
  };
  readonly fields: readonly TemplateMatchFieldRow[];
  readonly topTemplates: readonly TemplateScoreRow[];
}

export type DroneDetectorBreakdown =
  | HarmonicBreakdown
  | CepstralBreakdown
  | SpectralFluxBreakdown
  | TemplateMatchBreakdown;

export interface DroneDetectorVerdictSection {
  readonly detectorName: DroneDetectorName;
  readonly detectorFamily: 'dsp';
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly aggregation?: string;
  readonly sampleConfidenceThreshold?: number;
  readonly reasoning?: string;
  readonly breakdown: DroneDetectorBreakdown;
}

export interface DroneDetectionReport {
  readonly meta: DroneDetectionReportMeta;
  readonly verdicts: readonly DroneDetectorVerdictSection[];
}

export interface BuildDroneDetectionReportSample {
  readonly id: string;
  readonly title: string | null;
  readonly sampleRate: number;
  readonly durationSec: number;
  readonly groundTruthLabel?: GroundTruthLabel;
}

export interface BuildDroneDetectionReportInput {
  readonly reportId?: string;
  readonly createdAt?: Date;
  readonly sample: BuildDroneDetectionReportSample;
  readonly verdicts: readonly DroneDetectorVerdictSection[];
}

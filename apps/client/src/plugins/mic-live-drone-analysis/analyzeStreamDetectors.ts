import {
  analyzeSample,
  type AnalyzeSampleOptions,
  type DroneDetector,
  type SampleDetectionVerdict,
} from '@membrana/detector-base';
import {
  buildBriefDroneDetectionReport,
  mapVerdictsToBrief,
  type DroneDetectionBriefReport,
} from '@membrana/detector-report';
import {
  createCepstralDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as CEPSTRAL_THRESHOLD,
  DEFAULT_FFT_SIZE as CEPSTRAL_FFT_SIZE,
} from '@membrana/cepstral-detector-service';
import {
  createHarmonicDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as HARMONIC_THRESHOLD,
  DEFAULT_FFT_SIZE as HARMONIC_FFT_SIZE,
} from '@membrana/harmonic-detector-service';
import {
  createSpectralFluxDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as FLUX_THRESHOLD,
  DEFAULT_FFT_SIZE as FLUX_FFT_SIZE,
} from '@membrana/spectral-flux-detector-service';

import { CALIBRATED_SAMPLE_OPTIONS } from '@/plugins/sample-library-drone-analysis/detectorCalibrationPreset';

import type { MicLiveDroneAnalysisMode } from './types';
import type { StreamWindowAudio } from './streamWindowCollector';

export interface AnalyzeStreamDetectorsBriefResult {
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly report: DroneDetectionBriefReport;
}

function createStreamFrameDetectors(): DroneDetector[] {
  return [
    createHarmonicDetector({
      confidenceThreshold: HARMONIC_THRESHOLD,
      fftSize: HARMONIC_FFT_SIZE,
    }),
    createCepstralDetector({
      confidenceThreshold: CEPSTRAL_THRESHOLD,
      fftSize: CEPSTRAL_FFT_SIZE,
    }),
    createSpectralFluxDetector({
      confidenceThreshold: FLUX_THRESHOLD,
      fftSize: FLUX_FFT_SIZE,
    }),
  ];
}

function newReportId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Fast stream analysis: parallel DSP verdicts, no per-frame breakdown (brief report).
 */
export async function analyzeStreamDetectorsBrief(
  audio: StreamWindowAudio,
  params: {
    readonly title: string | null;
    readonly analysisMode: MicLiveDroneAnalysisMode;
  },
): Promise<AnalyzeStreamDetectorsBriefResult> {
  const reportId = newReportId();
  const sampleId = `stream-${reportId}`;
  const frameDetectors = createStreamFrameDetectors();

  const verdicts = await Promise.all(
    frameDetectors.map(async (detector) => {
      const analyzeOptions: AnalyzeSampleOptions = {
        ...(CALIBRATED_SAMPLE_OPTIONS[detector.name] ?? {}),
        includeFrameVerdicts: false,
      };
      const { verdict } = await analyzeSample(
        audio.samples,
        audio.sampleRate,
        detector,
        analyzeOptions,
      );
      return verdict;
    }),
  );

  const report = buildBriefDroneDetectionReport({
    reportId,
    sample: {
      id: sampleId,
      title: params.title,
      sampleRate: audio.sampleRate,
      durationSec: audio.durationSec,
    },
    verdicts: mapVerdictsToBrief(
      verdicts.map((verdict) => ({
        detectorName: verdict.detectorName as 'harmonic' | 'cepstral' | 'spectral-flux',
        isDrone: verdict.isDrone,
        confidence: verdict.confidence,
      })),
    ),
    analysisMode: params.analysisMode,
    detailedReportStatus: 'none',
  });

  return { verdicts, report };
}

export function syntheticStreamTrackId(moduleId: string, reportId: string): string {
  return `stream:${moduleId}:${reportId}`;
}

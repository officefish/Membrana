import {
  analyzeSample,
  type AnalyzeSampleOptions,
  type DroneDetector,
  type SampleDetectionVerdict,
  type SampleFrameVerdict,
} from '@membrana/detector-base';
import {
  buildCepstralVerdictSection,
  buildDroneDetectionReport,
  buildHarmonicVerdictSection,
  buildSpectralFluxVerdictSection,
  buildTemplateMatchVerdictSection,
  type DroneDetectionReport,
  type DroneDetectorVerdictSection,
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
import {
  analyzeTemplateMatchDetailed,
  createDefaultTemplateMatchCatalog,
} from '@membrana/template-match-detector-service';

import { CALIBRATED_SAMPLE_OPTIONS } from './calibration-preset.js';
import { mapTrendsTemplateMatchBreakdown } from './map-template-match-breakdown.js';
import type {
  DroneDetectionDetailedInput,
  DroneDetectionDetailedResult,
} from './types.js';

/** Build the three calibrated DSP detectors used for the full drone detection report. */
export function createDroneFrameDetectors(): DroneDetector[] {
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

function buildDspVerdictSection(
  detectorName: string,
  verdict: SampleDetectionVerdict,
  frames: readonly SampleFrameVerdict[],
  options: AnalyzeSampleOptions,
): DroneDetectorVerdictSection {
  switch (detectorName) {
    case 'harmonic':
      return buildHarmonicVerdictSection(verdict, frames, options);
    case 'cepstral':
      return buildCepstralVerdictSection(verdict, frames, options);
    case 'spectral-flux':
      return buildSpectralFluxVerdictSection(verdict, frames, options);
    default:
      throw new Error(`Unsupported DSP detector for report: ${detectorName}`);
  }
}

/**
 * Run all active detectors over mono Float32 samples and assemble a detailed
 * drone-detection-report/v1 (DDR2). Pure DSP — no browser / Web Audio dependency,
 * so it runs identically in the client (browser decode) and on the server (Node decode).
 */
export async function analyzeDroneDetectionDetailed(
  samples: Float32Array,
  sampleRate: number,
  input: DroneDetectionDetailedInput,
): Promise<DroneDetectionDetailedResult> {
  const frameDetectors = createDroneFrameDetectors();
  const verdicts: SampleDetectionVerdict[] = [];
  const reportSections: DroneDetectorVerdictSection[] = [];

  for (const detector of frameDetectors) {
    const analyzeOptions: AnalyzeSampleOptions = {
      ...(CALIBRATED_SAMPLE_OPTIONS[detector.name] ?? {}),
      includeFrameVerdicts: true,
    };
    const { verdict, frameVerdicts = [] } = await analyzeSample(
      samples,
      sampleRate,
      detector,
      analyzeOptions,
    );
    verdicts.push(verdict);
    reportSections.push(buildDspVerdictSection(detector.name, verdict, frameVerdicts, analyzeOptions));
  }

  const templates = createDefaultTemplateMatchCatalog();
  const templateNameByKey = new Map(templates.map((template) => [template.key, template.name]));
  const templateAnalysis = await analyzeTemplateMatchDetailed(samples, sampleRate, {
    templates,
  });
  verdicts.push(templateAnalysis.verdict);

  const templateBreakdown = mapTrendsTemplateMatchBreakdown({
    minConfidence: templateAnalysis.minConfidence,
    trendsBreakdown: templateAnalysis.trendsBreakdown,
    winnerTemplate: templateAnalysis.winnerTemplate,
    topScores: templateAnalysis.trendsResult.scores,
    templateNameByKey,
    metricSamples: templateAnalysis.trendsResult.samples,
  });

  reportSections.push(
    buildTemplateMatchVerdictSection(
      templateAnalysis.verdict,
      templateBreakdown,
      `${templateAnalysis.trendsResult.detectedStateName} (${Math.round(templateAnalysis.trendsResult.confidence)}%)`,
    ),
  );

  const report: DroneDetectionReport = buildDroneDetectionReport({
    sample: {
      id: input.sampleId,
      title: input.sampleTitle ?? null,
      sampleRate,
      durationSec: samples.length / sampleRate,
    },
    verdicts: reportSections,
  });

  return { verdicts, report };
}

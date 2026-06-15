import { getMonoChannel } from '@membrana/audio-engine-service';
import {
  analyzeSample,
  type AnalyzeSampleOptions,
  type DroneDetector,
  type SampleDetectionVerdict,
} from '@membrana/detector-base';
import {
  buildCepstralVerdictSection,
  buildDroneDetectionReport,
  buildHarmonicVerdictSection,
  buildSpectralFluxVerdictSection,
  buildTemplateMatchVerdictSection,
  type DroneDetectionReport,
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
import { loadSampleBufferById } from '@membrana/sample-playback-service';
import {
  analyzeTemplateMatchDetailed,
  createDefaultTemplateMatchCatalog,
} from '@membrana/template-match-detector-service';

import { CALIBRATED_SAMPLE_OPTIONS } from './detectorCalibrationPreset';
import { mapTrendsTemplateMatchBreakdown } from './mapTemplateMatchReportBreakdown';

export interface AnalyzeSampleDetectorsResult {
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly report: DroneDetectionReport;
}

function createFrameDetectors(): DroneDetector[] {
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
  frames: readonly import('@membrana/detector-base').SampleFrameVerdict[],
  options: AnalyzeSampleOptions,
): import('@membrana/detector-report').DroneDetectorVerdictSection {
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

/** Decode sample by id and run all active detectors with detailed report payload (DDR2). */
export async function analyzeSampleDetectors(
  sampleId: string,
  sampleTitle: string | null = null,
): Promise<AnalyzeSampleDetectorsResult> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const frameDetectors = createFrameDetectors();
  const verdicts: SampleDetectionVerdict[] = [];
  const reportSections: import('@membrana/detector-report').DroneDetectorVerdictSection[] = [];

  for (const detector of frameDetectors) {
    const analyzeOptions: AnalyzeSampleOptions = {
      ...(CALIBRATED_SAMPLE_OPTIONS[detector.name] ?? {}),
      includeFrameVerdicts: true,
    };
    const { verdict, frameVerdicts = [] } = await analyzeSample(
      samples,
      buffer.sampleRate,
      detector,
      analyzeOptions,
    );
    verdicts.push(verdict);
    reportSections.push(buildDspVerdictSection(detector.name, verdict, frameVerdicts, analyzeOptions));
  }

  const templates = createDefaultTemplateMatchCatalog();
  const templateNameByKey = new Map(templates.map((template) => [template.key, template.name]));
  const templateAnalysis = await analyzeTemplateMatchDetailed(samples, buffer.sampleRate, {
    templates,
  });
  verdicts.push(templateAnalysis.verdict);

  const templateBreakdown = mapTrendsTemplateMatchBreakdown({
    minConfidence: templateAnalysis.minConfidence,
    trendsBreakdown: templateAnalysis.trendsBreakdown,
    winnerTemplate: templateAnalysis.winnerTemplate,
    topScores: templateAnalysis.trendsResult.scores,
    templateNameByKey,
  });

  reportSections.push(
    buildTemplateMatchVerdictSection(
      templateAnalysis.verdict,
      templateBreakdown,
      `${templateAnalysis.trendsResult.detectedStateName} (${Math.round(templateAnalysis.trendsResult.confidence)}%)`,
    ),
  );

  const report = buildDroneDetectionReport({
    sample: {
      id: sampleId,
      title: sampleTitle,
      sampleRate: buffer.sampleRate,
      durationSec: samples.length / buffer.sampleRate,
    },
    verdicts: reportSections,
  });

  return { verdicts, report };
}

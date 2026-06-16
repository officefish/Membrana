import { getMonoChannel } from '@membrana/audio-engine-service';
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
import { loadSampleBufferById } from '@membrana/sample-playback-service';
import {
  createSpectralFluxDetector,
  DEFAULT_CONFIDENCE_THRESHOLD as FLUX_THRESHOLD,
  DEFAULT_FFT_SIZE as FLUX_FFT_SIZE,
} from '@membrana/spectral-flux-detector-service';

import { CALIBRATED_SAMPLE_OPTIONS } from '@/plugins/sample-library-drone-analysis/detectorCalibrationPreset';

export interface AnalyzeSampleDetectorsBriefResult {
  readonly verdicts: readonly SampleDetectionVerdict[];
  readonly report: DroneDetectionBriefReport;
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

/** Decode sample and run DSP detectors in parallel — brief report only (no template-match). */
export async function analyzeSampleDetectorsBrief(
  sampleId: string,
  sampleTitle: string | null = null,
): Promise<AnalyzeSampleDetectorsBriefResult> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const frameDetectors = createFrameDetectors();

  const verdicts = await Promise.all(
    frameDetectors.map(async (detector) => {
      const analyzeOptions: AnalyzeSampleOptions = {
        ...(CALIBRATED_SAMPLE_OPTIONS[detector.name] ?? {}),
        includeFrameVerdicts: false,
      };
      const { verdict } = await analyzeSample(
        samples,
        buffer.sampleRate,
        detector,
        analyzeOptions,
      );
      return verdict;
    }),
  );

  const report = buildBriefDroneDetectionReport({
    sample: {
      id: sampleId,
      title: sampleTitle,
      sampleRate: buffer.sampleRate,
      durationSec: samples.length / buffer.sampleRate,
    },
    verdicts: mapVerdictsToBrief(
      verdicts.map((verdict) => ({
        detectorName: verdict.detectorName as 'harmonic' | 'cepstral' | 'spectral-flux',
        isDrone: verdict.isDrone,
        confidence: verdict.confidence,
      })),
    ),
    analysisMode: 'track-import',
    detailedReportStatus: 'none',
  });

  return { verdicts, report };
}

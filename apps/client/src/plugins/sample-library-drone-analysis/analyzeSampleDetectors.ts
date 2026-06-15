import { getMonoChannel } from '@membrana/audio-engine-service';
import {
  analyzeSample,
  type DroneDetector,
  type SampleDetectionVerdict,
} from '@membrana/detector-base';
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
  analyzeTemplateMatch,
  createDefaultTemplateMatchCatalog,
  createTemplateMatchDetector,
} from '@membrana/template-match-detector-service';
import { loadSampleBufferById } from '@membrana/sample-playback-service';

import { CALIBRATED_SAMPLE_OPTIONS } from './detectorCalibrationPreset';

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

/** Decode sample by id and run all active detectors (DSP frames + template-match on full buffer). */
export async function analyzeSampleDetectors(
  sampleId: string,
): Promise<readonly SampleDetectionVerdict[]> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const frameDetectors = createFrameDetectors();
  const verdicts: SampleDetectionVerdict[] = [];

  for (const detector of frameDetectors) {
    const analyzeOptions = CALIBRATED_SAMPLE_OPTIONS[detector.name] ?? {};
    const { verdict } = await analyzeSample(samples, buffer.sampleRate, detector, analyzeOptions);
    verdicts.push(verdict);
  }

  const templateDetector = createTemplateMatchDetector({
    templates: createDefaultTemplateMatchCatalog(),
  });
  const templateVerdict = await analyzeTemplateMatch(
    samples,
    buffer.sampleRate,
    templateDetector,
  );
  verdicts.push(templateVerdict);

  return verdicts;
}

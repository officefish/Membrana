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
import { loadSampleBufferById } from '@membrana/sample-playback-service';

function createActiveDetectors(): DroneDetector[] {
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

/** Decode sample by id and run all active detectors via canonical `analyzeSample`. */
export async function analyzeSampleDetectors(
  sampleId: string,
): Promise<readonly SampleDetectionVerdict[]> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const detectors = createActiveDetectors();
  const verdicts: SampleDetectionVerdict[] = [];

  for (const detector of detectors) {
    const { verdict } = await analyzeSample(samples, buffer.sampleRate, detector);
    verdicts.push(verdict);
  }

  return verdicts;
}

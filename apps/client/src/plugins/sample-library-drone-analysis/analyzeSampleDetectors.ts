import { getMonoChannel } from '@membrana/audio-engine-service';
import {
  analyzeSample,
  type DroneDetector,
  type SampleDetectionVerdict,
} from '@membrana/detector-base';
import {
  createHarmonicDetector,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_FFT_SIZE,
} from '@membrana/harmonic-detector-service';
import { loadSampleBufferById } from '@membrana/sample-playback-service';

function createActiveDetectors(): DroneDetector[] {
  return [
    createHarmonicDetector({
      confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
      fftSize: DEFAULT_FFT_SIZE,
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

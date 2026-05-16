import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class CepstralDetector implements DroneDetector {
  readonly name = 'cepstral';
  readonly family = 'dsp' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function createCepstralDetector(): DroneDetector {
  return new CepstralDetector();
}

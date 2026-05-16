import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class SpectralFluxDetector implements DroneDetector {
  readonly name = 'spectral-flux';
  readonly family = 'dsp' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function createSpectralFluxDetector(): DroneDetector {
  return new SpectralFluxDetector();
}

import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class ClapDetector implements DroneDetector {
  readonly name = 'clap';
  readonly family = 'neural' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function createClapDetector(): DroneDetector {
  return new ClapDetector();
}

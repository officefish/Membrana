import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class YamnetDetector implements DroneDetector {
  readonly name = 'yamnet';
  readonly family = 'neural' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function createYamnetDetector(): DroneDetector {
  return new YamnetDetector();
}

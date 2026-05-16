/**
 * Реализация DroneDetector — см. docs/prompts/HARMONIC_DETECTOR_IMPLEMENTATION_PROMPT.md
 * Issue #45, фаза 1.
 */
import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class HarmonicDetector implements DroneDetector {
  readonly name = 'harmonic';
  readonly family = 'dsp' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function createHarmonicDetector(): DroneDetector {
  return new HarmonicDetector();
}

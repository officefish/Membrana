import {
  NotImplementedError,
  type AudioWindow,
  type DetectionResult,
  type DroneDetector,
} from '@membrana/detector-base';

export class AgenticClaudeDetector implements DroneDetector {
  readonly name = 'agentic-claude';
  readonly family = 'agentic' as const;

  detect(_window: AudioWindow): Promise<DetectionResult> {
    return Promise.reject(new NotImplementedError(this.name));
  }
}

export function createAgenticClaudeDetector(): DroneDetector {
  return new AgenticClaudeDetector();
}

import type { AudioWindow, DetectionResult, DroneDetector } from './types.js';

/** Fixed-result DroneDetector for unit tests and benchmark stubs. */
export function createMockDroneDetector(
  result: Omit<DetectionResult, 'latencyMs'> & { latencyMs?: number },
): DroneDetector {
  return {
    name: 'mock-detector',
    family: 'dsp',
    detect(_window: AudioWindow): Promise<DetectionResult> {
      return Promise.resolve({
        ...result,
        latencyMs: result.latencyMs ?? 0,
      });
    },
  };
}

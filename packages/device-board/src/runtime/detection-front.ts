import type { ScenarioDetectionResult } from './types.js';

/** Детекция дрона по результату trends-FFT (DRONE_* template). */
export function isDroneDetection(detection: ScenarioDetectionResult | null): boolean {
  if (detection === null || !detection.detected) {
    return false;
  }
  const templateId = detection.templateId ?? '';
  return templateId.startsWith('DRONE');
}

/**
 * Фронт детекции (V3): переход «не дрон» → «дрон» между итерациями main loop.
 */
export function isDetectionFrontEdge(
  previous: ScenarioDetectionResult | null,
  current: ScenarioDetectionResult | null,
): boolean {
  if (!isDroneDetection(current)) {
    return false;
  }
  return !isDroneDetection(previous);
}

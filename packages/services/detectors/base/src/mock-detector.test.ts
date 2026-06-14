import { describe, expect, it } from 'vitest';

import { createMockDroneDetector } from './mock-detector.js';
import { sineWindow } from './test-fixtures.js';

describe('createMockDroneDetector', () => {
  it('implements DroneDetector and returns configured result', async () => {
    const detector = createMockDroneDetector({
      isDrone: true,
      confidence: 0.9,
      reasoning: 'mock',
    });
    const window = sineWindow(120, 0.05, 48_000);
    const result = await detector.detect(window);

    expect(detector.name).toBe('mock-detector');
    expect(detector.family).toBe('dsp');
    expect(result.isDrone).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(result.latencyMs).toBe(0);
  });
});

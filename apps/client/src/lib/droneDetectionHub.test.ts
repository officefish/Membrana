import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  publishDroneDetected,
  resetDroneDetectionHubDebounceForTests,
  subscribeDroneDetection,
} from './droneDetectionHub';

describe('droneDetectionHub', () => {
  afterEach(() => {
    resetDroneDetectionHubDebounceForTests();
  });

  it('notifies subscribers on publish', () => {
    const listener = vi.fn();
    const unsub = subscribeDroneDetection(listener);

    publishDroneDetected({
      sourceId: 'test-source',
      sourceLabel: 'Test',
      timestamp: 1_000,
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: 'test-source', sourceLabel: 'Test' }),
    );

    unsub();
  });

  it('debounces duplicate events from the same source within 500ms', () => {
    const listener = vi.fn();
    subscribeDroneDetection(listener);

    publishDroneDetected({
      sourceId: 'fft-threshold-test',
      sourceLabel: 'FFT',
      timestamp: 10_000,
    });
    publishDroneDetected({
      sourceId: 'fft-threshold-test',
      sourceLabel: 'FFT',
      timestamp: 10_200,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('allows unsubscribe', () => {
    const listener = vi.fn();
    const unsub = subscribeDroneDetection(listener);
    unsub();

    publishDroneDetected({
      sourceId: 'other',
      sourceLabel: 'Other',
      timestamp: 20_000,
    });

    expect(listener).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  publishDroneDetected,
  resetDroneDetectionHubDebounceForTests,
  subscribeDroneDetection,
} from './droneDetectionHub';
import {
  DRONE_SENSOR_CYCLE_MS,
  DRONE_SENSOR_FADE_MS,
  DRONE_SENSOR_HOLD_MS,
  DroneDetectionSensorState,
} from './droneDetectionSensorState';

describe('DroneDetectionSensorState', () => {
  let state: DroneDetectionSensorState;

  beforeEach(() => {
    vi.useFakeTimers();
    resetDroneDetectionHubDebounceForTests();
    state = new DroneDetectionSensorState(subscribeDroneDetection);
  });

  afterEach(() => {
    state.dispose();
    vi.useRealTimers();
    resetDroneDetectionHubDebounceForTests();
  });

  const event = {
    sourceId: 'test',
    sourceLabel: 'Test source',
    timestamp: 1_000,
  };

  it('starts idle', () => {
    expect(state.getSnapshot().phase).toBe('idle');
    expect(state.getSnapshot().intensity).toBe(0.35);
    expect(state.getSnapshot().progress).toBe(0);
  });

  it('becomes active on detection and fades to idle after hold+fade', () => {
    publishDroneDetected(event);
    expect(state.getSnapshot().phase).toBe('active');
    expect(state.getSnapshot().intensity).toBe(1);
    expect(state.getSnapshot().progress).toBe(1);

    vi.advanceTimersByTime(DRONE_SENSOR_HOLD_MS);
    expect(state.getSnapshot().phase).toBe('fading');

    state.onFadeTransitionEnd();
    expect(state.getSnapshot().phase).toBe('idle');
  });

  it('re-trigger during fading returns to active', () => {
    publishDroneDetected(event);
    vi.advanceTimersByTime(DRONE_SENSOR_HOLD_MS);
    expect(state.getSnapshot().phase).toBe('fading');

    vi.advanceTimersByTime(DRONE_SENSOR_FADE_MS / 2);
    publishDroneDetected({ ...event, timestamp: 2_000 });

    expect(state.getSnapshot().phase).toBe('active');
    expect(state.getSnapshot().intensity).toBe(1);
    expect(state.getSnapshot().progress).toBe(1);
  });

  it('progress decreases over hold and fade cycle', () => {
    publishDroneDetected(event);
    vi.advanceTimersByTime(DRONE_SENSOR_HOLD_MS + DRONE_SENSOR_FADE_MS / 2);
    const mid = state.getSnapshot().progress;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.5);

    vi.advanceTimersByTime(DRONE_SENSOR_CYCLE_MS);
    state.onFadeTransitionEnd();
    expect(state.getSnapshot().progress).toBe(0);
  });
});

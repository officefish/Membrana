import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AudioSampleFrame } from '@membrana/audio-engine-service';

import { StreamWindowCollector } from './streamWindowCollector';

function frame(length: number, sampleRate = 48_000): AudioSampleFrame {
  return {
    samples: new Float32Array(length),
    sampleRate,
    timestamp: 0,
  };
}

describe('StreamWindowCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('signals completion only after the window duration elapses', () => {
    const collector = new StreamWindowCollector();
    collector.begin(3);

    expect(collector.isCollecting()).toBe(true);
    expect(collector.push(frame(1024))).toBe(false);

    vi.advanceTimersByTime(2999);
    expect(collector.push(frame(1024))).toBe(false);

    vi.advanceTimersByTime(1);
    expect(collector.push(frame(1024))).toBe(true);
  });

  it('concatenates frame samples into one window buffer', () => {
    const collector = new StreamWindowCollector();
    collector.begin(3);
    collector.push(frame(1024));
    collector.push(frame(1024));
    vi.advanceTimersByTime(3000);
    collector.push(frame(512));

    const audio = collector.finish();
    expect(audio.sampleRate).toBe(48_000);
    expect(audio.samples.length).toBe(1024 + 1024 + 512);
    expect(audio.durationSec).toBeCloseTo((1024 + 1024 + 512) / 48_000, 5);
    expect(collector.isCollecting()).toBe(false);
  });

  it('throws when finishing an empty window', () => {
    const collector = new StreamWindowCollector();
    collector.begin(3);
    expect(() => collector.finish()).toThrow();
  });

  it('reports elapsed time only while collecting', () => {
    const collector = new StreamWindowCollector();
    expect(collector.elapsedMs()).toBe(0);

    collector.begin(3);
    vi.advanceTimersByTime(1500);
    expect(collector.elapsedMs()).toBe(1500);

    collector.reset();
    expect(collector.isCollecting()).toBe(false);
    expect(collector.elapsedMs()).toBe(0);
  });
});

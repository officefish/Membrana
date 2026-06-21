import { describe, expect, it } from 'vitest';

import { RecorderRecordingSession } from './recorder-recording-session.js';

describe('RecorderRecordingSession', () => {
  it('starts inactive; elapsed grows after start', () => {
    const session = new RecorderRecordingSession();
    expect(session.getElapsedSec(1000)).toBe(0);
    session.start({ windowSec: 3 }, 1000);
    expect(session.isActive()).toBe(true);
    expect(session.getElapsedSec(2500)).toBe(1.5);
    expect(session.isWindowFull(3999)).toBe(false);
    expect(session.isWindowFull(4000)).toBe(true);
  });

  it('stop clears active state', () => {
    const session = new RecorderRecordingSession();
    session.start(undefined, 0);
    session.stop();
    expect(session.isActive()).toBe(false);
    expect(session.isWindowFull(10_000)).toBe(false);
  });
});

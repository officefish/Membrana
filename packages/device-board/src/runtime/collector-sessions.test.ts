import { describe, expect, it } from 'vitest';
import { createReferenceValue, invalidateReference } from '@membrana/core';

import {
  createDeviceCollectorRegistry,
  recorderSessionHandle,
  RefCollectorSession,
  spectralAnalyserSessionHandle,
} from './collector-sessions.js';

describe('collector-sessions (DBC2)', () => {
  it('returns stable session handles per deviceHandle', () => {
    expect(recorderSessionHandle('dev-a')).toBe('recorder:dev-a');
    expect(spectralAnalyserSessionHandle('dev-a')).toBe('analyser:dev-a');
  });

  it('append ignores invalid refs and accepts valid payload refs', () => {
    const session = new RefCollectorSession({
      deviceHandle: 'dev-1',
      sessionRefKind: 'RecorderRef',
      payloadKind: 'AudioSampleRef',
      sessionHandle: recorderSessionHandle('dev-1'),
    });

    expect(session.append(invalidateReference(createReferenceValue('AudioSampleRef', 's1')))).toBe(
      false,
    );
    expect(session.append(createReferenceValue('FftFrameRef', 'f1'))).toBe(false);
    expect(session.append(createReferenceValue('AudioSampleRef', 's1'))).toBe(true);
    expect(session.queueDepth).toBe(1);
  });

  it('flush clears queue and returns snapshot', () => {
    const session = new RefCollectorSession({
      deviceHandle: 'dev-1',
      sessionRefKind: 'SpectralAnalyserRef',
      payloadKind: 'FftFrameRef',
      sessionHandle: spectralAnalyserSessionHandle('dev-1'),
    });
    const frame = createReferenceValue('FftFrameRef', 'f1');
    session.append(frame);

    const snapshot = session.flush('2026-06-20T12:00:00.000Z');
    expect(snapshot.refs).toEqual([frame]);
    expect(snapshot.flushedAtIso).toBe('2026-06-20T12:00:00.000Z');
    expect(session.queueDepth).toBe(0);
  });

  it('multicast subscribe/unsubscribe tracks collect node ids', () => {
    const session = new RefCollectorSession({
      deviceHandle: 'dev-1',
      sessionRefKind: 'RecorderRef',
      payloadKind: 'AudioSampleRef',
      sessionHandle: recorderSessionHandle('dev-1'),
    });

    const unsubA = session.subscribe('collect-a');
    session.subscribe('collect-b');
    expect(session.subscriberIds).toEqual(expect.arrayContaining(['collect-a', 'collect-b']));

    unsubA();
    expect(session.subscriberIds).toEqual(['collect-b']);
  });

  it('registry reuses singleton sessions per deviceHandle', () => {
    const registry = createDeviceCollectorRegistry();
    const recorderA = registry.getOrCreateRecorder('dev-x');
    const recorderB = registry.getOrCreateRecorder('dev-x');
    expect(recorderA).toBe(recorderB);
    expect(registry.getRecorderSessionRef('dev-x')).toEqual(
      createReferenceValue('RecorderRef', recorderSessionHandle('dev-x')),
    );
  });

  it('registry append and flush routes to correct session kind', () => {
    const registry = createDeviceCollectorRegistry();
    const sample = createReferenceValue('AudioSampleRef', 'sample-1');
    const frame = createReferenceValue('FftFrameRef', 'frame-1');

    expect(registry.appendSample('dev-z', sample)).toBe(true);
    expect(registry.appendFrame('dev-z', frame)).toBe(true);

    const recorderFlush = registry.flushRecorder('dev-z');
    const analyserFlush = registry.flushSpectralAnalyser('dev-z');

    expect(recorderFlush?.refs).toEqual([sample]);
    expect(analyserFlush?.refs).toEqual([frame]);
  });

  it('resetDevice removes sessions', () => {
    const registry = createDeviceCollectorRegistry();
    registry.appendSample('dev-r', createReferenceValue('AudioSampleRef', 's'));
    registry.resetDevice('dev-r');
    expect(registry.flushRecorder('dev-r')).toBeNull();
    expect(registry.getOrCreateRecorder('dev-r').queueDepth).toBe(0);
  });
});

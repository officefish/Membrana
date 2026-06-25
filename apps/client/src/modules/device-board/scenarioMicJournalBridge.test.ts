import { describe, expect, it, vi } from 'vitest';
import { createReferenceValue, formatTrackRefHandle } from '@membrana/core';
import { AsyncJobStore } from '@membrana/device-board';

import { createScenarioMicJournalBridge } from './scenarioMicJournalBridge.js';

const mockStop = vi.fn(async () => ({
  blob: new Blob([new Uint8Array(100)], { type: 'audio/wav' }),
  durationSec: 0.5,
  sampleRate: 48_000,
  channels: 1 as const,
}));

vi.mock('@/plugins/mic-buffer-recorder/clipRecorder', () => ({
  startClipRecorder: vi.fn(() => ({
    stop: mockStop,
    cancel: vi.fn(),
  })),
}));

describe('scenarioMicJournalBridge collector sessions (DBC2)', () => {
  it('exposes stable recorder and analyser session refs per deviceHandle', () => {
    const bridge = createScenarioMicJournalBridge();
    expect(bridge.getRecorderSessionRef('dev-1')).toEqual(
      createReferenceValue('RecorderRef', 'recorder:dev-1'),
    );
    expect(bridge.getSpectralAnalyserSessionRef('dev-1')).toEqual(
      createReferenceValue('SpectralAnalyserRef', 'analyser:dev-1'),
    );
  });

  it('append and flush route samples and frames through registry', () => {
    const bridge = createScenarioMicJournalBridge();
    const sample = createReferenceValue('AudioSampleRef', 'sample-1');
    const frame = createReferenceValue('FftFrameRef', 'frame-1');

    expect(bridge.appendRecorderSample('dev-2', sample)).toBe(true);
    expect(bridge.appendSpectralAnalyserFrame('dev-2', frame)).toBe(true);
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-2')).toBe(1);
    expect(bridge.getCollectorQueueDepth('spectral-analyser', 'dev-2')).toBe(1);

    const recorderFlush = bridge.flushRecorderSession('dev-2');
    expect(recorderFlush?.refs).toEqual([sample]);
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-2')).toBe(0);
  });

  it('clears collector registry on stopAudioStreaming', async () => {
    const bridge = createScenarioMicJournalBridge();
    bridge.appendRecorderSample('dev-3', createReferenceValue('AudioSampleRef', 's1'));
    await bridge.stopAudioStreaming(null);
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-3')).toBe(0);
  });

  it('clears collector registry on resetCollectorSessions', () => {
    const bridge = createScenarioMicJournalBridge();
    bridge.appendRecorderSample('dev-4', createReferenceValue('AudioSampleRef', 's1'));
    bridge.resetCollectorSessions();
    expect(bridge.getCollectorQueueDepth('recorder', 'dev-4')).toBe(0);
  });

  it('stopRecorderRecording returns slice from clipRecorder when stream is active', async () => {
    const bridge = createScenarioMicJournalBridge();
    const streamRef = createReferenceValue('AudioStreamRef', 'stream:mic-test');
    const internal = bridge as unknown as {
      audioStreamValid: boolean;
      streamCaptureStream: MediaStream;
    };
    internal.audioStreamValid = true;
    internal.streamCaptureStream = { active: true } as MediaStream;

    expect(
      bridge.startRecorderRecording('dev-5', streamRef, { windowSec: 3, captureFormat: 'wav' }),
    ).toBe(true);

    const slice = await bridge.stopRecorderRecording('dev-5');
    expect(slice).not.toBeNull();
    expect(slice?.durationSec).toBeCloseTo(0.5, 2);
    expect(slice?.sampleRate).toBe(48_000);
    expect(slice?.captureFormat).toBe('wav');
    expect(mockStop).toHaveBeenCalled();
  });

  it('startRecorderRecording fails without active stream', () => {
    const bridge = createScenarioMicJournalBridge();
    const streamRef = createReferenceValue('AudioStreamRef', 'stream:mic-test');
    expect(
      bridge.startRecorderRecording('dev-6', streamRef, { windowSec: 5, captureFormat: 'wav' }),
    ).toBe(false);
  });
});

describe('scenarioMicJournalBridge async jobs (AP v1 R7)', () => {
  it('startAsyncJob track-upload rejects without track ref', async () => {
    const bridge = createScenarioMicJournalBridge();
    const store = new AsyncJobStore();
    const promiseId = 'job-missing-ref';
    store.register({
      promiseId,
      kind: 'track-upload',
      correlation: {
        runId: 'run-1',
        branch: 'main',
        nodeId: 'start-async',
        startedAtMs: Date.now(),
      },
    });

    await bridge.startAsyncJob({
      promiseId,
      kind: 'track-upload',
      correlation: {
        runId: 'run-1',
        branch: 'main',
        nodeId: 'start-async',
        startedAtMs: Date.now(),
      },
      trackRef: null,
      asyncJobStore: store,
    });

    expect(store.get(promiseId)?.state).toBe('rejected');
  });

  it('startAsyncJob track-upload rejects when pending payload missing', async () => {
    const bridge = createScenarioMicJournalBridge();
    const store = new AsyncJobStore();
    const promiseId = 'job-no-pending';
    const trackId = 'track-missing';
    store.register({
      promiseId,
      kind: 'track-upload',
      correlation: {
        runId: 'run-1',
        branch: 'main',
        nodeId: 'start-async',
        startedAtMs: Date.now(),
      },
    });

    await bridge.startAsyncJob({
      promiseId,
      kind: 'track-upload',
      correlation: {
        runId: 'run-1',
        branch: 'main',
        nodeId: 'start-async',
        startedAtMs: Date.now(),
      },
      trackRef: createReferenceValue('TrackRef', formatTrackRefHandle(trackId)),
      asyncJobStore: store,
    });

    expect(store.get(promiseId)?.state).toBe('rejected');
    expect(store.get(promiseId)?.errorMessage).toContain('pending-track-not-found');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReferenceValue, formatTrackRefHandle } from '@membrana/core';
import { AsyncJobStore } from '@membrana/device-board';

const mockCancel = vi.fn();
const mockStop = vi.fn(async () => ({
  blob: new Blob([new Uint8Array(100)], { type: 'audio/wav' }),
  durationSec: 0.5,
  sampleRate: 48_000,
  channels: 1 as const,
}));

vi.mock('@/plugins/mic-buffer-recorder/clipRecorder', () => ({
  startClipRecorder: vi.fn(() => ({ stop: mockStop, cancel: mockCancel })),
}));

import {
  resetDeviceOverflowHoldForTests,
  resetDeviceOverflowHoldWiringForTests,
  type DeviceOverflowHold,
  type OverflowWindowSignal,
} from '@/lib/device-overflow-hold';

import { createScenarioMicJournalBridge, type ScenarioMicJournalBridge } from './scenarioMicJournalBridge.js';

const MB = 1048576;
const REFUSAL = {
  reason: 'device_buffer_full',
  overflowId: 'ovf-board',
  overflowAt: '2026-09-05T21:40:18.000Z',
  overflowPolicy: 'stop' as const,
  buffer: { usedBytes: 1024 * MB, limitBytes: 1024 * MB },
  userStorage: null,
};
const POLICY = { windowSec: 3, captureFormat: 'wav' as const };

function armStream(bridge: ScenarioMicJournalBridge): void {
  const internal = bridge as unknown as { audioStreamValid: boolean; streamCaptureStream: MediaStream };
  internal.audioStreamValid = true;
  internal.streamCaptureStream = { active: true } as MediaStream;
}

/**
 * #2309, M3 (г): в доске сегодня проводки стопа по буферу не было (аудит M3). Теперь — адаптер
 * к ТОМУ ЖЕ носителю, что у микрофона: старт записи отбивается, активная запись гаснет,
 * отправка при удержании не делается (job честно отклонён, не ретрай), сценарий не убит.
 */
describe('scenarioMicJournalBridge — адаптер удержания доски', () => {
  let hold: DeviceOverflowHold;
  let signals: OverflowWindowSignal[];
  let bridge: ScenarioMicJournalBridge;

  beforeEach(() => {
    resetDeviceOverflowHoldWiringForTests();
    hold = resetDeviceOverflowHoldForTests();
    signals = [];
    hold.subscribeWindowSignal((s) => signals.push(s));
    mockCancel.mockClear();
    mockStop.mockClear();
    bridge = createScenarioMicJournalBridge();
    armStream(bridge);
  });

  afterEach(() => {
    bridge.disposeOverflowHoldAdapter();
    resetDeviceOverflowHoldWiringForTests();
  });

  it('при удержании startRecorderRecording отбит с сигналом окна; без удержания — идёт', () => {
    const streamRef = createReferenceValue('AudioStreamRef', 'stream:mic-test');
    expect(bridge.startRecorderRecording('dev-1', streamRef, POLICY)).toBe(true);
    expect(mockCancel).not.toHaveBeenCalled();

    hold.activateFromServer(REFUSAL);
    // Вход в удержание гасит активную запись доски.
    expect(mockCancel).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 3; i += 1) {
      expect(bridge.startRecorderRecording('dev-1', streamRef, POLICY)).toBe(false);
    }
    expect(signals.map((s) => s.cause)).toEqual(['entered', 'start-refused', 'start-refused', 'start-refused']);
    expect(signals[1]?.attempt?.source).toBe('board');
  });

  it('отправка при удержании = 0: job track-upload отклонён с reason overflow-hold, importBlob не зовётся', async () => {
    const streamRef = createReferenceValue('AudioStreamRef', 'stream:mic-test');
    expect(bridge.startRecorderRecording('dev-2', streamRef, POLICY)).toBe(true);
    const slice = await bridge.stopRecorderRecording('dev-2');
    expect(slice).not.toBeNull();

    // Отказ пришёл, пока срез ещё не отдан в отправку.
    hold.activateFromServer(REFUSAL);

    const sliceRef = createReferenceValue('RecordingSliceRef', slice!.handle);
    const track = await bridge.createTrackFromRecordingSliceRef('node-1', sliceRef);
    expect(track).not.toBeNull();

    const resolved: string[] = [];
    const rejected: string[] = [];
    await bridge.startAsyncJob({
      promiseId: 'job-1',
      kind: 'track-upload',
      correlation: { nodeId: 'node-1', tick: 1 } as never,
      trackRef: createReferenceValue('TrackRef', formatTrackRefHandle(track!.trackId)),
      asyncJobStore: {
        resolve: (id: string) => {
          resolved.push(id);
        },
        reject: (_id: string, reason: string) => {
          rejected.push(reason);
        },
      } as unknown as AsyncJobStore,
    });

    expect(rejected).toEqual(['overflow-hold']);
    expect(resolved).toEqual([]);
    const internal = bridge as unknown as { pendingTrackUploads: Map<string, unknown> };
    expect(internal.pendingTrackUploads.size).toBe(0);
    // Сценарий жив: детекция/наблюдение доски не остановлены носителем — у бриджа нет kill-пути.
    expect(hold.isHeld()).toBe(true);
  });

  it('вход в удержание сбрасывает недоставленные пробы — ретраев в закрытую дверь нет', async () => {
    const streamRef = createReferenceValue('AudioStreamRef', 'stream:mic-test');
    bridge.startRecorderRecording('dev-3', streamRef, POLICY);
    const slice = await bridge.stopRecorderRecording('dev-3');
    await bridge.createTrackFromRecordingSliceRef('node-3', createReferenceValue('RecordingSliceRef', slice!.handle));
    const internal = bridge as unknown as { pendingTrackUploads: Map<string, unknown> };
    expect(internal.pendingTrackUploads.size).toBe(1);

    hold.activateFromServer(REFUSAL);

    expect(internal.pendingTrackUploads.size).toBe(0);
  });

  it('удержание переживает пересоздание бриджа (рестарт сценария): новый бридж отбивает старт', () => {
    hold.activateFromServer(REFUSAL);
    bridge.disposeOverflowHoldAdapter();
    bridge = createScenarioMicJournalBridge();
    armStream(bridge);
    expect(bridge.startRecorderRecording('dev-4', createReferenceValue('AudioStreamRef', 'stream:x'), POLICY)).toBe(false);
    expect(signals.at(-1)?.cause).toBe('start-refused');
  });
});

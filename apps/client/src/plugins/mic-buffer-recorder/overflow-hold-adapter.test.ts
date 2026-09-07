import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/mediaLibraryHubBridge', () => ({
  publishMediaLibraryQuotaFromService: vi.fn(),
}));

const mockCancel = vi.fn();
const mockStop = vi.fn(async () => ({
  blob: new Blob([new Uint8Array(10)], { type: 'audio/wav' }),
  durationSec: 1,
  sampleRate: 48_000,
  channels: 1 as const,
}));

vi.mock('./clipRecorder', () => ({
  startClipRecorder: vi.fn(() => ({ stop: mockStop, cancel: mockCancel })),
}));

import type { ModuleContext } from '@membrana/agenda';

import {
  publishMediaLibraryBufferCleared,
  publishMediaLibraryQuotaUpdated,
  resetMediaLibraryHubForTests,
  subscribeMediaLibraryCaptureCancel,
  subscribeMediaLibraryCaptureStart,
  subscribeMediaLibraryCaptureStop,
} from '../../lib/mediaLibraryHub';
import { resetBufferPolicyBridgeForTests, setBufferPolicySourceForTests } from '../../lib/buffer-policy-bridge';
import {
  resetDeviceOverflowHoldForTests,
  resetDeviceOverflowHoldWiringForTests,
  type DeviceOverflowHold,
  type OverflowWindowSignal,
} from '../../lib/device-overflow-hold';
import {
  publishMicrophoneStream,
  resetMicrophoneStreamHubForTests,
} from '../../modules/microphone/microphoneStreamHub';

import { createMicBufferRecorderPlugin } from './micBufferRecorderPlugin';
import { micBufferRecorderPluginState, requestStartManualRecording } from './micBufferRecorderPluginState';
import type { MicBufferRecorderPluginConfig } from './types';

const MB = 1048576;
const MODULE_ID = 'mic-mod';

const REFUSAL = {
  reason: 'device_buffer_full',
  overflowId: 'ovf-1',
  overflowAt: '2026-09-05T21:40:18.000Z',
  overflowPolicy: 'stop' as const,
  buffer: { usedBytes: 1024 * MB, limitBytes: 1024 * MB },
  userStorage: null,
};

function fakeStream(): MediaStream {
  return { getAudioTracks: () => [{ kind: 'audio' }] } as unknown as MediaStream;
}

function quota(usedBytes: number, limitBytes: number) {
  return {
    usedBytes,
    limitBytes,
    sampleCount: 0,
    maxBufferSamples: 100,
    recordingBlocked: false,
    storageMode: 'server' as const,
    serverReachable: true,
  };
}

/**
 * Эффективная политика через мост B↔C (адаптер BC-1): источник — сырой `/quota` с полем
 * `bufferPolicy`; читатель B разбирает его сам, стаба политики больше нет.
 */
async function serverPolicy(mode: 'stop' | 'smart_cleanup'): Promise<void> {
  const bufferPolicy =
    mode === 'stop'
      ? { mode, params: null }
      : { mode, params: { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true } };
  await setBufferPolicySourceForTests(async () => ({ bufferPolicy }));
}

function installPlugin(): () => Promise<void> {
  const plugin = createMicBufferRecorderPlugin();
  const teardown = plugin.install({ moduleId: MODULE_ID } as unknown as ModuleContext<MicBufferRecorderPluginConfig>);
  return () => Promise.resolve(teardown?.() as Promise<void> | void).then(() => undefined);
}

/**
 * #2309, M3: плагин микрофона — тонкий адаптер к носителю. Проверяется поведение, не строки:
 * при удержании и `stop` нет ни старта, ни отправки (capture.stop не публикуется →
 * импорт → POST не случается), активная запись гаснет отменой, повторный старт отбит с
 * сигналом окна, удержание переживает teardown/install плагина.
 */
describe('mic-buffer-recorder — адаптер удержания', () => {
  let hold: DeviceOverflowHold;
  let signals: OverflowWindowSignal[];
  let starts: number;
  let stops: number;
  let cancels: string[];
  let teardown: () => Promise<void>;

  beforeEach(async () => {
    vi.useFakeTimers();
    resetMediaLibraryHubForTests();
    resetMicrophoneStreamHubForTests();
    resetDeviceOverflowHoldWiringForTests();
    resetBufferPolicyBridgeForTests();
    await serverPolicy('stop');
    micBufferRecorderPluginState.reset();
    mockCancel.mockClear();
    hold = resetDeviceOverflowHoldForTests();
    signals = [];
    starts = 0;
    stops = 0;
    cancels = [];
    hold.subscribeWindowSignal((s) => signals.push(s));
    subscribeMediaLibraryCaptureStart(() => {
      starts += 1;
    });
    subscribeMediaLibraryCaptureStop(() => {
      stops += 1;
    });
    subscribeMediaLibraryCaptureCancel((p) => cancels.push(p.reason));
    teardown = installPlugin();
    publishMicrophoneStream(MODULE_ID, fakeStream());
  });

  afterEach(async () => {
    await teardown();
    resetDeviceOverflowHoldWiringForTests();
    vi.useRealTimers();
  });

  it('без удержания старт идёт; вход в удержание гасит активную запись отменой, без отправки', () => {
    requestStartManualRecording();
    expect(starts).toBe(1);
    expect(micBufferRecorderPluginState.getSnapshot().isRecording).toBe(true);

    hold.activateFromServer(REFUSAL);

    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(cancels).toEqual(['overflow-hold']);
    expect(stops).toBe(0);
    expect(micBufferRecorderPluginState.getSnapshot().isRecording).toBe(false);
    expect(micBufferRecorderPluginState.getSnapshot().error).toMatch(/буфер полон/u);
    expect(micBufferRecorderPluginState.getSnapshot().error).toContain('ovf-1');
  });

  it('при удержании старт отбивается тем же фактом: 0 стартов, сигнал окна на каждую попытку (T5)', () => {
    hold.activateFromServer(REFUSAL);
    for (let i = 0; i < 5; i += 1) requestStartManualRecording();

    expect(starts).toBe(0);
    expect(stops).toBe(0);
    expect(signals.map((s) => s.cause)).toEqual(['entered', ...Array<string>(5).fill('start-refused')]);
    expect(signals.every((s) => s.overflowId === 'ovf-1')).toBe(true);
    // Таймеры сегментов не крутятся: ретраев в закрытую дверь нет.
    vi.advanceTimersByTime(60_000);
    expect(starts).toBe(0);
  });

  it('локальный страж: квота выше порога при политике stop → удержание без id, запись гаснет', () => {
    requestStartManualRecording();
    expect(starts).toBe(1);

    publishMediaLibraryQuotaUpdated(quota(1000 * MB, 1024 * MB));

    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.source).toBe('local');
    expect(cancels).toEqual(['overflow-hold']);
    expect(stops).toBe(0);

    // Повышение до серверного id — без второго сигнала и без второго гашения.
    hold.activateFromServer(REFUSAL);
    expect(signals.filter((s) => s.cause === 'entered')).toHaveLength(1);
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  // #2318 (долг D-1, гейт до T12): умная очистка с сервера до плагина не доходит — читатель B
  // гасит её fail-closed на stop, зеркало панели показывает stop, страж держит. Код плагина не
  // менялся (зона блока C); перевёрнуты только ожидания — они утверждали ровно ту дыру, которую
  // гейт закрывает. Порча: снять fail-closed в читателе → зеркало покажет smart_cleanup → красный.
  it('smart_cleanup от сервера при закрытом гейте: зеркало панели — stop, локальный страж держит (читатель B через мост)', async () => {
    await serverPolicy('smart_cleanup');
    expect(micBufferRecorderPluginState.getSnapshot().bufferPolicy).toBe('stop');
    publishMediaLibraryQuotaUpdated(quota(1024 * MB, 1024 * MB));
    expect(hold.isHeld()).toBe(true);
  });

  it('зеркало: слово панели — от читателя B; дыра синка → stop и страж снова судит', async () => {
    await serverPolicy('stop');
    expect(micBufferRecorderPluginState.getSnapshot().bufferPolicy).toBe('stop');
    await setBufferPolicySourceForTests(async () => {
      throw new Error('media unreachable');
    });
    expect(micBufferRecorderPluginState.getSnapshot().bufferPolicy).toBe('stop');
    publishMediaLibraryQuotaUpdated(quota(1024 * MB, 1024 * MB));
    expect(hold.isHeld()).toBe(true);
  });

  it('удержание переживает рестарт плагина: после teardown/install старт всё так же отбит', async () => {
    hold.activateFromServer(REFUSAL);
    await teardown();
    teardown = installPlugin();
    publishMicrophoneStream(MODULE_ID, fakeStream());

    expect(micBufferRecorderPluginState.getSnapshot().error).toMatch(/буфер полон/u);
    requestStartManualRecording();
    expect(starts).toBe(0);
    expect(signals.at(-1)?.cause).toBe('start-refused');
  });

  it('освобождение места не возобновляет; очистка буфера снимает удержание — старт снова идёт', () => {
    hold.activateFromServer(REFUSAL);
    publishMediaLibraryQuotaUpdated(quota(0, 1024 * MB));
    requestStartManualRecording();
    expect(starts).toBe(0);

    publishMediaLibraryBufferCleared();

    expect(hold.isHeld()).toBe(false);
    expect(micBufferRecorderPluginState.getSnapshot().error).toBeNull();
    requestStartManualRecording();
    expect(starts).toBe(1);
  });
});

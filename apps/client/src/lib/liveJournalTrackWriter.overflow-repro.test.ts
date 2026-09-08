import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nodeRealtimeUrl', () => ({
  getCabinetRealtimeWsUrl: () => 'ws://localhost:3020/v1/nodes/realtime',
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  configureDefaultLiveJournalService,
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import { getNodeRealtimeClient, resetNodeRealtimeClientForTests } from '@/lib/nodeRealtimeClient';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { micBufferRecorderPluginState } from '@/plugins/mic-buffer-recorder/micBufferRecorderPluginState';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

import { appendLiveJournalTrackFromSampleImport } from './liveJournalTrackWriter';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, Array<(e: unknown) => void>> = {};
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }
  addEventListener(type: string, handler: (e: unknown) => void): void {
    (this.listeners[type] ??= []).push(handler);
  }
  emitOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    (this.listeners.open ?? []).forEach((h) => h({}));
  }
  close(): void {
    this.readyState = MockWebSocket.CLOSED;
  }
  send(raw: string): void {
    this.sent.push(raw);
  }
}

const pairing: PairedNodeCredentials = {
  token: 'tok-1',
  expiresAt: '2026-12-31T00:00:00.000Z',
  deviceId: 'dev-1',
  mediaToken: 'mtok',
  mediaApiUrl: 'http://localhost:3010',
  membraneId: 'm1',
  nodeId: 'n1',
  nodeLabel: 'node',
};

const HERE = fileURLToPath(new URL('./', import.meta.url));

/**
 * ВЕЩДОК (2) вердикта M4 (г), #2309 — репродукция гипотезы №1 ночного обрыва 05→06.09:
 * производитель `telemetry-track/v1` привязан к импорту клипа микрофона, а не к сердцебиению
 * узла. «Стоп записи без переполнения → телеметрии нет при живом heartbeat» — и это НЕ смерть
 * узла. Зуб фиксирует факт кодом: heartbeat идёт, импортов нет — строк трека ноль.
 *
 * Развязка по вердикту: молчание T после стопа законно; факт «остановлен: буфер полон» несёт
 * `runtime.state.overflowHold`, а не телеметрия. Пост-стоп режим трека не строится.
 */
describe('репро гипотезы обрыва: стоп записи без переполнения → telemetry-track/v1 молчит при живом heartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval });
    resetNodeRealtimeClientForTests();
    resetDefaultLiveJournalServiceForTests();
  });

  afterEach(() => {
    resetDefaultLiveJournalServiceForTests();
    micBufferRecorderPluginState.reset();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('вещдок (1) кодом: единственный производитель трека — импорт клипа, подписки на heartbeat нет', () => {
    const writer = readFileSync(join(HERE, 'liveJournalTrackWriter.ts'), 'utf8');
    const bridge = readFileSync(join(HERE, 'mediaLibraryHubBridge.ts'), 'utf8');
    expect(writer).toContain('export async function appendLiveJournalTrackFromSampleImport');
    expect(writer).not.toMatch(/heartbeat|setInterval|nodeRealtimeClient/u);
    // Единственный вызов — из пути импорта клипа (handleCaptureStop).
    expect(bridge).toContain('await appendLiveJournalTrackFromSampleImport(importedPayload)');
  });

  it('вещдок (2): 30 минут живого heartbeat без импорта клипов → 0 строк telemetry-track/v1', async () => {
    const backend = createMemoryJournalStorageBackend();
    const service = configureDefaultLiveJournalService(backend);
    await service.init();
    micBufferRecorderPluginState.setStreamLive(true); // поток микрофона жив — гейт TJ3 открыт

    const client = getNodeRealtimeClient();
    client.connectNode(pairing);
    const socket = MockWebSocket.instances[0]!;
    socket.emitOpen();

    // «Стоп записи без переполнения»: сегменты не пишутся, импорта нет — просто тишина 30 минут.
    vi.advanceTimersByTime(30 * 60_000);

    const heartbeats = socket.sent.map((raw) => JSON.parse(raw)).filter((e) => e.type === 'presence.heartbeat');
    expect(heartbeats.length).toBe(1 + 15);
    expect(client.getState()).toBe('connected');
    expect(getDefaultLiveJournalService().getSnapshot().items.filter((i) => i.kind === 'track')).toHaveLength(0);
  });

  it('контроль: один импорт клипа при том же живом heartbeat → ровно одна строка трека', async () => {
    const backend = createMemoryJournalStorageBackend();
    const service = configureDefaultLiveJournalService(backend);
    await service.init();
    micBufferRecorderPluginState.setStreamLive(true);

    await appendLiveJournalTrackFromSampleImport({
      sampleId: 'sample-x',
      moduleId: 'mic-mod',
      sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
      captureMode: 'auto',
      reason: 'auto',
      title: 'mic-auto-5s',
      durationSec: 5,
      sampleRate: 48_000,
    });

    expect(getDefaultLiveJournalService().getSnapshot().items.filter((i) => i.kind === 'track')).toHaveLength(1);
  });
});

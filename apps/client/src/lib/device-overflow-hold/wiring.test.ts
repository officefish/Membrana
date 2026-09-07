import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUFFER_COLLECTION_ID, createServerStorageBackend } from '@membrana/media-library-service';
import { BUFFER_OVERFLOW_REASONS, OVERFLOW_POLICIES, isBufferOverflowRefusal } from '@membrana/plugin-contracts';

import { publishMediaLibraryBufferCleared, resetMediaLibraryHubForTests } from '@/lib/mediaLibraryHub';

import { resetDeviceOverflowHoldForTests } from './deviceOverflowHold';
import type { DeviceOverflowHold, OverflowWindowSignal } from './types';
import { installDeviceOverflowHoldWiring, resetDeviceOverflowHoldWiringForTests } from './wiring';

/**
 * Фикстура ответа отказа блока A — по словарю `@membrana/plugin-contracts` (A-3): форма
 * сверяется импортированным предикатом ниже, чтобы фикстура не разошлась с контрактом.
 */
const REFUSAL_BODY = {
  ok: false,
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  buffer: { usedBytes: 1_073_741_824, limitBytes: 1_073_741_824 },
  userStorage: { usedBytes: 10, limitBytes: 5_000_000_000 },
  overflowPolicy: OVERFLOW_POLICIES.STOP,
  overflowId: 'ovf-night',
  overflowAt: '2026-09-05T21:40:18.000Z',
};

if (!isBufferOverflowRefusal(REFUSAL_BODY)) {
  throw new Error('фикстура отказа разошлась со словарём A — тест судил бы не контракт');
}

const META = {
  title: 'mic-auto',
  class: 'unlabeled',
  label: 'unlabeled' as const,
  source: 'mic-recording' as const,
  durationSec: 5,
  sampleRate: 48_000,
  channels: 1 as const,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

async function swallow(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? 'ERR';
  }
}

describe('проводка носителя к пути отправки (#2309, M3 DoD 1/3)', () => {
  let hold: DeviceOverflowHold;
  let signals: OverflowWindowSignal[];

  beforeEach(() => {
    resetMediaLibraryHubForTests();
    resetDeviceOverflowHoldWiringForTests();
    hold = resetDeviceOverflowHoldForTests();
    signals = [];
    hold.subscribeWindowSignal((s) => signals.push(s));
    installDeviceOverflowHoldWiring(hold);
  });

  afterEach(() => {
    resetDeviceOverflowHoldWiringForTests();
    vi.unstubAllGlobals();
  });

  it('отказ сервера на путь отправки → удержание с overflowId; 100 отказов → один сигнал; POST после удержания = 0', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(REFUSAL_BODY));
    vi.stubGlobal('fetch', fetchMock);
    const backend = createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd1', mediaToken: 't' });

    const first = await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(first).toBe('SAMPLE_REFUSED');
    expect(hold.isHeld()).toBe(true);
    expect(hold.getEpisode()?.overflowId).toBe('ovf-night');
    expect(hold.getEpisode()?.overflowAt).toBe(REFUSAL_BODY.overflowAt);

    // Ночь 05→06.09 повторяется 99 раз — но теперь дверь закрыта ДО сети.
    const codes = new Set<string | null>();
    for (let i = 0; i < 99; i += 1) {
      codes.add(await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META)));
    }

    expect([...codes]).toEqual(['UPLOAD_HELD']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.overflowId).toBe('ovf-night');
  });

  it('отказ с чужой причиной (не из словаря) или без эпизода удержания не открывает', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: false, reason: 'tariff_frozen', overflowId: 'x', overflowAt: REFUSAL_BODY.overflowAt })));
    const backend = createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd1', mediaToken: 't' });
    await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(hold.isHeld()).toBe(false);

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: false, reason: 'device_buffer_full' })));
    await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(hold.isHeld()).toBe(false);
    expect(signals).toHaveLength(0);
  });

  /*
    Интеграция (A-3): полноту отказа судит импортированный `isBufferOverflowRefusal` словаря A —
    отказ без `overflowPolicy` не по форме M2 и удержания «по серверу» не открывает (как чужая
    причина или отказ без эпизода). До интеграции стаб C подставлял `stop` на дыру; теперь
    fail-closed на дыре — норма политики B (`effective(⊥) = stop`), а не отказа A.
  */
  it('политика в отказе: дыра → отказ не по форме словаря, удержания нет; smart_cleanup — как есть', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...REFUSAL_BODY, overflowPolicy: undefined })));
    const backend = createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd1', mediaToken: 't' });
    expect(await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META))).toBe('SAMPLE_REFUSED');
    expect(hold.getEpisode()).toBeNull();
    expect(signals).toHaveLength(0);

    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...REFUSAL_BODY, overflowId: 'ovf-2', overflowPolicy: OVERFLOW_POLICIES.SMART_CLEANUP })));
    await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(hold.getEpisode()?.policy).toBe('smart_cleanup');
    expect(hold.isHeld()).toBe(false);
  });

  it('очистка буфера снимает удержание (release cleanup); после — отправка идёт в сеть', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(REFUSAL_BODY));
    vi.stubGlobal('fetch', fetchMock);
    const backend = createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd1', mediaToken: 't' });
    await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(hold.isHeld()).toBe(true);

    publishMediaLibraryBufferCleared();

    expect(hold.isHeld()).toBe(false);
    await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('проводка идемпотентна: повторная установка не удваивает активацию', async () => {
    installDeviceOverflowHoldWiring(hold);
    installDeviceOverflowHoldWiring(hold);
    const changes = vi.fn();
    hold.subscribe(changes);
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(REFUSAL_BODY)));
    const backend = createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd1', mediaToken: 't' });
    await swallow(backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(changes).toHaveBeenCalledTimes(1);
  });
});

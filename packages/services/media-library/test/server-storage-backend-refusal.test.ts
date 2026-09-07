/**
 * #2309 (блок C коворка `cowork-buffer-full-stop`, M2→M3): путь отправки разбирает доменный
 * отказ сервера записей `200 {ok:false, reason, …}` вместо прежнего `413 → QUOTA_EXCEEDED`,
 * объявляет отказ слушателям (носитель удержания на приборе) и уважает шлюз отправки:
 * при удержании POST не делается вовсе.
 *
 * Форма ответа — стаб контракта блока A (поля даны заседанием). На интеграции тело ответа
 * в фикстуре сверяется со словарём A; сам бэкенд словаря не знает — он транспорт.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@membrana/core';

import { BUFFER_COLLECTION_ID } from '../src/constants.js';
import {
  ServerStorageBackend,
  createServerStorageBackend,
  parseSampleRefusal,
  type SampleRefusal,
} from '../src/backends/server-storage-backend.js';

const BASE = 'https://media.test';
const DEVICE = 'device-1';
const TOKEN = 'token-abc';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Стаб ответа отказа блока A — поля по заседанию M2; умирает на интеграции. */
const REFUSAL_STUB = {
  ok: false,
  reason: 'device_buffer_full',
  buffer: { usedBytes: 1_073_741_824, limitBytes: 1_073_741_824 },
  userStorage: { usedBytes: 10, limitBytes: 5_000_000_000 },
  overflowPolicy: 'stop',
  overflowId: 'ovf-2026-09-05-2140',
  overflowAt: '2026-09-05T21:40:18.000Z',
} as const;

const META = {
  title: 'mic-auto',
  class: 'unlabeled',
  label: 'unlabeled' as const,
  source: 'mic-recording' as const,
  durationSec: 5,
  sampleRate: 48_000,
  channels: 1 as const,
};

function backend() {
  return createServerStorageBackend({ baseUrl: BASE, deviceId: DEVICE, mediaToken: TOKEN });
}

async function rejection(promise: Promise<unknown>): Promise<DomainError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof DomainError) return err;
    throw err;
  }
  throw new Error('ожидался отказ, а промис разрешился');
}

describe('ServerStorageBackend — доменный отказ на POST пробы (#2309)', () => {
  afterEach(() => {
    ServerStorageBackend.resetSampleRefusalWiringForTests();
    vi.unstubAllGlobals();
  });

  it('200 {ok:false, reason} → SAMPLE_REFUSED с разобранным отказом в cause, слушатель извещён', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(REFUSAL_STUB));
    vi.stubGlobal('fetch', fetchMock);
    const heard: SampleRefusal[] = [];
    ServerStorageBackend.onSampleRefusal((r) => heard.push(r));

    const err = await rejection(backend().putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));

    expect(err.code).toBe('SAMPLE_REFUSED');
    const refusal = err.cause as SampleRefusal;
    expect(refusal.reason).toBe('device_buffer_full');
    expect(refusal.overflowId).toBe(REFUSAL_STUB.overflowId);
    expect(refusal.overflowAt).toBe(REFUSAL_STUB.overflowAt);
    expect(refusal.overflowPolicy).toBe('stop');
    expect(refusal.buffer).toEqual(REFUSAL_STUB.buffer);
    expect(refusal.userStorage).toEqual(REFUSAL_STUB.userStorage);
    expect(heard).toHaveLength(1);
    expect(heard[0]).toBe(refusal);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('второй литерал словаря различим: user_storage_full доезжает как есть', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ...REFUSAL_STUB, reason: 'user_storage_full' })));
    const err = await rejection(backend().putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect((err.cause as SampleRefusal).reason).toBe('user_storage_full');
  });

  it('413 больше не значит «квота»: код PAYLOAD_TOO_LARGE, слушатель отказа молчит', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'too big' }, 413)));
    const heard: SampleRefusal[] = [];
    ServerStorageBackend.onSampleRefusal((r) => heard.push(r));

    const err = await rejection(backend().putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));

    expect(err.code).toBe('PAYLOAD_TOO_LARGE');
    expect(err.code).not.toBe('QUOTA_EXCEEDED');
    expect(heard).toHaveLength(0);
  });

  it('обычный ответ с пробой не считается отказом', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          id: 's-1',
          collectionId: BUFFER_COLLECTION_ID,
          title: 'mic-auto',
          class: 'unlabeled',
          label: 'unlabeled',
          source: 'mic-recording',
          durationSec: 5,
          sampleRate: 48_000,
          channels: 1,
          createdAt: '2026-09-06T00:00:00.000Z',
          storageRef: 'ref',
          sizeBytes: 100,
        }),
      ),
    );
    const heard: SampleRefusal[] = [];
    ServerStorageBackend.onSampleRefusal((r) => heard.push(r));
    const sample = await backend().putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META);
    expect(sample.id).toBe('s-1');
    expect(heard).toHaveLength(0);
  });

  it('шлюз отправки: при удержании putSample не делает ни одного fetch (порча: ретрай → красный)', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(REFUSAL_STUB));
    vi.stubGlobal('fetch', fetchMock);
    ServerStorageBackend.setSampleUploadGate(() => true);

    const b = backend();
    for (let i = 0; i < 100; i += 1) {
      const err = await rejection(b.putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
      expect(err.code).toBe('UPLOAD_HELD');
    }

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('шлюз снят → отправка идёт штатно', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(REFUSAL_STUB));
    vi.stubGlobal('fetch', fetchMock);
    ServerStorageBackend.setSampleUploadGate(() => false);
    await rejection(backend().putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('слушатель, бросивший исключение, не ломает путь отправки', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(REFUSAL_STUB)));
    ServerStorageBackend.onSampleRefusal(() => {
      throw new Error('boom');
    });
    const err = await rejection(backend().putSample(BUFFER_COLLECTION_ID, new Blob(['x']), META));
    expect(err.code).toBe('SAMPLE_REFUSED');
  });
});

describe('parseSampleRefusal — только {ok:false, reason:string} есть отказ', () => {
  it('полный отказ разбирается со всеми полями', () => {
    const r = parseSampleRefusal(REFUSAL_STUB);
    expect(r).not.toBeNull();
    expect(r?.overflowId).toBe(REFUSAL_STUB.overflowId);
    expect(r?.raw).toBe(REFUSAL_STUB);
  });

  it('отказ без осей и без эпизода — всё равно отказ, поля null', () => {
    const r = parseSampleRefusal({ ok: false, reason: 'user_storage_full' });
    expect(r).toEqual({
      reason: 'user_storage_full',
      overflowId: null,
      overflowAt: null,
      overflowPolicy: null,
      buffer: null,
      userStorage: null,
      raw: { ok: false, reason: 'user_storage_full' },
    });
  });

  it('порча: ok:true, пустая причина, не объект → null', () => {
    expect(parseSampleRefusal({ ok: true, reason: 'device_buffer_full' })).toBeNull();
    expect(parseSampleRefusal({ ok: false, reason: '' })).toBeNull();
    expect(parseSampleRefusal({ ok: false })).toBeNull();
    expect(parseSampleRefusal('nope')).toBeNull();
    expect(parseSampleRefusal(null)).toBeNull();
  });

  it('порча осей: кривые байты → ось null, отказ остаётся', () => {
    const r = parseSampleRefusal({ ok: false, reason: 'device_buffer_full', buffer: { usedBytes: 'x' } });
    expect(r?.buffer).toBeNull();
  });
});

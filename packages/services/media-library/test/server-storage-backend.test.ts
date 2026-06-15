import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUFFER_COLLECTION_ID } from '../src/constants.js';
import { createServerStorageBackend } from '../src/backends/server-storage-backend.js';

const BASE = 'https://media.test';
const DEVICE = 'device-1';
const TOKEN = 'token-abc';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ServerStorageBackend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads quota and collections from media API', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = String(url);
      if (path.endsWith('/quota') && init?.method === undefined) {
        return jsonResponse({
          userStorage: { usedBytes: 1000, limitBytes: 1_000_000, backend: 'server' },
          buffer: { usedBytes: 200, limitBytes: 500_000, backend: 'server' },
          dataset: { catalogId: 'free-v1-catalog', sampleCount: 120 },
        });
      }
      if (path.endsWith('/collections') && init?.method === undefined) {
        return jsonResponse([
          {
            id: BUFFER_COLLECTION_ID,
            name: 'Buffer',
            kind: 'buffer',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            sampleCount: 3,
          },
        ]);
      }
      if (path.endsWith('/collections/ensure-reserved') && init?.method === 'POST') {
        return jsonResponse([]);
      }
      throw new Error(`Unexpected fetch: ${path} ${init?.method ?? 'GET'}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const backend = createServerStorageBackend({
      baseUrl: BASE,
      deviceId: DEVICE,
      mediaToken: TOKEN,
    });

    await backend.ensureReservedCollections();
    const quota = await backend.getQuota();
    const collections = await backend.listCollections();

    expect(quota).toMatchObject({
      usedBytes: 1000,
      limitBytes: 1_000_000,
      backend: 'server',
      serverReachable: true,
      bufferUsedBytes: 200,
      bufferLimitBytes: 500_000,
    });
    expect(collections[0]?.id).toBe(BUFFER_COLLECTION_ID);
    expect(collections[0]?.sampleCount).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/v1/devices/${DEVICE}/quota`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
  });

  it('uploads sample via multipart POST', async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = String(url);
      if (path.endsWith('/samples') && init?.method === 'POST') {
        expect(init.body).toBeInstanceOf(FormData);
        return jsonResponse(
          {
            id: 'sample-1',
            collectionId: BUFFER_COLLECTION_ID,
            title: 'clip',
            class: 'unclassified',
            label: 'unlabeled',
            source: 'mic-recording',
            durationSec: 1,
            sampleRate: 48_000,
            channels: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            storageRef: 'sample-1.wav',
            sizeBytes: 42,
          },
          201,
        );
      }
      throw new Error(`Unexpected fetch: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const backend = createServerStorageBackend({
      baseUrl: BASE,
      deviceId: DEVICE,
      mediaToken: TOKEN,
    });

    const sample = await backend.putSample(BUFFER_COLLECTION_ID, new Blob(['x'], { type: 'audio/wav' }), {
      title: 'clip',
      class: 'unclassified',
      label: 'unlabeled',
      source: 'mic-recording',
      durationSec: 1,
      sampleRate: 48_000,
      channels: 1,
    });

    expect(sample.id).toBe('sample-1');
    expect(sample.source).toBe('mic-recording');
  });
});

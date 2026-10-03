import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BUFFER_COLLECTION_ID, TARIFF_DATASET_COLLECTION_ID } from './constants';
import { MediaLibraryFsStore } from './media-library-fs';

describe('MediaLibraryFsStore', () => {
  let tmpDir: string;
  let store: MediaLibraryFsStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'membrana-ml-'));
    store = new MediaLibraryFsStore(tmpDir, 1024 * 1024);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates reserved collections and persists manifest', async () => {
    await store.ensureReservedCollections();
    const collections = await store.listCollections();
    expect(collections.some((c) => c.id === BUFFER_COLLECTION_ID)).toBe(true);

    const store2 = new MediaLibraryFsStore(tmpDir, 1024 * 1024);
    const again = await store2.listCollections();
    expect(again.some((c) => c.id === BUFFER_COLLECTION_ID)).toBe(true);
  });

  it('#2561: системный набор назван без идентификатора тарифа', async () => {
    await store.ensureReservedCollections();
    const collections = await store.listCollections();
    const tariff = collections.find((c) => c.id === TARIFF_DATASET_COLLECTION_ID);
    expect(tariff?.name).toBe('Базовый набор');
    expect(tariff?.name).not.toMatch(/free-v1|checkpoint-v1|observatory-v1/);
  });

  it('#2561: заводское имя «Базовый набор (free-v1)» в старом манифесте переименовывается один раз', async () => {
    await store.ensureReservedCollections();
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      collections: Record<string, { name: string; updatedAt: string }>;
    };
    manifest.collections[TARIFF_DATASET_COLLECTION_ID].name = 'Базовый набор (free-v1)';
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf8');

    const store2 = new MediaLibraryFsStore(tmpDir, 1024 * 1024);
    await store2.ensureReservedCollections();
    const renamed = JSON.parse(await readFile(manifestPath, 'utf8')) as typeof manifest;
    expect(renamed.collections[TARIFF_DATASET_COLLECTION_ID].name).toBe('Базовый набор');

    // Идемпотентность: третий магазин ничего не меняет на диске.
    const before = await readFile(manifestPath, 'utf8');
    const store3 = new MediaLibraryFsStore(tmpDir, 1024 * 1024);
    await store3.ensureReservedCollections();
    expect(await readFile(manifestPath, 'utf8')).toBe(before);
  });

  it('putSample round-trips blob on disk', async () => {
    await store.ensureReservedCollections();
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const sample = await store.putSample(BUFFER_COLLECTION_ID, payload, {
      title: 'test',
      class: 'test',
      label: 'unlabeled',
      source: 'mic-recording',
      durationSec: 1,
      sampleRate: 48000,
    });

    const blob = await store.readBlob(sample.id);
    expect(Buffer.from(blob)).toEqual(Buffer.from(payload));

    const manifestRaw = await readFile(path.join(tmpDir, 'manifest.json'), 'utf8');
    expect(manifestRaw).toContain(sample.id);
  });

  it('enforces user quota', async () => {
    await store.ensureReservedCollections();
    const big = new Uint8Array(1024 * 1024 + 1);
    await expect(
      store.putSample(BUFFER_COLLECTION_ID, big, {
        title: 'big',
        class: 'test',
        label: 'unlabeled',
        source: 'mic-recording',
        durationSec: 1,
        sampleRate: 48000,
      }),
    ).rejects.toThrow(/quota/i);
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { PluginContext } from '@membrana/plugin-contracts';

import type { CollectionSampleDescriptor, CollectionSampleReader } from '../sample-reader.js';
import { detectorBatchFingerprintsOf, createDetectorBatchExecutor } from './executor.js';
import { DETECTOR_BATCH_MANIFEST } from './manifest.js';

const wav = (samples: readonly number[] = [0, 0.25, -0.25, 0]): Uint8Array => {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8_000, true);
  view.setUint32(28, 16_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.round(sample * 32767), true));
  return bytes;
};

const sample = (id: string): CollectionSampleDescriptor => ({
  id,
  deviceId: 'device-1',
  collectionId: 'collection-1',
  sampleRate: 8_000,
  channels: 1,
  audioFormat: 'wav',
  sizeBytes: 52,
  title: id,
});

const makeReader = (ids: readonly string[]): CollectionSampleReader => ({
  listSamples: vi.fn(async () => ids.map(sample)),
  readAudio: vi.fn(async (row) => ({ bytes: wav(), contentHash: `hash-${row.id}` })),
});

const context = async (reader: CollectionSampleReader, sampleIds?: readonly string[]): Promise<PluginContext> => ({
  address: {
    pluginId: DETECTOR_BATCH_MANIFEST.id,
    version: DETECTOR_BATCH_MANIFEST.version,
    collectionId: 'collection-1',
    runId: '0199aabb-ccdd-7000-8000-000000000001',
    mountTarget: DETECTOR_BATCH_MANIFEST.mountTarget,
  },
  fingerprints: await detectorBatchFingerprintsOf(reader, 'device-1', 'collection-1', sampleIds),
  resumeMode: 'fresh',
  trigger: 'collections.collection_created',
  payload: { deviceId: 'device-1', collectionId: 'collection-1', ...(sampleIds ? { sampleIds } : {}) },
});

describe('detector batch executor', () => {
  it('keeps inputHash stable regardless of reader order', async () => {
    const a = await detectorBatchFingerprintsOf(makeReader(['b', 'a']), 'device-1', 'collection-1');
    const b = await detectorBatchFingerprintsOf(makeReader(['a', 'b']), 'device-1', 'collection-1');
    expect(a).toEqual(b);
  });

  it('rejects an empty snapshot without invoking the analyzer', async () => {
    const reader = makeReader([]);
    const analyze = vi.fn();
    const result = await createDetectorBatchExecutor({ reader, analyzer: { analyze } }).execute(await context(reader));
    expect(result).toMatchObject({ status: 'rejected', rejection: { reason: 'empty' }, results: [] });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('continues after one detector failure and keeps the aggregate identity', async () => {
    const reader = makeReader(['a', 'b', 'c']);
    const analyze = vi.fn(async (row: CollectionSampleDescriptor) => {
      if (row.id === 'b') throw new Error('detector failed');
      return {
        verdicts: [{ detectorId: 'harmonic', isDrone: row.id === 'c', confidence: 0.75, latencyMs: 4 }],
      };
    });
    const result = await createDetectorBatchExecutor({ reader, analyzer: { analyze } }).execute(await context(reader));
    expect(result).toMatchObject({
      status: 'completed',
      aggregate: { total: 3, ok: 2, failed: 1, skipped: 0, detected: 1 },
    });
    expect(result.aggregate.total).toBe(result.aggregate.ok + result.aggregate.failed + result.aggregate.skipped);
    expect(analyze).toHaveBeenCalledTimes(3);
  });

  it('turns non-finite metrics into a named per-sample failure', async () => {
    const reader = makeReader(['a']);
    const result = await createDetectorBatchExecutor({
      reader,
      analyzer: { analyze: async () => ({ verdicts: [{ detectorId: 'harmonic', isDrone: false, confidence: Number.NaN, latencyMs: 1 }] }) },
    }).execute(await context(reader));
    expect(result).toMatchObject({ status: 'completed', aggregate: { failed: 1 }, results: [{ status: 'failed', reason: 'invalid-metrics' }] });
  });

  it('rejects snapshots above the declared limit before detector work', async () => {
    const reader = makeReader(['a', 'b']);
    const analyze = vi.fn();
    const result = await createDetectorBatchExecutor({ reader, analyzer: { analyze }, maxSamples: 1 }).execute(await context(reader));
    expect(result).toMatchObject({ status: 'rejected', rejection: { reason: 'limit-exceeded' }, results: [] });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('rejects an unavailable analyzer before the first detect call', async () => {
    const reader = makeReader(['a']);
    const analyze = vi.fn();
    const result = await createDetectorBatchExecutor({
      reader,
      analyzer: { isAvailable: () => false, analyze },
    }).execute(await context(reader));
    expect(result).toMatchObject({
      status: 'rejected',
      rejection: { reason: 'detector-unavailable' },
      results: [],
    });
    expect(analyze).not.toHaveBeenCalled();
  });

  it('keeps a read failure local to one sample after the frozen fingerprint was made', async () => {
    const base = makeReader(['a', 'b']);
    const ctx = await context(base);
    const readAudio = vi.fn(async (row: CollectionSampleDescriptor) => {
      if (row.id === 'b') throw new Error('blob unavailable');
      return { bytes: wav(), contentHash: `hash-${row.id}` };
    });
    const reader: CollectionSampleReader = { listSamples: base.listSamples, readAudio };
    const result = await createDetectorBatchExecutor({
      reader,
      analyzer: { analyze: async () => ({ verdicts: [{ detectorId: 'harmonic', isDrone: false, confidence: 0.5, latencyMs: 1 }] }) },
    }).execute(ctx);
    expect(result).toMatchObject({
      status: 'completed',
      inputHash: ctx.fingerprints.inputHash,
      aggregate: { total: 2, ok: 1, failed: 1 },
    });
  });
});

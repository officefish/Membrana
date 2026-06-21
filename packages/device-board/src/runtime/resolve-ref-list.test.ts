import { describe, expect, it } from 'vitest';
import { createReferenceValue } from '@membrana/core';

import { COLLECT_BATCH_OUT_HANDLE } from '../graph/collect-node-shared.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { resolveRefListMembers } from './resolve-ref-list.js';

describe('resolveRefListMembers (DBC4)', () => {
  it('returns empty for invalid list ref', () => {
    expect(
      resolveRefListMembers(
        { kind: 'AudioSampleRefList', handle: null, valid: false },
        'AudioSampleRefList',
        undefined,
      ),
    ).toEqual([]);
  });

  it('unwraps collect-batch handle via CollectRuntimeStore', () => {
    const store = new CollectRuntimeStore();
    const sampleA = createReferenceValue('AudioSampleRef', 's-a');
    const sampleB = createReferenceValue('AudioSampleRef', 's-b');
    store.setLastBatch('collect-1', [sampleA, sampleB], 'AudioSampleRefList');

    const listRef = store.getLastBatchRef('collect-1');
    expect(resolveRefListMembers(listRef, 'AudioSampleRefList', store)).toEqual([
      sampleA,
      sampleB,
    ]);
  });

  it('rejects kind mismatch', () => {
    const store = new CollectRuntimeStore();
    store.setLastBatch('collect-2', [createReferenceValue('FftFrameRef', 'f-1')], 'FftFrameRefList');
    const listRef = store.getLastBatchRef('collect-2');
    expect(resolveRefListMembers(listRef, 'AudioSampleRefList', store)).toEqual([]);
  });

  it('returns empty when collect store missing for batch handle', () => {
    const listRef = createReferenceValue('AudioSampleRefList', 'collect-batch:missing');
    expect(resolveRefListMembers(listRef, 'AudioSampleRefList', undefined)).toEqual([]);
  });
});

describe('collect batch handle contract', () => {
  it('uses batches output handle name from collect nodes', () => {
    expect(COLLECT_BATCH_OUT_HANDLE).toBe('batches');
  });
});

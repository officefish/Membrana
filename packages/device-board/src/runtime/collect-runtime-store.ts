import type { ScenarioReferenceValue } from '@membrana/core';
import { createReferenceValue } from '@membrana/core';

import type { CollectNodeTickState } from '../graph/collect-node-shared.js';
import {
  createCollectTickState,
  resetCollectTickState,
} from '../graph/collect-node-shared.js';

export type CollectBatchListKind = 'AudioSampleRefList' | 'FftFrameRefList';

/** In-memory store Collect flush state (per scenario run). */
export class CollectRuntimeStore {
  private readonly tickStates = new Map<string, CollectNodeTickState>();

  private readonly batches = new Map<string, readonly ScenarioReferenceValue[]>();

  private readonly batchListKinds = new Map<string, CollectBatchListKind>();

  getTickState(nodeId: string): CollectNodeTickState {
    return this.tickStates.get(nodeId) ?? createCollectTickState();
  }

  setTickState(nodeId: string, state: CollectNodeTickState): void {
    this.tickStates.set(nodeId, state);
  }

  setLastBatch(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
    listKind: CollectBatchListKind,
  ): void {
    this.batches.set(nodeId, refs);
    this.batchListKinds.set(nodeId, listKind);
  }

  getLastBatchRef(nodeId: string): ScenarioReferenceValue {
    const listKind = this.batchListKinds.get(nodeId);
    const refs = this.batches.get(nodeId);
    if (listKind === undefined || refs === undefined || refs.length === 0) {
      return { kind: listKind ?? 'AudioSampleRefList', handle: null, valid: false };
    }
    return createReferenceValue(listKind, `collect-batch:${nodeId}`);
  }

  getLastBatchRefs(nodeId: string): readonly ScenarioReferenceValue[] {
    return this.batches.get(nodeId) ?? [];
  }

  resetAfterFlush(nodeId: string): void {
    this.setTickState(nodeId, resetCollectTickState());
  }

  resetAll(): void {
    this.tickStates.clear();
    this.batches.clear();
    this.batchListKinds.clear();
  }
}

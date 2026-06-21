import type { ScenarioGraphNode, ScenarioSubgraph, ScenarioVariable } from '@membrana/core';
import { createReferenceValue, createScenarioVariable } from '@membrana/core';
import { describe, expect, it, vi } from 'vitest';

import {
  COLLECT_FFT_ANALYSER_HANDLE,
  COLLECT_FFT_FRAME_HANDLE,
} from '../graph/collect-fft-frames-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { executeCollectNode } from './collect-node-executor.js';
import { ScenarioVariableStore } from './variable-store.js';

describe('executeCollectNode (collect-fft-frames)', () => {
  it('append-only: does not flush SpectralAnalyser session on windowSec', () => {
    const flushSpectralAnalyserSession = vi.fn(() => null);
    const host = {
      log: vi.fn(),
      subscribeSpectralAnalyserCollect: vi.fn(),
      appendSpectralAnalyserFrame: vi.fn(() => true),
      flushSpectralAnalyserSession,
    };
    const collectStore = new CollectRuntimeStore();
    const analyserRef = createReferenceValue('SpectralAnalyserRef', 'analyser:dev-1');
    const analyserVar: ScenarioVariable = {
      ...createScenarioVariable('var-analyser', 'analyser1', 'SpectralAnalyserRef'),
      value: analyserRef,
    };
    const variableStore = new ScenarioVariableStore([analyserVar]);
    const node: ScenarioGraphNode = {
      id: 'collect-fft',
      blockKind: 'custom',
      position: { x: 0, y: 0 },
      nodeKind: 'collect-fft-frames',
      collectorConfig: { windowSec: 3, queueCapacity: 10 },
    };
    const subgraph: ScenarioSubgraph = {
      entry: 'collect-fft',
      nodes: [
        {
          id: 'vg-analyser',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'variable-get',
          variableId: analyserVar.id,
        },
        {
          id: 'frame-src',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'get-fft-frame',
        },
        node,
      ],
      edges: [
        {
          id: 'd-analyser',
          kind: 'data',
          source: 'vg-analyser',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'collect-fft',
          targetHandle: COLLECT_FFT_ANALYSER_HANDLE,
          dataType: 'SpectralAnalyserRef',
        },
        {
          id: 'd-frame',
          kind: 'data',
          source: 'frame-src',
          sourceHandle: 'frame',
          target: 'collect-fft',
          targetHandle: COLLECT_FFT_FRAME_HANDLE,
          dataType: 'FftFrameRef',
        },
      ],
    };
    const frameRef = createReferenceValue('FftFrameRef', 'fft-1');
    const resolveContext = {
      getCapturedFftFrameRef: () => frameRef,
    };

    for (let tick = 0; tick < 50; tick += 1) {
      executeCollectNode({
        host,
        subgraph,
        node,
        variableStore,
        resolveContext,
        collectStore,
        mode: 'fft-frames',
      });
    }

    expect(flushSpectralAnalyserSession).not.toHaveBeenCalled();
    expect(host.appendSpectralAnalyserFrame).toHaveBeenCalledTimes(50);
  });
});

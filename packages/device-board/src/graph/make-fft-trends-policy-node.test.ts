import { DEFAULT_FFT_TRENDS_POLICY } from '@membrana/core';
import { describe, expect, it } from 'vitest';

import {
  MAKE_FFT_TRENDS_POLICY_OUT_HANDLE,
  createMakeFftTrendsPolicyBoardNode,
  makeFftTrendsPolicyNodePins,
  readMakeFftTrendsPolicyFromNodeData,
} from './make-fft-trends-policy-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('make-fft-trends-policy-node (B0)', () => {
  it('exposes FftTrendsPolicy data-out', () => {
    const pins = makeFftTrendsPolicyNodePins();
    expect(pins.outputs.find((p) => p.name === MAKE_FFT_TRENDS_POLICY_OUT_HANDLE)?.socketType).toBe(
      'FftTrendsPolicy',
    );
  });

  it('defaults fftTrendsPolicy on create', () => {
    const node = createMakeFftTrendsPolicyBoardNode({ id: 'mftp-1' });
    expect(node.data.fftTrendsPolicy).toEqual(DEFAULT_FFT_TRENDS_POLICY);
  });

  it('serializes with fftTrendsPolicy config', () => {
    const node = createMakeFftTrendsPolicyBoardNode({
      id: 'mftp-1',
      fftTrendsPolicy: { measurementsCount: 180, intervalMs: 200, detectionMode: 'manual' },
    });
    const sub = serializeScenarioSubgraph('mftp-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('make-fft-trends-policy');
    expect(restored.nodes[0]?.data.fftTrendsPolicy).toMatchObject({
      measurementsCount: 180,
      intervalMs: 200,
      detectionMode: 'manual',
    });
  });

  it('reads fftTrendsPolicy from serialized ScenarioGraphNode shape', () => {
    expect(
      readMakeFftTrendsPolicyFromNodeData({
        nodeKind: 'make-fft-trends-policy',
        fftTrendsPolicy: { measurementsCount: 300, intervalMs: 1000 },
      }),
    ).toMatchObject({ measurementsCount: 300, intervalMs: 1000 });
  });
});

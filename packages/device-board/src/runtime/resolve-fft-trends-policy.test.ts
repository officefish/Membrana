import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FFT_TRENDS_POLICY,
  resolveScenarioFftTrendsPolicy,
  type ScenarioGraphNode,
} from '@membrana/core';

import { MAKE_FFT_TRENDS_POLICY_HANDLE } from '../graph/make-fft-trends-analysis-node.js';
import { resolveFftTrendsPolicyForNode } from './resolve-fft-trends-policy.js';
import type { ResolveInputContext } from './resolve-input.js';
import { ScenarioVariableStore } from './variable-store.js';

const resolveContext: ResolveInputContext = {
  handlerBranch: 'onConnect',
  deviceHandle: 'dev-1',
};

function policyNode(id: string, policy: Partial<typeof DEFAULT_FFT_TRENDS_POLICY>): ScenarioGraphNode {
  return {
    id,
    blockKind: 'custom',
    position: { x: 0, y: 0 },
    nodeKind: 'make-fft-trends-policy',
    fftTrendsPolicy: resolveScenarioFftTrendsPolicy(policy),
  };
}

describe('resolveFftTrendsPolicyForNode (B1)', () => {
  it('uses wired FftTrendsPolicy from MakeFftTrendsPolicy', () => {
    const consumer: ScenarioGraphNode = {
      id: 'mft',
      blockKind: 'custom',
      position: { x: 0, y: 0 },
      nodeKind: 'make-fft-trends-analysis',
    };
    const provider = policyNode('mftp', { measurementsCount: 100, intervalMs: 200 });
    const subgraph = {
      entry: 'mft',
      nodes: [consumer, provider],
      edges: [
        {
          kind: 'data' as const,
          source: 'mftp',
          sourceHandle: 'policy',
          target: 'mft',
          targetHandle: MAKE_FFT_TRENDS_POLICY_HANDLE,
          dataType: 'FftTrendsPolicy' as const,
        },
      ],
    };
    const store = new ScenarioVariableStore([]);
    const resolved = resolveFftTrendsPolicyForNode(subgraph, store, consumer, resolveContext);
    expect(resolved.measurementsCount).toBe(100);
    expect(resolved.intervalMs).toBe(200);
  });

  it('falls back to node fftTrendsPolicy when policy port unwired', () => {
    const consumer: ScenarioGraphNode = {
      id: 'mft',
      blockKind: 'custom',
      position: { x: 0, y: 0 },
      nodeKind: 'make-fft-trends-analysis',
      fftTrendsPolicy: resolveScenarioFftTrendsPolicy({ measurementsCount: 50, intervalMs: 1000 }),
    };
    const subgraph = { entry: 'mft', nodes: [consumer], edges: [] };
    const store = new ScenarioVariableStore([]);
    const resolved = resolveFftTrendsPolicyForNode(subgraph, store, consumer, resolveContext);
    expect(resolved.measurementsCount).toBe(50);
    expect(resolved.intervalMs).toBe(1000);
  });

  it('defaults when no wire and no node fallback', () => {
    const consumer: ScenarioGraphNode = {
      id: 'mft',
      blockKind: 'custom',
      position: { x: 0, y: 0 },
      nodeKind: 'make-fft-trends-analysis',
    };
    const subgraph = { entry: 'mft', nodes: [consumer], edges: [] };
    const store = new ScenarioVariableStore([]);
    expect(resolveFftTrendsPolicyForNode(subgraph, store, consumer, resolveContext)).toEqual(
      DEFAULT_FFT_TRENDS_POLICY,
    );
  });
});

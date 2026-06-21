import {
  DEFAULT_FFT_TRENDS_POLICY,
  isScenarioFftTrendsPolicyValue,
  resolveScenarioFftTrendsPolicy,
  type ScenarioFftTrendsPolicy,
  type ScenarioGraphNode,
  type ScenarioSubgraph,
} from '@membrana/core';

import { MAKE_FFT_TRENDS_POLICY_HANDLE } from '../graph/make-fft-trends-analysis-node.js';
import { resolveInput, type ResolveInputContext } from './resolve-input.js';
import type { ScenarioVariableStore } from './variable-store.js';

function readNodeFallbackPolicy(node: ScenarioGraphNode): Partial<ScenarioFftTrendsPolicy> | undefined {
  const raw = (node as ScenarioGraphNode & { fftTrendsPolicy?: Partial<ScenarioFftTrendsPolicy> })
    .fftTrendsPolicy;
  return raw;
}

/** Wired FftTrendsPolicy → normalized policy; иначе fallback на узле или DEFAULT. */
export function resolveFftTrendsPolicyForNode(
  subgraph: ScenarioSubgraph,
  variableStore: ScenarioVariableStore,
  node: ScenarioGraphNode,
  resolveContext: ResolveInputContext,
): ScenarioFftTrendsPolicy {
  const policyWire = resolveInput(
    subgraph,
    variableStore.getAll(),
    node.id,
    MAKE_FFT_TRENDS_POLICY_HANDLE,
    resolveContext,
  );
  if (isScenarioFftTrendsPolicyValue(policyWire)) {
    return resolveScenarioFftTrendsPolicy({
      detectionMode: policyWire.detectionMode,
      measurementsCount: policyWire.measurementsCount,
      intervalMs: policyWire.intervalMs,
      minConfidence: policyWire.minConfidence,
      minRms: policyWire.minRms,
      enabledTemplateKeys: policyWire.enabledTemplateKeys,
    });
  }
  return resolveScenarioFftTrendsPolicy(readNodeFallbackPolicy(node) ?? DEFAULT_FFT_TRENDS_POLICY);
}

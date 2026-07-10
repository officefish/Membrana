import type { ScenarioGraphNode, ScenarioSequenceConfig, ScenarioSubgraph } from '@membrana/core';
import { resolveScenarioSequenceConfig } from '@membrana/core';

import { sequenceThenHandle } from '../graph/sequence-node.js';
import type { ScenarioRuntimeHost } from './host.js';
import { findExecSuccessor } from './exec-successor.js';
import { runEventBranchFromNode } from './event-dispatch.js';
import type { ExecSubgraphCallbacks, ExecSubgraphOptions } from './exec-subgraph.js';
import type { ScenarioDetectionResult } from './types.js';

/** Исполняет Then-ветки Sequence (sync или parallel async). */
export async function runSequenceThenBranches(
  subgraph: ScenarioSubgraph,
  sequenceNode: ScenarioGraphNode,
  host: ScenarioRuntimeHost,
  signal: AbortSignal,
  options: ExecSubgraphOptions,
  callbacks: ExecSubgraphCallbacks,
  initialDetection: ScenarioDetectionResult | null,
): Promise<ScenarioDetectionResult | null> {
  const config = resolveScenarioSequenceConfig(sequenceNode.sequenceConfig);
  if (config.parallelAsync) {
    return runSequenceParallelAsync(
      subgraph,
      sequenceNode.id,
      config,
      host,
      signal,
      options,
      callbacks,
      initialDetection,
    );
  }
  if (config.latentThen) {
    return runSequenceLatent(
      subgraph,
      sequenceNode.id,
      config,
      host,
      signal,
      options,
      callbacks,
      initialDetection,
    );
  }
  return runSequenceSync(
    subgraph,
    sequenceNode.id,
    config,
    host,
    signal,
    options,
    callbacks,
    initialDetection,
  );
}

async function runSequenceSync(
  subgraph: ScenarioSubgraph,
  sequenceNodeId: string,
  config: ScenarioSequenceConfig,
  host: ScenarioRuntimeHost,
  signal: AbortSignal,
  options: ExecSubgraphOptions,
  callbacks: ExecSubgraphCallbacks,
  initialDetection: ScenarioDetectionResult | null,
): Promise<ScenarioDetectionResult | null> {
  let lastDetection = initialDetection;
  for (let index = 0; index < config.thenCount; index += 1) {
    if (signal.aborted) {
      return lastDetection;
    }
    const handle = sequenceThenHandle(index);
    const startId = findExecSuccessor(subgraph, sequenceNodeId, handle);
    if (startId === null) {
      host.log('sequence-then-skip', {
        nodeId: sequenceNodeId,
        thenIndex: index,
        branch: options.branch,
      });
      continue;
    }
    host.log('sequence-then-start', {
      nodeId: sequenceNodeId,
      thenIndex: index,
      startNodeId: startId,
      branch: options.branch,
    });
    lastDetection = await runEventBranchFromNode(
      subgraph,
      startId,
      host,
      signal,
      options,
      callbacks,
      lastDetection,
    );
  }
  return lastDetection;
}

/**
 * Latent Then: стартует каждую ветку без await; Sequence возвращается сразу.
 * Завершение веток — в фоне (on-async-resolved / detached event).
 */
async function runSequenceLatent(
  subgraph: ScenarioSubgraph,
  sequenceNodeId: string,
  config: ScenarioSequenceConfig,
  host: ScenarioRuntimeHost,
  signal: AbortSignal,
  options: ExecSubgraphOptions,
  callbacks: ExecSubgraphCallbacks,
  initialDetection: ScenarioDetectionResult | null,
): Promise<ScenarioDetectionResult | null> {
  const pending: Promise<ScenarioDetectionResult | null>[] = [];
  for (let index = 0; index < config.thenCount; index += 1) {
    if (signal.aborted) {
      return initialDetection;
    }
    const handle = sequenceThenHandle(index);
    const startId = findExecSuccessor(subgraph, sequenceNodeId, handle);
    if (startId === null) {
      host.log('sequence-then-skip', {
        nodeId: sequenceNodeId,
        thenIndex: index,
        branch: options.branch,
      });
      continue;
    }
    host.log('sequence-latent-then-start', {
      nodeId: sequenceNodeId,
      thenIndex: index,
      startNodeId: startId,
      branch: options.branch,
    });
    const branchPromise = runEventBranchFromNode(
      subgraph,
      startId,
      host,
      signal,
      options,
      callbacks,
      initialDetection,
    ).then(
      (detection) => {
        host.log('sequence-latent-then-done', {
          nodeId: sequenceNodeId,
          thenIndex: index,
          startNodeId: startId,
          branch: options.branch,
        });
        return detection;
      },
      (error: unknown) => {
        // L31 (#340 live-тест): смерть latent-ветки ОБЯЗАНА быть видимой —
        // молчаливый swallow ослеплял отладку сценариев (gamma, run 21a7fb2f).
        host.log('sequence-latent-then-error', {
          nodeId: sequenceNodeId,
          thenIndex: index,
          startNodeId: startId,
          branch: options.branch,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      },
    );
    pending.push(branchPromise);
  }
  if (pending.length > 0) {
    host.log('sequence-latent-dispatch-done', {
      nodeId: sequenceNodeId,
      branchCount: pending.length,
      branch: options.branch,
    });
    void Promise.all(pending).catch(() => {
      /* abort / runtime stop — фоновые ветки уже логируют через host */
    });
  }
  return initialDetection;
}

async function runSequenceParallelAsync(
  subgraph: ScenarioSubgraph,
  sequenceNodeId: string,
  config: ScenarioSequenceConfig,
  host: ScenarioRuntimeHost,
  signal: AbortSignal,
  options: ExecSubgraphOptions,
  callbacks: ExecSubgraphCallbacks,
  initialDetection: ScenarioDetectionResult | null,
): Promise<ScenarioDetectionResult | null> {
  const starts: { readonly index: number; readonly startId: string }[] = [];
  for (let index = 0; index < config.thenCount; index += 1) {
    const handle = sequenceThenHandle(index);
    const startId = findExecSuccessor(subgraph, sequenceNodeId, handle);
    if (startId !== null) {
      starts.push({ index, startId });
    }
  }
  if (starts.length === 0) {
    return initialDetection;
  }
  host.log('sequence-parallel-async-start', {
    nodeId: sequenceNodeId,
    branchCount: starts.length,
    branch: options.branch,
  });
  const results = await Promise.all(
    starts.map(({ index, startId }) =>
      runEventBranchFromNode(
        subgraph,
        startId,
        host,
        signal,
        options,
        callbacks,
        initialDetection,
      ).then((detection) => ({ index, detection })),
    ),
  );
  return results.reduce<ScenarioDetectionResult | null>(
    (acc, item) => item.detection ?? acc,
    initialDetection,
  );
}

import { isScenarioSequenceModeConflict, resolveScenarioGraphNodeSupportsAsync } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { isBoardFlowNodeData } from './board-node-data.js';
import { collectExecReachableNodeIds } from './layout-exec-chain.js';
import { isSequenceNode, readSequenceConfig } from './sequence-node.js';

export const SEQUENCE_ASYNC_GATE_MESSAGE =
  'Параллельный async: узел не поддерживает async-ветку Sequence. Используйте pause-runtime или pure-узлы.';

export interface SequenceAsyncGateIssue {
  readonly sequenceNodeId: string;
  readonly thenIndex: number;
  readonly nodeId: string;
  readonly nodeKind: string | undefined;
}

function readBoardNodeSupportsAsync(node: Node): boolean {
  if (!isBoardFlowNodeData(node.data)) {
    return false;
  }
  return resolveScenarioGraphNodeSupportsAsync({
    nodeKind: node.data.nodeKind,
    pure: node.data.pure,
    supportsAsync: node.data.supportsAsync as boolean | undefined,
  });
}

/** Находит impure non-async узлы на Then-ветках Sequence с `parallelAsync`. */
export function findSequenceAsyncGateIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
): readonly SequenceAsyncGateIssue[] {
  const issues: SequenceAsyncGateIssue[] = [];
  for (const sequenceNode of nodes) {
    if (!isSequenceNode(sequenceNode)) {
      continue;
    }
    const config = readSequenceConfig(sequenceNode.data);
    if (!config.parallelAsync) {
      continue;
    }
    for (let thenIndex = 0; thenIndex < config.thenCount; thenIndex += 1) {
      const handle = `then-${thenIndex}`;
      const branchEdge = edges.find(
        (edge) => edge.source === sequenceNode.id && edge.sourceHandle === handle,
      );
      if (branchEdge === undefined) {
        continue;
      }
      const reachable = collectExecReachableNodeIds(nodes, edges, branchEdge.target);
      for (const nodeId of reachable) {
        const node = nodes.find((item) => item.id === nodeId);
        if (node === undefined) {
          continue;
        }
        if (node.id === sequenceNode.id) {
          continue;
        }
        if (readBoardNodeSupportsAsync(node)) {
          continue;
        }
        const nodeKind = isBoardFlowNodeData(node.data) ? node.data.nodeKind : undefined;
        issues.push({
          sequenceNodeId: sequenceNode.id,
          thenIndex,
          nodeId: node.id,
          nodeKind,
        });
      }
    }
  }
  return issues;
}

export const SEQUENCE_MODE_CONFLICT_MESSAGE =
  'Sequence: «Параллельный async» и «Latent Then» взаимоисключающи.';

/** Pre-run: parallelAsync + latentThen на одном Sequence. */
export function findSequenceModePreRunIssues(
  nodes: readonly Node[],
  pathPrefix: string,
): readonly { readonly code: string; readonly message: string; readonly path: string }[] {
  const issues: { readonly code: string; readonly message: string; readonly path: string }[] =
    [];
  for (const node of nodes) {
    if (!isSequenceNode(node)) {
      continue;
    }
    const config = readSequenceConfig(node.data);
    if (isScenarioSequenceModeConflict(config)) {
      issues.push({
        code: 'sequence-mode-conflict',
        message: SEQUENCE_MODE_CONFLICT_MESSAGE,
        path: `${pathPrefix}/${node.id}`,
      });
    }
  }
  return issues;
}

/** Pre-run issues для Sequence parallel async gate. */
export function findSequenceAsyncPreRunIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
  pathPrefix: string,
): readonly { readonly code: string; readonly message: string; readonly path: string }[] {
  return findSequenceAsyncGateIssues(nodes, edges).map((issue) => ({
    code: 'sequence-async-unsupported-node',
    message: `${SEQUENCE_ASYNC_GATE_MESSAGE} (Then ${issue.thenIndex}, «${issue.nodeKind ?? issue.nodeId}»)`,
    path: `${pathPrefix}/${issue.sequenceNodeId}/then-${issue.thenIndex}/${issue.nodeId}`,
  }));
}

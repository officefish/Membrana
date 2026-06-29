import { resolveScenarioGraphNodeSupportsAsync } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import {
  ASYNC_PROMISE_REF_HANDLE,
  AWAIT_PROMISE_NODE_KIND,
  ON_ASYNC_RESOLVED_NODE_KIND,
} from './async-orchestration-nodes.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import { collectExecReachableNodeIds } from './layout-exec-chain.js';
import { isSequenceNode, readSequenceConfig } from './sequence-node.js';

export const AWAIT_PROMISE_MISSING_REF_MESSAGE =
  'Await Promise: подключите data-вход «promise» к выходу Start Async Job (PromiseRef).';

export const ON_ASYNC_RESOLVED_MISSING_REF_MESSAGE =
  'On Async Resolved: подключите data-вход «promise» к PromiseRef.';

export const SEQUENCE_LATENT_GATE_MESSAGE =
  'Latent Then: узел не поддерживает latent-ветку Sequence. Используйте pause-runtime, promise-узлы или pure-узлы.';

export interface PromiseRefMissingIssue {
  readonly nodeId: string;
  readonly nodeKind: string;
}

export interface SequenceLatentGateIssue {
  readonly sequenceNodeId: string;
  readonly thenIndex: number;
  readonly nodeId: string;
  readonly nodeKind: string | undefined;
}

function hasPromiseRefInputEdge(
  nodeId: string,
  edges: readonly Edge[],
): boolean {
  return edges.some(
    (edge) =>
      edge.target === nodeId &&
      edge.targetHandle === ASYNC_PROMISE_REF_HANDLE &&
      edge.sourceHandle === ASYNC_PROMISE_REF_HANDLE,
  );
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

/** Узлы await-promise / on-async-resolved без входящего PromiseRef. */
export function findPromiseRefMissingIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
): readonly PromiseRefMissingIssue[] {
  const issues: PromiseRefMissingIssue[] = [];
  for (const node of nodes) {
    if (!isBoardFlowNodeData(node.data)) {
      continue;
    }
    const kind = node.data.nodeKind;
    if (kind !== AWAIT_PROMISE_NODE_KIND && kind !== ON_ASYNC_RESOLVED_NODE_KIND) {
      continue;
    }
    if (!hasPromiseRefInputEdge(node.id, edges)) {
      issues.push({ nodeId: node.id, nodeKind: kind });
    }
  }
  return issues;
}

/** Impure non-async узлы на Then-ветках Sequence с `latentThen`. */
export function findSequenceLatentThenGateIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
): readonly SequenceLatentGateIssue[] {
  const issues: SequenceLatentGateIssue[] = [];
  for (const sequenceNode of nodes) {
    if (!isSequenceNode(sequenceNode)) {
      continue;
    }
    const config = readSequenceConfig(sequenceNode.data);
    if (!config.latentThen) {
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

/** Pre-run issues для missing PromiseRef. */
export function findPromiseRefPreRunIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
  pathPrefix: string,
): readonly { readonly code: string; readonly message: string; readonly path: string }[] {
  return findPromiseRefMissingIssues(nodes, edges).map((issue) => ({
    code:
      issue.nodeKind === AWAIT_PROMISE_NODE_KIND
        ? 'await-promise-missing-ref'
        : 'on-async-resolved-missing-ref',
    message:
      issue.nodeKind === AWAIT_PROMISE_NODE_KIND
        ? AWAIT_PROMISE_MISSING_REF_MESSAGE
        : ON_ASYNC_RESOLVED_MISSING_REF_MESSAGE,
    path: `${pathPrefix}/${issue.nodeId}`,
  }));
}

/** Pre-run issues для Sequence latent Then gate. */
export function findSequenceLatentThenPreRunIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
  pathPrefix: string,
): readonly { readonly code: string; readonly message: string; readonly path: string }[] {
  return findSequenceLatentThenGateIssues(nodes, edges).map((issue) => ({
    code: 'sequence-latent-unsupported-node',
    message: `${SEQUENCE_LATENT_GATE_MESSAGE} (Then ${issue.thenIndex}, «${issue.nodeKind ?? issue.nodeId}»)`,
    path: `${pathPrefix}/${issue.sequenceNodeId}/then-${issue.thenIndex}/${issue.nodeId}`,
  }));
}

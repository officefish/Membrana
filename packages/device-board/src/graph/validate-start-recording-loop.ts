import type { ScenarioNodeKind } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { isBoardFlowNodeData } from './board-node-data.js';
import { isExecFlowBoardEdge } from './layout-exec-chain.js';
import type { PreRunValidationIssue } from './validate-pre-run.js';

/** Согласовано с operator note в `scenario-node-inspector-notes.ts`. */
export const START_RECORDING_UNCONDITIONAL_LOOP_MESSAGE =
  'StartRecording достижим от onTick без предшествующего StopRecording на этом exec-пути. Host пропустит повторные вызовы (chain-log: start-recording-idempotent), но такая топология — антипаттерн. Канон: один старт после StartStreaming (onStart) или рестарт только после StopRecording на ветке gate.';

function readNodeKind(node: Node): ScenarioNodeKind | undefined {
  if (!isBoardFlowNodeData(node.data)) {
    return undefined;
  }
  return node.data.nodeKind;
}

function execTargetsFrom(
  nodeId: string,
  nodes: readonly Node[],
  edges: readonly Edge[],
): readonly string[] {
  const targets: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId && isExecFlowBoardEdge(edge, nodes)) {
      targets.push(edge.target);
    }
  }
  return targets;
}

/**
 * DFS: пути от loop entry, где `start-recording` встречается без `stop-recording` ранее на пути.
 */
function findViolatingStartRecordingNodeIds(
  nodes: readonly Node[],
  edges: readonly Edge[],
  entryNodeId: string,
): Set<string> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const violations = new Set<string>();
  const visitedStates = new Set<string>();

  function stateKey(nodeId: string, seenStop: boolean): string {
    return `${nodeId}\0${seenStop ? '1' : '0'}`;
  }

  function visit(nodeId: string, seenStop: boolean): void {
    const key = stateKey(nodeId, seenStop);
    if (visitedStates.has(key)) {
      return;
    }
    visitedStates.add(key);

    const node = nodeById.get(nodeId);
    if (node === undefined) {
      return;
    }

    const nodeKind = readNodeKind(node);
    if (nodeKind === 'start-recording' && !seenStop) {
      violations.add(nodeId);
    }

    const stopBeforeChildren = seenStop || nodeKind === 'stop-recording';
    for (const targetId of execTargetsFrom(nodeId, nodes, edges)) {
      visit(targetId, stopBeforeChildren);
    }
  }

  if (nodeById.has(entryNodeId)) {
    visit(entryNodeId, false);
  }

  return violations;
}

/** Pre-run warning: безусловный StartRecording на hot path loop-ветки (main/alarm). */
export function findStartRecordingUnconditionalLoopIssues(
  nodes: readonly Node[],
  edges: readonly Edge[],
  entryNodeId: string,
  pathPrefix: string,
): readonly PreRunValidationIssue[] {
  if (nodes.length === 0) {
    return [];
  }

  const issues: PreRunValidationIssue[] = [];
  for (const nodeId of findViolatingStartRecordingNodeIds(nodes, edges, entryNodeId)) {
    issues.push({
      code: 'start-recording-unconditional-loop-path',
      message: START_RECORDING_UNCONDITIONAL_LOOP_MESSAGE,
      path: `${pathPrefix}/${nodeId}`,
      severity: 'warning',
    });
  }
  return issues;
}

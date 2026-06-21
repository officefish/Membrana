import {
  normalizeScenarioGraphNodePure,
  resolveScenarioGraphNodePure,
  type ScenarioGraphNode,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { isBoardFlowNodeData } from './board-node-data.js';
import type { PreRunValidationIssue } from './validate-pre-run.js';

function scenarioNodeFromBoardNode(node: Node): ScenarioGraphNode | null {
  if (!isBoardFlowNodeData(node.data) || node.data.layer !== 'scenario') {
    return null;
  }
  const blockKind = node.data.blockKind;
  if (typeof blockKind !== 'string') {
    return null;
  }
  const raw: ScenarioGraphNode = {
    id: node.id,
    blockKind,
    position: { x: node.position.x, y: node.position.y },
    ...(typeof node.data.nodeKind === 'string' ? { nodeKind: node.data.nodeKind } : {}),
    ...(typeof node.data.variableId === 'string' ? { variableId: node.data.variableId } : {}),
    ...(typeof node.data.pure === 'boolean' ? { pure: node.data.pure } : {}),
  };
  return normalizeScenarioGraphNodePure(raw);
}

/**
 * Exec-рёбра на pure-узлы допустимы для legacy-графов (прозрачный passthrough в runtime).
 * Не блокируют Run; подсказка для оператора (G2 уберёт такие рёбра при toggle).
 */
export function findPureExecEdgeHints(
  nodes: readonly Node[],
  edges: readonly Edge[],
  pathPrefix: string,
): readonly PreRunValidationIssue[] {
  const issues: PreRunValidationIssue[] = [];
  const nodeById = new Map<string, ScenarioGraphNode>();
  for (const node of nodes) {
    const scenarioNode = scenarioNodeFromBoardNode(node);
    if (scenarioNode !== null) {
      nodeById.set(node.id, scenarioNode);
    }
  }

  for (const edge of edges) {
    const isExec =
      edge.sourceHandle === 'exec-out' && edge.targetHandle === 'exec-in';
    if (!isExec) {
      continue;
    }
    const target = nodeById.get(edge.target);
    if (target === undefined) {
      continue;
    }
    if (!resolveScenarioGraphNodePure(target)) {
      continue;
    }
    issues.push({
      code: 'pure-exec-edge-hint',
      message: `Узел «${edge.target}» pure — exec-ребро необязательно (достаточно data-edge)`,
      path: `${pathPrefix}/${edge.id ?? `${edge.source}->${edge.target}`}`,
      severity: 'warning',
    });
  }

  return issues;
}

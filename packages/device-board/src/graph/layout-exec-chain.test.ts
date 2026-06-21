import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import {
  computeExecChainLayoutPositions,
  isExecChainLayoutEnabled,
} from './layout-exec-chain.js';
import { createDefaultMvpMicrophoneHydratedState } from './default-usercase-mvp-microphone.js';

function execEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle: 'exec-out',
    targetHandle: 'exec-in',
  };
}

function scenarioNode(
  id: string,
  x: number,
  y: number,
  nodeKind: string,
): Node {
  return {
    id,
    type: 'boardFlowNode',
    position: { x, y },
    data: {
      layer: 'scenario',
      nodeKind,
      label: id,
      inputs: [{ name: 'exec-in', kind: 'exec' }],
      outputs: [{ name: 'exec-out', kind: 'exec' }],
    },
  };
}

describe('layout-exec-chain', () => {
  it('isExecChainLayoutEnabled requires exec edges in scope', () => {
    const nodes = [
      scenarioNode('a', 0, 0, 'print'),
      scenarioNode('b', 200, 40, 'print'),
      scenarioNode('c', 400, 80, 'print'),
    ];
    const edges = [execEdge('a', 'b'), execEdge('b', 'c')];
    const scope = new Set(['a', 'b', 'c']);
    expect(isExecChainLayoutEnabled(nodes, edges, scope)).toBe(true);
    expect(isExecChainLayoutEnabled(nodes, edges, new Set(['a', 'c']))).toBe(false);
  });

  it('computeExecChainLayoutPositions yields monotonic x on linear exec chain', () => {
    const nodes = [
      scenarioNode('a', 100, 200, 'print'),
      scenarioNode('b', 150, 250, 'print'),
      scenarioNode('c', 120, 300, 'print'),
    ];
    const edges = [execEdge('a', 'b'), execEdge('b', 'c')];
    const scope = new Set(['a', 'b', 'c']);
    const positions = computeExecChainLayoutPositions(nodes, edges, scope);
    expect(positions.size).toBe(3);

    const ax = positions.get('a')?.x ?? 0;
    const bx = positions.get('b')?.x ?? 0;
    const cx = positions.get('c')?.x ?? 0;
    expect(bx).toBeGreaterThan(ax);
    expect(cx).toBeGreaterThan(bx);

    for (const pos of positions.values()) {
      expect(pos.x % 8).toBe(0);
      expect(pos.y % 8).toBe(0);
    }
  });

  it('preserves selection anchor (min x/y)', () => {
    const nodes = [
      scenarioNode('a', 96, 128, 'print'),
      scenarioNode('b', 200, 180, 'print'),
    ];
    const edges = [execEdge('a', 'b')];
    const scope = new Set(['a', 'b']);
    const positions = computeExecChainLayoutPositions(nodes, edges, scope);
    expect(positions.get('a')?.x).toBe(96);
    expect(positions.get('a')?.y).toBe(128);
  });

  it('layouts exec subgraph on bundled MVP main branch', () => {
    const state = createDefaultMvpMicrophoneHydratedState();
    const nodes = state.scenarioMainNodes;
    const edges = state.scenarioMainEdges;
    const execEdgeCount = edges.filter(
      (edge) => edge.sourceHandle === 'exec-out' || edge.targetHandle === 'exec-in',
    ).length;
    expect(execEdgeCount).toBeGreaterThan(3);

    const scope = new Set(nodes.map((node) => node.id));
    expect(isExecChainLayoutEnabled(nodes, edges, scope)).toBe(true);

    const positions = computeExecChainLayoutPositions(nodes, edges, scope);
    expect(positions.size).toBeGreaterThanOrEqual(4);

    const xs = [...positions.values()].map((pos) => pos.x);
    expect(Math.max(...xs)).toBeGreaterThan(Math.min(...xs));
  });
});

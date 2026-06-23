import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';

import { createPaletteBoardNode } from './palette-node.js';
import {
  cloneBoardSelectionForPaste,
  extractBoardSelectionClipboard,
  selectionFlowBBoxCenter,
} from './copy-paste-board-selection.js';

function edge(id: string, source: string, target: string): Edge {
  return { id, source, target };
}

describe('copy-paste-board-selection', () => {
  it('extracts selected nodes and internal edges only', () => {
    const a = createPaletteBoardNode('print', { id: 'a', position: { x: 0, y: 0 } });
    const b = createPaletteBoardNode('print', { id: 'b', position: { x: 100, y: 0 } });
    const c = createPaletteBoardNode('print', { id: 'c', position: { x: 200, y: 0 } });
    const nodes: Node[] = [
      { ...a, selected: true },
      { ...b, selected: true },
      { ...c, selected: false },
    ];
    const edges = [edge('e-ab', 'a', 'b'), edge('e-bc', 'b', 'c')];

    const clip = extractBoardSelectionClipboard(nodes, edges);
    expect(clip?.nodes).toHaveLength(2);
    expect(clip?.edges).toHaveLength(1);
    expect(clip?.edges[0]?.id).toBe('e-ab');
  });

  it('paste remaps ids and offsets positions', () => {
    const node = createPaletteBoardNode('print', { id: 'a', position: { x: 10, y: 20 } });
    const clip = {
      nodes: [{ ...node, selected: true }],
      edges: [] as Edge[],
    };
    const pasted = cloneBoardSelectionForPaste(clip);
    expect(pasted.nodes[0]?.id).not.toBe('a');
    expect(pasted.nodes[0]?.position).toEqual({ x: 42, y: 52 });
    expect(pasted.nodes[0]?.selected).toBe(true);
  });

  it('paste anchors selection bbox center at flow point', () => {
    const a = createPaletteBoardNode('print', { id: 'a', position: { x: 0, y: 0 } });
    const b = createPaletteBoardNode('print', { id: 'b', position: { x: 100, y: 0 } });
    const clip = {
      nodes: [
        { ...a, selected: true },
        { ...b, selected: true },
      ],
      edges: [] as Edge[],
    };
    const center = selectionFlowBBoxCenter(clip.nodes);
    const pasted = cloneBoardSelectionForPaste(clip, { x: 500, y: 300 });
    const pastedCenter = selectionFlowBBoxCenter(pasted.nodes);
    expect(pastedCenter.x).toBeCloseTo(500, 5);
    expect(pastedCenter.y).toBeCloseTo(300, 5);
    expect(pasted.nodes[0]?.position.x).toBeCloseTo(500 - center.x, 5);
  });
});

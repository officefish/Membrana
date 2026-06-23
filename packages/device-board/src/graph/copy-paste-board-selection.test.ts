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

  it('uses forcedSelectedIds when node.selected is false', () => {
    const a = createPaletteBoardNode('print', { id: 'a', position: { x: 0, y: 0 } });
    const b = createPaletteBoardNode('print', { id: 'b', position: { x: 100, y: 0 } });
    const nodes: Node[] = [
      { ...a, selected: false },
      { ...b, selected: false },
    ];
    const clip = extractBoardSelectionClipboard(nodes, [], ['a', 'b']);
    expect(clip?.nodes).toHaveLength(2);
  });

  it('copies make-recording-policy nodes from marquee ids', () => {
    const policyA = createPaletteBoardNode('make-recording-policy', { id: 'pol-a', position: { x: 0, y: 0 } });
    const policyB = createPaletteBoardNode('make-recording-policy', { id: 'pol-b', position: { x: 120, y: 0 } });
    const nodes: Node[] = [
      { ...policyA, selected: false },
      { ...policyB, selected: false },
    ];
    const clip = extractBoardSelectionClipboard(nodes, [], ['pol-a', 'pol-b']);
    expect(clip?.nodes).toHaveLength(2);
    expect(clip?.nodes.every((node) => node.data?.nodeKind === 'make-recording-policy')).toBe(true);
  });

  it('paste strips parentId so nodes stay visible on root canvas', () => {
    const node = createPaletteBoardNode('print', {
      id: 'a',
      position: { x: 10, y: 20 },
      parentId: 'group-1',
    });
    const clip = {
      nodes: [{ ...node, selected: true }],
      edges: [] as Edge[],
    };
    const pasted = cloneBoardSelectionForPaste(clip, { x: 100, y: 100 });
    expect(pasted.nodes[0]?.parentId).toBeUndefined();
    expect(pasted.nodes[0]?.extent).toBeUndefined();
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

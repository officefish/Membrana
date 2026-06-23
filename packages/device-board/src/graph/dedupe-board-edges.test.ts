import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';

import { addBoardEdge, boardEdgeConnectionKey, dedupeBoardEdges } from './dedupe-board-edges.js';

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
): Edge {
  return { id, source, target, sourceHandle, targetHandle };
}

describe('dedupeBoardEdges', () => {
  it('keeps first edge per connection and normalizes id', () => {
    const key = 'fn-1-input:exec-in->node-a:exec-in';
    const input = [
      edge('legacy-1', 'fn-1-input', 'node-a', 'exec-in', 'exec-in'),
      edge(key, 'fn-1-input', 'node-a', 'exec-in', 'exec-in'),
      edge('other', 'node-a', 'fn-1-output', 'policy', 'policy'),
    ];
    const result = dedupeBoardEdges(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(key);
    expect(result[1]?.id).toBe('node-a:policy->fn-1-output:policy');
  });

  it('boardEdgeConnectionKey matches deserialize id format', () => {
    expect(
      boardEdgeConnectionKey({
        source: 'fn-1-input',
        sourceHandle: 'exec-in',
        target: 'node-a',
        targetHandle: 'exec-in',
      }),
    ).toBe('fn-1-input:exec-in->node-a:exec-in');
  });
});

describe('addBoardEdge', () => {
  it('does not add duplicate connection', () => {
    const existing = [
      edge('fn-1-input:exec-in->node-a:exec-in', 'fn-1-input', 'node-a', 'exec-in', 'exec-in'),
    ];
    const next = addBoardEdge(
      { source: 'fn-1-input', target: 'node-a', sourceHandle: 'exec-in', targetHandle: 'exec-in' },
      existing,
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe(existing[0]?.id);
  });

  it('adds new connection with canonical id', () => {
    const next = addBoardEdge(
      { source: 'node-a', target: 'fn-1-output', sourceHandle: 'stream', targetHandle: 'stream' },
      [],
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe('node-a:stream->fn-1-output:stream');
  });
});

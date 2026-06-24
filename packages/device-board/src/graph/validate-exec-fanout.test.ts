import { describe, expect, it } from 'vitest';

import { createPaletteBoardNode } from './palette-node.js';
import { isValidBoardConnection } from './connection-validation.js';
import {
  findExecFanOutEdges,
  wouldCreateExecFanOut,
} from './validate-exec-fanout.js';
import { COLLECT_EVENT_OUT_HANDLE } from './collect-node-shared.js';

describe('validate-exec-fanout', () => {
  it('rejects second exec-out from same source handle', () => {
    const a = createPaletteBoardNode('print', { id: 'a' });
    const b = createPaletteBoardNode('print', { id: 'b' });
    const c = createPaletteBoardNode('print', { id: 'c' });
    const nodes = [a, b, c];
    const edges = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        sourceHandle: 'exec-out',
        targetHandle: 'exec-in',
      },
    ];
    expect(
      isValidBoardConnection(
        {
          source: 'a',
          target: 'c',
          sourceHandle: 'exec-out',
          targetHandle: 'exec-in',
        },
        nodes,
        'scenario',
        edges,
      ),
    ).toBe(false);
    expect(
      wouldCreateExecFanOut(
        {
          source: 'a',
          target: 'c',
          sourceHandle: 'exec-out',
          targetHandle: 'exec-in',
        },
        edges,
        nodes,
      ),
    ).toBe(true);
  });

  it('allows exec-out from different handles on is-valid', () => {
    const isValid = createPaletteBoardNode('is-valid', { id: 'iv' });
    const a = createPaletteBoardNode('print', { id: 'a' });
    const b = createPaletteBoardNode('print', { id: 'b' });
    const nodes = [isValid, a, b];
    const edges = [
      {
        id: 'e1',
        source: 'iv',
        target: 'a',
        sourceHandle: 'exec-true-out',
        targetHandle: 'exec-in',
      },
    ];
    expect(
      isValidBoardConnection(
        {
          source: 'iv',
          target: 'b',
          sourceHandle: 'exec-false-out',
          targetHandle: 'exec-in',
        },
        nodes,
        'scenario',
        edges,
      ),
    ).toBe(true);
  });

  it('findExecFanOutEdges returns duplicate control-flow edges', () => {
    const a = createPaletteBoardNode('print', { id: 'a' });
    const b = createPaletteBoardNode('print', { id: 'b' });
    const c = createPaletteBoardNode('print', { id: 'c' });
    const nodes = [a, b, c];
    const edges = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        sourceHandle: 'exec-out',
        targetHandle: 'exec-in',
      },
      {
        id: 'e2',
        source: 'a',
        target: 'c',
        sourceHandle: 'exec-out',
        targetHandle: 'exec-in',
      },
    ];
    expect(findExecFanOutEdges(edges, nodes).map((edge) => edge.id)).toEqual(['e2']);
  });

  it('rejects second event-out to exec-in from collect', () => {
    const collect = createPaletteBoardNode('collect-samples', { id: 'cs' });
    const a = createPaletteBoardNode('print', { id: 'a' });
    const b = createPaletteBoardNode('print', { id: 'b' });
    const nodes = [collect, a, b];
    const edges = [
      {
        id: 'e1',
        source: 'cs',
        target: 'a',
        sourceHandle: COLLECT_EVENT_OUT_HANDLE,
        targetHandle: 'exec-in',
      },
    ];
    expect(
      isValidBoardConnection(
        {
          source: 'cs',
          target: 'b',
          sourceHandle: COLLECT_EVENT_OUT_HANDLE,
          targetHandle: 'exec-in',
        },
        nodes,
        'scenario',
        edges,
      ),
    ).toBe(false);
  });
});

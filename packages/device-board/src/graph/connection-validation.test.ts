import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';

import { EVENT_DATETIME_HANDLE } from './event-node.js';
import { createPaletteBoardNode, PALETTE_VALUE_HANDLE } from './palette-node.js';
import { isValidBoardConnection } from './connection-validation.js';

describe('isValidBoardConnection', () => {
  const eventNode = {
    id: 'evt',
    type: 'board',
    position: { x: 0, y: 0 },
    data: {
      label: 'Event',
      layer: 'scenario',
      nodeKind: 'event',
      outputs: [{ name: EVENT_DATETIME_HANDLE, kind: 'data', socketType: 'DateTime' }],
    },
  } as Node;

  it('allows DateTime → print value', () => {
    const print = createPaletteBoardNode('print', { id: 'pr' });
    expect(
      isValidBoardConnection(
        {
          source: 'evt',
          target: 'pr',
          sourceHandle: EVENT_DATETIME_HANDLE,
          targetHandle: PALETTE_VALUE_HANDLE,
        },
        [eventNode, print],
        'scenario',
      ),
    ).toBe(true);
  });

  it('allows ServerRef → print value', () => {
    const print = createPaletteBoardNode('print', { id: 'pr' });
    const serverEvent = {
      ...eventNode,
      data: {
        ...eventNode.data,
        outputs: [{ name: 'server', kind: 'data', socketType: 'ServerRef' }],
      },
    } as Node;
    expect(
      isValidBoardConnection(
        {
          source: 'evt',
          target: 'pr',
          sourceHandle: 'server',
          targetHandle: PALETTE_VALUE_HANDLE,
        },
        [serverEvent, print],
        'scenario',
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import { DEVICE_GLOBAL_DEVICE_HANDLE } from './device-global-node.js';
import { suggestPaletteNodesForOutgoingConnection } from './connection-suggest.js';
import { createPaletteBoardNode } from './palette-node.js';

describe('connection-suggest', () => {
  it('suggests exec targets for exec-out source', () => {
    const event = {
      id: 'evt',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'Event',
        layer: 'scenario',
        status: 'active',
        blockKind: 'custom',
        nodeKind: 'event',
        outputs: [{ name: 'exec-out', kind: 'exec' }],
      },
    };
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [event],
      'evt',
      'exec-out',
    );
    expect(suggestions.some((item) => item.nodeKind === 'stop-runtime')).toBe(true);
    expect(suggestions.some((item) => item.nodeKind === 'get-microphone')).toBe(true);
  });

  it('suggests get-microphone for DeviceRef device output', () => {
    const device = createPaletteBoardNode('device-global', { id: 'dg' });
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [device],
      'dg',
      DEVICE_GLOBAL_DEVICE_HANDLE,
    );
    expect(suggestions.map((item) => item.nodeKind)).toContain('get-microphone');
  });
});

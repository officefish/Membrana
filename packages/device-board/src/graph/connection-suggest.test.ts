import { describe, expect, it } from 'vitest';

import { DEVICE_GLOBAL_DEVICE_HANDLE } from './device-global-node.js';
import {
  DEVICE_REF_METHOD_TARGETS,
  JOURNAL_REF_METHOD_TARGETS,
  suggestPaletteNodesForOutgoingConnection,
} from './connection-suggest.js';
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
      { sourceNode: event },
    );
    expect(suggestions.some((item) => item.nodeKind === 'stop-runtime')).toBe(true);
    expect(suggestions.some((item) => item.nodeKind === 'get-microphone')).toBe(true);
    expect(suggestions.some((item) => item.nodeKind === 'get-recorder')).toBe(true);
    expect(suggestions.some((item) => item.nodeKind === 'get-spectral-analyser')).toBe(true);
  });

  it('suggests get-microphone and stop-runtime for GetDevice device output', () => {
    const device = createPaletteBoardNode('device-global', { id: 'dg' });
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [device],
      'dg',
      DEVICE_GLOBAL_DEVICE_HANDLE,
      { sourceNode: device },
    );
    const kinds = suggestions.map((item) => item.nodeKind);
    expect(kinds).toContain('get-microphone');
    expect(kinds).toContain('get-recorder');
    expect(kinds).toContain('get-spectral-analyser');
    expect(kinds).toContain('stop-runtime');
    expect(kinds).not.toContain('device-global');
  });

  it('uses nodeKind catalog when GetDevice has stale inline pins', () => {
    const staleDevice = {
      id: 'dg-stale',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'GetDevice',
        layer: 'scenario',
        status: 'active',
        blockKind: 'custom',
        nodeKind: 'device-global',
        inputs: [{ name: 'exec-in', kind: 'exec' }],
        outputs: [{ name: 'exec-out', kind: 'exec' }],
      },
    };
    const suggestions = suggestPaletteNodesForOutgoingConnection(
      [staleDevice],
      'dg-stale',
      DEVICE_GLOBAL_DEVICE_HANDLE,
      { sourceNode: staleDevice },
    );
    expect(suggestions.map((item) => item.nodeKind)).toEqual(
      expect.arrayContaining(['get-microphone', 'stop-runtime']),
    );
  });

  it('maps DeviceRef to device method targets', () => {
    expect(DEVICE_REF_METHOD_TARGETS.map((item) => item.nodeKind)).toEqual([
      'get-microphone',
      'get-recorder',
      'get-spectral-analyser',
      'stop-runtime',
      'get-journal',
    ]);
  });

  it('maps JournalRef to get-reporter target', () => {
    expect(JOURNAL_REF_METHOD_TARGETS.map((item) => item.nodeKind)).toEqual(['get-reporter']);
  });
});

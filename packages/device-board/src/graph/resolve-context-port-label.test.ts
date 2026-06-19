import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';

import { EVENT_DEVICE_HANDLE } from './event-node.js';
import { createPaletteBoardNode, PALETTE_VALUE_HANDLE } from './palette-node.js';
import { createVariableBoardNode } from './variable-node.js';
import { resolveContextValuePortLabel } from './resolve-context-port-label.js';
import { createScenarioVariable } from '@membrana/core';

describe('resolveContextValuePortLabel', () => {
  const valuePin = { name: PALETTE_VALUE_HANDLE, kind: 'data' as const };
  const deviceVar = createScenarioVariable('v1', 'device1', 'DeviceRef');

  it('returns value when is-valid has no incoming data edge', () => {
    const node = createPaletteBoardNode('is-valid', { id: 'iv' });
    expect(resolveContextValuePortLabel('iv', valuePin, [], [node])).toBe('value');
  });

  it('returns & device when source is DeviceRef', () => {
    const event = { id: 'evt', type: 'board', position: { x: 0, y: 0 }, data: {} } as Node;
    const isValid = createPaletteBoardNode('is-valid', { id: 'iv' });
    const edges = [
      {
        id: 'e1',
        source: 'evt',
        sourceHandle: EVENT_DEVICE_HANDLE,
        target: 'iv',
        targetHandle: PALETTE_VALUE_HANDLE,
      },
    ];
    const nodes: Node[] = [
      {
        ...event,
        data: {
          layer: 'scenario',
          label: 'On connect',
          nodeKind: 'event',
          outputs: [{ name: EVENT_DEVICE_HANDLE, kind: 'data', socketType: 'DeviceRef' }],
        },
      },
      isValid,
    ];
    expect(resolveContextValuePortLabel('iv', valuePin, edges, nodes)).toBe('& device');
  });

  it('returns & microphone when source is MicrophoneRef', () => {
    const getMic = createPaletteBoardNode('get-microphone', { id: 'gm' });
    const isValid = createPaletteBoardNode('is-valid', { id: 'iv' });
    const edges = [
      {
        id: 'e1',
        source: 'gm',
        sourceHandle: 'microphone',
        target: 'iv',
        targetHandle: PALETTE_VALUE_HANDLE,
      },
    ];
    expect(resolveContextValuePortLabel('iv', valuePin, edges, [getMic, isValid])).toBe('& microphone');
  });

  it('returns value after disconnecting source', () => {
    const getNode = createVariableBoardNode('variable-get', deviceVar, { id: 'get' });
    const isValid = createPaletteBoardNode('is-valid', { id: 'iv' });
    expect(resolveContextValuePortLabel('iv', valuePin, [], [getNode, isValid])).toBe('value');
  });
});

import type { Edge, Node } from '@xyflow/react';
import { createScenarioVariable } from '@membrana/core';
import { describe, expect, it } from 'vitest';

import { createVariableBoardNode } from '../graph/variable-node.js';
import { createPaletteBoardNode } from '../graph/palette-node.js';
import { inspectNodePorts } from './inspect-node-ports.js';

describe('inspectNodePorts', () => {
  it('resolves variable-get output for print input chain', () => {
    const variable = createScenarioVariable('var-1', 'device1', 'DeviceRef');
    const getNode = createVariableBoardNode('variable-get', variable, { id: 'get-1' });
    const printNode = createPaletteBoardNode('print', { id: 'print-1' });
    const nodes: Node[] = [getNode, printNode];
    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'get-1',
        sourceHandle: 'value',
        target: 'print-1',
        targetHandle: 'value',
      },
    ];

    const result = inspectNodePorts('print-1', nodes, edges, [variable], undefined);
    expect(result).not.toBeNull();
    expect(result?.inputs).toHaveLength(2);
    const valueInput = result?.inputs.find((port) => port.handle === 'value');
    expect(valueInput?.valueText).toBe('null');
  });

  it('resolves event device output in handler context', () => {
    const eventNode: Node = {
      id: 'event-1',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'Event',
        layer: 'scenario',
        blockKind: 'select-microphone',
        nodeKind: 'event',
        system: true,
        inputs: [],
        outputs: [
          { name: 'exec-out', kind: 'exec' },
          { name: 'device', kind: 'data', socketType: 'DeviceRef' },
          { name: 'datetime', kind: 'data', socketType: 'DateTime' },
        ],
      },
    };

    const result = inspectNodePorts('event-1', [eventNode], [], [], {
      handlerBranch: 'initial',
      deviceHandle: 'mic-handle-1',
      triggeredAt: '2026-06-18T12:00:00.000Z',
    });

    expect(result).not.toBeNull();
    const deviceOut = result?.outputs.find((port) => port.handle === 'device');
    expect(deviceOut?.valueText).toContain('device(mic-handle-1');
    const datetimeOut = result?.outputs.find((port) => port.handle === 'datetime');
    expect(datetimeOut?.valueText).toBe('2026-06-18T12:00:00.000Z');
  });

  it('resolves variable value from store snapshot', () => {
    const variable = {
      ...createScenarioVariable('var-2', 'counter', 'Integer'),
      value: { kind: 'Integer' as const, value: 42 },
    };
    const getNode = createVariableBoardNode('variable-get', variable, { id: 'get-2' });

    const result = inspectNodePorts('get-2', [getNode], [], [variable], undefined);
    const valueOut = result?.outputs.find((port) => port.handle === 'value');
    expect(valueOut?.valueText).toBe('42');
  });

  it('returns null for unknown node id', () => {
    expect(inspectNodePorts('missing', [], [], [], undefined)).toBeNull();
  });
});

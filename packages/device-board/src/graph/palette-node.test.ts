import { describe, expect, it } from 'vitest';

import {
  createPaletteBoardNode,
  GET_MICROPHONE_DEVICE_HANDLE,
  GET_MICROPHONE_OUT_HANDLE,
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  PALETTE_VALUE_HANDLE,
  paletteNodePins,
  V04_PALETTE_NODE_KINDS,
} from './palette-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('palette-node (DBR5)', () => {
  it('defines v0.4 palette with Print, isValid, GetMicrophone', () => {
    expect([...V04_PALETTE_NODE_KINDS]).toEqual(['print', 'is-valid', 'get-microphone']);
  });

  it('creates print node with exec + reference value input', () => {
    const node = createPaletteBoardNode('print');
    expect(node.data.nodeKind).toBe('print');
    expect(node.data.inputs?.some((pin) => pin.name === PALETTE_VALUE_HANDLE)).toBe(true);
    expect(node.data.outputs?.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('creates is-valid node with true/false exec outputs', () => {
    const pins = paletteNodePins('is-valid');
    expect(pins.outputs.map((pin) => pin.name)).toEqual([
      IS_VALID_TRUE_HANDLE,
      IS_VALID_FALSE_HANDLE,
    ]);
  });

  it('creates get-microphone with DeviceRef in and MicrophoneRef out', () => {
    const pins = paletteNodePins('get-microphone');
    expect(pins.inputs.find((pin) => pin.name === GET_MICROPHONE_DEVICE_HANDLE)?.socketType).toBe(
      'DeviceRef',
    );
    expect(pins.outputs.find((pin) => pin.name === GET_MICROPHONE_OUT_HANDLE)?.socketType).toBe(
      'MicrophoneRef',
    );
  });

  it('round-trips get-microphone with microphoneId', () => {
    const node = createPaletteBoardNode('get-microphone', { id: 'gm-1', microphoneId: 'mic-a' });
    const sub = serializeScenarioSubgraph('gm-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.microphoneId).toBe('mic-a');
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-microphone');
  });
});

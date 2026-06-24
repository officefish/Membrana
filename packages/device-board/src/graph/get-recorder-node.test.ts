import { describe, expect, it } from 'vitest';

import {
  createGetRecorderBoardNode,
  GET_RECORDER_DEVICE_HANDLE,
  GET_RECORDER_OUT_HANDLE,
  getRecorderNodePins,
} from './get-recorder-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('get-recorder-node (DBC1)', () => {
  it('defines pure DeviceRef in and RecorderRef out by default', () => {
    const pins = getRecorderNodePins();
    expect(pins.inputs.find((pin) => pin.name === GET_RECORDER_DEVICE_HANDLE)?.socketType).toBe(
      'DeviceRef',
    );
    expect(pins.outputs.find((pin) => pin.name === GET_RECORDER_OUT_HANDLE)?.socketType).toBe(
      'RecorderRef',
    );
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(false);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(false);
  });

  it('adds exec pins when impure', () => {
    const pins = getRecorderNodePins(false);
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createGetRecorderBoardNode({ id: 'gr-1' });
    const sub = serializeScenarioSubgraph('gr-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-recorder');
    expect(restored.nodes[0]?.data.label).toBe('GetRecorder');
  });
});

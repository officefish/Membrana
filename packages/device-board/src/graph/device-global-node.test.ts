import { describe, expect, it } from 'vitest';

import {
  createDeviceGlobalBoardNode,
  DEVICE_GLOBAL_DEVICE_HANDLE,
  deviceGlobalNodePins,
} from './device-global-node.js';

describe('device-global-node', () => {
  it('exposes GetDevice data out and StopRuntime exec in', () => {
    const pins = deviceGlobalNodePins();
    expect(pins.inputs.map((pin) => pin.name)).toEqual(['exec-in']);
    expect(pins.outputs.find((pin) => pin.name === DEVICE_GLOBAL_DEVICE_HANDLE)?.socketType).toBe(
      'DeviceRef',
    );
  });

  it('creates palette node with nodeKind device-global', () => {
    const node = createDeviceGlobalBoardNode();
    expect(node.data.nodeKind).toBe('device-global');
    expect(node.data.label).toBe('Device');
  });
});

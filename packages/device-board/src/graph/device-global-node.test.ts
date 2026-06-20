import { describe, expect, it } from 'vitest';

import {
  createDeviceGlobalBoardNode,
  DEVICE_GLOBAL_DEVICE_HANDLE,
  deviceGlobalNodePins,
} from './device-global-node.js';

describe('device-global-node', () => {
  it('exposes GetDevice data out only (system, no inputs)', () => {
    const pins = deviceGlobalNodePins();
    expect(pins.inputs).toEqual([]);
    expect(pins.outputs.map((pin) => pin.name)).toEqual([DEVICE_GLOBAL_DEVICE_HANDLE]);
    expect(pins.outputs[0]?.socketType).toBe('DeviceRef');
  });

  it('creates system node GetDevice', () => {
    const node = createDeviceGlobalBoardNode();
    expect(node.data.nodeKind).toBe('device-global');
    expect(node.data.label).toBe('GetDevice');
    expect(node.data.system).toBe(true);
    expect(node.deletable).toBe(false);
  });
});

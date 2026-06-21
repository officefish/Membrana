import { describe, expect, it } from 'vitest';

import {
  createStopRuntimeBoardNode,
  STOP_RUNTIME_DEVICE_HANDLE,
  stopRuntimeNodePins,
} from './stop-runtime-node.js';

describe('stop-runtime-node', () => {
  it('has exec-in and required device DeviceRef input', () => {
    const pins = stopRuntimeNodePins();
    expect(pins.inputs.map((pin) => pin.name)).toEqual(['exec-in', STOP_RUNTIME_DEVICE_HANDLE]);
    expect(
      pins.inputs.find((pin) => pin.name === STOP_RUNTIME_DEVICE_HANDLE)?.socketType,
    ).toBe('DeviceRef');
    expect(pins.outputs).toEqual([]);
  });

  it('creates node with label StopRuntime', () => {
    const node = createStopRuntimeBoardNode();
    expect(node.data.nodeKind).toBe('stop-runtime');
    expect(node.data.label).toBe('StopRuntime');
  });
});

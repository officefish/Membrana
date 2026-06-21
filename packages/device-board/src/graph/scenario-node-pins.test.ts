import { describe, expect, it } from 'vitest';

import { DEVICE_GLOBAL_DEVICE_HANDLE } from './device-global-node.js';
import { resolveBoardNodeOutputPin } from './scenario-node-pins.js';

describe('scenario-node-pins', () => {
  it('resolves GetDevice device output from nodeKind even with stale inline pins', () => {
    const staleDevice = {
      id: 'dg',
      type: 'board',
      position: { x: 0, y: 0 },
      data: {
        label: 'GetDevice',
        layer: 'scenario',
        blockKind: 'custom',
        nodeKind: 'device-global',
        inputs: [{ name: 'exec-in', kind: 'exec' }],
        outputs: [{ name: 'exec-out', kind: 'exec' }],
      },
    };

    const pin = resolveBoardNodeOutputPin(staleDevice, DEVICE_GLOBAL_DEVICE_HANDLE);
    expect(pin?.socketType).toBe('DeviceRef');
  });
});

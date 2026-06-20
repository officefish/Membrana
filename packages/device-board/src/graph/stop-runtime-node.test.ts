import { describe, expect, it } from 'vitest';

import { createStopRuntimeBoardNode, stopRuntimeNodePins } from './stop-runtime-node.js';

describe('stop-runtime-node', () => {
  it('has exec-in only (terminal StopRuntime)', () => {
    const pins = stopRuntimeNodePins();
    expect(pins.inputs.map((pin) => pin.name)).toEqual(['exec-in']);
    expect(pins.outputs).toEqual([]);
  });

  it('creates node with label StopRuntime', () => {
    const node = createStopRuntimeBoardNode();
    expect(node.data.nodeKind).toBe('stop-runtime');
    expect(node.data.label).toBe('StopRuntime');
  });
});

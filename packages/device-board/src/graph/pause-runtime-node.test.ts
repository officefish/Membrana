import { describe, expect, it } from 'vitest';

import { createPauseRuntimeBoardNode, pauseRuntimeNodePins } from './pause-runtime-node.js';

describe('pause-runtime-node', () => {
  it('has exec-in and exec-out', () => {
    const pins = pauseRuntimeNodePins();
    expect(pins.inputs.map((pin) => pin.name)).toEqual(['exec-in']);
    expect(pins.outputs.map((pin) => pin.name)).toEqual(['exec-out']);
  });

  it('creates node with label PauseRuntime', () => {
    const node = createPauseRuntimeBoardNode();
    expect(node.data.nodeKind).toBe('pause-runtime');
    expect(node.data.label).toBe('PauseRuntime');
  });
});

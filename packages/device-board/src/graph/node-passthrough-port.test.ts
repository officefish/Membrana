import { describe, expect, it } from 'vitest';

import { findPassthroughPortLanes } from './node-passthrough-port.js';
import { paletteNodePins } from './palette-node.js';
import { formatSocketPortLabel } from './socket-port-label.js';

describe('findPassthroughPortLanes', () => {
  it('centers exec passthrough for start-streaming', () => {
    const { inputs, outputs } = paletteNodePins('start-streaming');
    const lanes = findPassthroughPortLanes(inputs, outputs, formatSocketPortLabel);
    expect(lanes).toHaveLength(1);
    expect(lanes[0]?.centerText).toBe('-> exec ->');
    expect(lanes[0]?.inputHandle).toBe('exec-in');
    expect(lanes[0]?.outputHandle).toBe('exec-out');
  });

  it('centers exec passthrough for get-audio-stream with corner labels for mic and stream', () => {
    const { inputs, outputs } = paletteNodePins('get-audio-stream');
    const lanes = findPassthroughPortLanes(inputs, outputs, formatSocketPortLabel);
    expect(lanes.map((lane) => lane.centerText)).toEqual(['-> exec ->']);
  });

  it('centers matching reference type on variable-set value in/out', () => {
    const valuePin = { name: 'value', kind: 'data' as const, socketType: 'AudioStreamRef' as const };
    const inputs = [
      { name: 'exec-in', kind: 'exec' as const },
      valuePin,
    ];
    const outputs = [
      { name: 'exec-out', kind: 'exec' as const },
      valuePin,
    ];
    const lanes = findPassthroughPortLanes(inputs, outputs, formatSocketPortLabel);
    expect(lanes.map((lane) => lane.centerText).sort()).toEqual(['-> & audio stream ->', '-> exec ->'].sort());
  });
});

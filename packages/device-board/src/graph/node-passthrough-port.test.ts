import { describe, expect, it } from 'vitest';

import { getJournalNodePins } from './get-journal-node.js';
import { findPassthroughPortLanes } from './node-passthrough-port.js';
import { paletteNodePins } from './palette-node.js';
import { formatSocketPortLabel } from './socket-port-label.js';

describe('findPassthroughPortLanes', () => {
  it('centers exec passthrough for start-streaming with stream data out', () => {
    const { inputs, outputs } = paletteNodePins('start-streaming');
    const lanes = findPassthroughPortLanes(inputs, outputs, formatSocketPortLabel);
    expect(lanes.map((lane) => lane.centerText)).toEqual(['-> exec ->']);
    expect(outputs.find((pin) => pin.name === 'stream')?.socketType).toBe('AudioStreamRef');
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

  it('skips passthrough center labels when input and output counts differ', () => {
    const { inputs, outputs } = getJournalNodePins();
    expect(inputs.length).not.toBe(outputs.length);
    const lanes = findPassthroughPortLanes(inputs, outputs, formatSocketPortLabel);
    expect(lanes).toEqual([]);
  });
});

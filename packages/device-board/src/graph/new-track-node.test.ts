import { describe, expect, it } from 'vitest';

import {
  NEW_TRACK_SAMPLES_HANDLE,
  createNewTrackBoardNode,
  newTrackNodePins,
} from './new-track-node.js';

describe('new-track-node (DBC4)', () => {
  it('defines exec-in + samples in and no outputs (terminal)', () => {
    const pins = newTrackNodePins();
    expect(pins.inputs.some((pin) => pin.name === 'exec-in' && pin.kind === 'exec')).toBe(true);
    expect(
      pins.inputs.find((pin) => pin.name === NEW_TRACK_SAMPLES_HANDLE)?.socketType,
    ).toBe('AudioSampleRefList');
    expect(pins.outputs).toEqual([]);
  });

  it('creates board node with new-track kind', () => {
    const node = createNewTrackBoardNode({ id: 'nt-1' });
    expect(node.data.nodeKind).toBe('new-track');
    expect(node.data.label).toBe('NewTrack');
  });
});

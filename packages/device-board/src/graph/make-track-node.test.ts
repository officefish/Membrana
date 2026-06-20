import { describe, expect, it } from 'vitest';

import {
  createMakeTrackBoardNode,
  isMakeTrackNodeKind,
  makeTrackNodePins,
  MAKE_TRACK_RECORDER_HANDLE,
  MAKE_TRACK_SAMPLES_HANDLE,
} from './make-track-node.js';

describe('make-track-node', () => {
  it('exposes recorder + samples inputs and track output', () => {
    const pins = makeTrackNodePins();
    expect(pins.inputs.map((pin) => pin.name)).toEqual([
      'exec-in',
      MAKE_TRACK_RECORDER_HANDLE,
      MAKE_TRACK_SAMPLES_HANDLE,
    ]);
    expect(pins.outputs.map((pin) => pin.name)).toEqual(['exec-out', 'track']);
  });

  it('creates board node with make-track kind', () => {
    const node = createMakeTrackBoardNode({ id: 'mt-1' });
    expect(node.data.nodeKind).toBe('make-track');
    expect(node.data.label).toBe('MakeTrack');
  });

  it('isMakeTrackNodeKind accepts legacy new-track', () => {
    expect(isMakeTrackNodeKind('make-track')).toBe(true);
    expect(isMakeTrackNodeKind('new-track')).toBe(true);
    expect(isMakeTrackNodeKind('collect-samples')).toBe(false);
  });
});

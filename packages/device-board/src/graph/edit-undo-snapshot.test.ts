import type { NodeChange } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { createDefaultMvpMicrophoneHydratedState } from './default-usercase-mvp-microphone.js';
import { cloneHydratedBoardState, hasNodeRemovalChanges } from './edit-undo-snapshot.js';

describe('edit-undo-snapshot', () => {
  it('cloneHydratedBoardState produces independent copy', () => {
    const state = createDefaultMvpMicrophoneHydratedState();
    const clone = cloneHydratedBoardState(state);
    clone.scenarioMainNodes[0]!.position.x = -999;
    expect(state.scenarioMainNodes[0]!.position.x).not.toBe(-999);
  });

  it('hasNodeRemovalChanges detects remove changes', () => {
    const changes: NodeChange[] = [
      { type: 'position', id: 'a', position: { x: 0, y: 0 } },
      { type: 'remove', id: 'b' },
    ];
    expect(hasNodeRemovalChanges(changes)).toBe(true);
    expect(hasNodeRemovalChanges([{ type: 'select', id: 'a', selected: true }])).toBe(false);
  });
});

import { describe, expect, it, beforeEach } from 'vitest';

import {
  FLUX_HISTORY_MAX,
  fftIndicesVizPluginState,
} from './fftIndicesVizPluginState';

describe('fftIndicesVizPluginState', () => {
  beforeEach(() => {
    fftIndicesVizPluginState.reset();
  });

  it('caps flux history at FLUX_HISTORY_MAX', () => {
    fftIndicesVizPluginState.setStreamActive(true);
    for (let i = 0; i < FLUX_HISTORY_MAX + 50; i++) {
      fftIndicesVizPluginState.pushFrame(1000 + i, 0.5, 0.1);
    }
    const snap = fftIndicesVizPluginState.getSnapshot();
    expect(snap.fluxHistory.length).toBe(FLUX_HISTORY_MAX);
  });

  it('clears history when stream stops', () => {
    fftIndicesVizPluginState.setStreamActive(true);
    fftIndicesVizPluginState.pushFrame(500, 0.3, 0.05);
    fftIndicesVizPluginState.setStreamActive(false);
    expect(fftIndicesVizPluginState.getSnapshot().fluxHistory).toEqual([]);
  });
});

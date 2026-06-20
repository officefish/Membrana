import { describe, expect, it } from 'vitest';

import {
  NEW_FFT_TRENDS_FRAMES_HANDLE,
  createNewFftTrendsAnalysisBoardNode,
  newFftTrendsAnalysisNodePins,
} from './new-fft-trends-analysis-node.js';

describe('new-fft-trends-analysis-node (DBC4)', () => {
  it('defines exec-in + frames in and no outputs (terminal)', () => {
    const pins = newFftTrendsAnalysisNodePins();
    expect(pins.inputs.some((pin) => pin.name === 'exec-in' && pin.kind === 'exec')).toBe(true);
    expect(
      pins.inputs.find((pin) => pin.name === NEW_FFT_TRENDS_FRAMES_HANDLE)?.socketType,
    ).toBe('FftFrameRefList');
    expect(pins.outputs).toEqual([]);
  });

  it('creates board node with new-fft-trends-analysis kind', () => {
    const node = createNewFftTrendsAnalysisBoardNode({ id: 'nft-1' });
    expect(node.data.nodeKind).toBe('new-fft-trends-analysis');
    expect(node.data.label).toBe('NewFftTrendsAnalysis (legacy)');
  });
});

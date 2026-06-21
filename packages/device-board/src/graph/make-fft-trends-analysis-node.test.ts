import { describe, expect, it } from 'vitest';

import {
  createMakeFftTrendsAnalysisBoardNode,
  isMakeFftTrendsAnalysisNodeKind,
  makeFftTrendsAnalysisNodePins,
  MAKE_FFT_TRENDS_ANALYSER_HANDLE,
  MAKE_FFT_TRENDS_FRAMES_HANDLE,
  MAKE_FFT_TRENDS_POLICY_HANDLE,
} from './make-fft-trends-analysis-node.js';

describe('make-fft-trends-analysis-node', () => {
  it('exposes analyser + frames inputs and analysis output', () => {
    const pins = makeFftTrendsAnalysisNodePins();
    expect(pins.inputs.map((pin) => pin.name)).toEqual([
      'exec-in',
      MAKE_FFT_TRENDS_ANALYSER_HANDLE,
      MAKE_FFT_TRENDS_FRAMES_HANDLE,
      MAKE_FFT_TRENDS_POLICY_HANDLE,
    ]);
    expect(pins.outputs.map((pin) => pin.name)).toEqual(['exec-out', 'analysis']);
  });

  it('creates board node with make-fft-trends-analysis kind', () => {
    const node = createMakeFftTrendsAnalysisBoardNode({ id: 'mft-1' });
    expect(node.data.nodeKind).toBe('make-fft-trends-analysis');
    expect(node.data.label).toBe('MakeFftTrendsAnalysis');
  });

  it('isMakeFftTrendsAnalysisNodeKind accepts legacy kind', () => {
    expect(isMakeFftTrendsAnalysisNodeKind('make-fft-trends-analysis')).toBe(true);
    expect(isMakeFftTrendsAnalysisNodeKind('new-fft-trends-analysis')).toBe(true);
  });
});

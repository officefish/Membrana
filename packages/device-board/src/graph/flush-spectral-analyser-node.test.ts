import { describe, expect, it } from 'vitest';

import {
  createFlushSpectralAnalyserBoardNode,
  flushSpectralAnalyserNodePins,
  FLUSH_SPECTRAL_ANALYSER_NODE_KIND,
} from './flush-spectral-analyser-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('flush-spectral-analyser-node (R1)', () => {
  it('defines exec + analyser in and exec + frames out', () => {
    const pins = flushSpectralAnalyserNodePins();
    expect(
      pins.inputs.some((p) => p.name === 'analyser' && p.socketType === 'SpectralAnalyserRef'),
    ).toBe(true);
    expect(pins.outputs.some((p) => p.name === 'frames' && p.socketType === 'FftFrameRefList')).toBe(
      true,
    );
  });

  it('factory sets nodeKind', () => {
    const node = createFlushSpectralAnalyserBoardNode({ id: 'flush-1' });
    const sub = serializeScenarioSubgraph('flush-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe(FLUSH_SPECTRAL_ANALYSER_NODE_KIND);
  });
});

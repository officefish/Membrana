import { describe, expect, it } from 'vitest';

import {
  createGetReporterBoardNode,
  GET_REPORTER_JOURNAL_HANDLE,
  GET_REPORTER_OUT_HANDLE,
  getReporterNodePins,
} from './get-reporter-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('get-reporter-node (DBJ2)', () => {
  it('defines exec + JournalRef in and exec + ReporterRef out', () => {
    const pins = getReporterNodePins();
    expect(pins.inputs.find((pin) => pin.name === GET_REPORTER_JOURNAL_HANDLE)?.socketType).toBe(
      'JournalRef',
    );
    expect(pins.outputs.find((pin) => pin.name === GET_REPORTER_OUT_HANDLE)?.socketType).toBe(
      'ReporterRef',
    );
    expect(pins.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(pins.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createGetReporterBoardNode({ id: 'gr-1' });
    const sub = serializeScenarioSubgraph('gr-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-reporter');
    expect(restored.nodes[0]?.data.label).toBe('GetReporter');
  });
});

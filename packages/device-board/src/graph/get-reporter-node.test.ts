import { describe, expect, it } from 'vitest';

import {
  createGetReporterBoardNode,
  GET_REPORTER_JOURNAL_HANDLE,
  GET_REPORTER_OUT_HANDLE,
  getReporterNodePins,
} from './get-reporter-node.js';
import { deserializeScenarioSubgraph, serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

describe('get-reporter-node (DBJ2)', () => {
  it('defines exec + JournalRef in and exec + ReporterRef out when impure', () => {
    const impure = getReporterNodePins(false);
    expect(impure.inputs.find((pin) => pin.name === GET_REPORTER_JOURNAL_HANDLE)?.socketType).toBe(
      'JournalRef',
    );
    expect(impure.outputs.find((pin) => pin.name === GET_REPORTER_OUT_HANDLE)?.socketType).toBe(
      'ReporterRef',
    );
    expect(impure.inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(impure.outputs.some((pin) => pin.name === 'exec-out')).toBe(true);
  });

  it('pure default has data pins only', () => {
    const pure = getReporterNodePins(true);
    expect(pure.inputs.some((pin) => pin.name === 'exec-in')).toBe(false);
    expect(pure.outputs.some((pin) => pin.name === 'exec-out')).toBe(false);
  });

  it('round-trips through scenario subgraph serialization', () => {
    const node = createGetReporterBoardNode({ id: 'gr-1' });
    const sub = serializeScenarioSubgraph('gr-1', [node], []);
    const restored = deserializeScenarioSubgraph(sub);
    expect(restored.nodes[0]?.data.nodeKind).toBe('get-reporter');
    expect(restored.nodes[0]?.data.label).toBe('GetReporter');
  });
});
